import { createHash } from 'node:crypto';
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { TagReference } from '@zynalo/diffusion-contracts';
import { normalizeAutocompleteTag } from './tag-catalog';

const API_ROOT = 'https://danbooru.donmai.us';
const MAX_JSON_BYTES = 256_000;
const MAX_IMAGE_BYTES = 2_000_000;
const USER_AGENT = 'Zynalo-Diffusion-tag-reference/0.1';

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as JsonRecord : undefined;
}

function wikiSummary(body: string): string | undefined {
  const paragraphs: string[] = [];
  for (const paragraph of body.replaceAll('\r', '').split(/\n\s*\n/)) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;
    if (/^h[1-6]\.|^#{1,6}\s/.test(trimmed)) break;
    const cleaned = trimmed
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      .replace(/"([^"]+)":\[[^\]]+\]/g, '$1')
      .replace(/\[(?:spoiler|nodtext|quote)\]|\[\/(?:spoiler|nodtext|quote)\]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned && !cleaned.startsWith('* !post')) paragraphs.push(cleaned);
    if (paragraphs.join('\n\n').length >= 800 || paragraphs.length >= 3) break;
  }
  const summary = paragraphs.join('\n\n').slice(0, 1_200).trim();
  return summary || undefined;
}

async function jsonArray(url: URL): Promise<unknown[]> {
  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`Danbooru returned HTTP ${response.status}.`);
  const length = Number(response.headers.get('content-length') ?? 0);
  if (length > MAX_JSON_BYTES) throw new RangeError('Danbooru response exceeded the JSON size limit.');
  const text = await response.text();
  if (Buffer.byteLength(text, 'utf8') > MAX_JSON_BYTES) throw new RangeError('Danbooru response exceeded the JSON size limit.');
  const value: unknown = JSON.parse(text);
  if (!Array.isArray(value)) throw new TypeError('Danbooru response must be an array.');
  return value;
}

export class TagReferenceService {
  readonly #previewRoot: string;
  readonly #requests = new Map<string, Promise<TagReference>>();

  constructor(previewRoot: string) { this.#previewRoot = previewRoot; }

  async initialize(): Promise<void> { await mkdir(this.#previewRoot, { recursive: true }); }

  get(tagValue: string, allowNsfw: boolean): Promise<TagReference> {
    const tag = normalizeAutocompleteTag(tagValue);
    if (!/^[a-z0-9][a-z0-9_()'+.!-]*$/.test(tag)) return Promise.resolve({ tag, otherNames: [], unavailableReason: 'Online reference lookup is unavailable for this tag syntax.' });
    const cacheKey = `${tag}:${allowNsfw ? 'all' : 'general'}`;
    const current = this.#requests.get(cacheKey);
    if (current) return current;
    if (this.#requests.size >= 512) this.#requests.delete(this.#requests.keys().next().value as string);
    const request = this.#load(tag, allowNsfw).catch(() => ({ tag, otherNames: [], unavailableReason: 'Danbooru reference is temporarily unavailable.' }));
    this.#requests.set(cacheKey, request);
    return request;
  }

  async #load(tag: string, allowNsfw: boolean): Promise<TagReference> {
    const wikiUrl = new URL('/wiki_pages.json', API_ROOT);
    wikiUrl.searchParams.set('search[title]', tag);
    wikiUrl.searchParams.set('limit', '1');
    wikiUrl.searchParams.set('only', 'id,title,body,other_names,is_deleted');
    const postUrl = new URL('/posts.json', API_ROOT);
    postUrl.searchParams.set('tags', allowNsfw ? tag : `${tag} rating:general`);
    postUrl.searchParams.set('limit', '1');
    postUrl.searchParams.set('only', 'id,rating,preview_file_url,image_width,image_height');

    const [wikiResult, postResult] = await Promise.allSettled([jsonArray(wikiUrl), jsonArray(postUrl)]);
    const wiki = wikiResult.status === 'fulfilled' ? asRecord(wikiResult.value[0]) : undefined;
    const description = wiki && wiki.is_deleted !== true && typeof wiki.body === 'string' ? wikiSummary(wiki.body) : undefined;
    const otherNames = wiki && Array.isArray(wiki.other_names) ? wiki.other_names.filter((value): value is string => typeof value === 'string' && value.length > 0 && value.length <= 256).slice(0, 20) : [];
    const post = postResult.status === 'fulfilled' ? asRecord(postResult.value[0]) : undefined;
    const preview = await this.#cachePreview(post, allowNsfw);
    if (!description && !preview) {
      return { tag, otherNames, unavailableReason: wikiResult.status === 'rejected' || postResult.status === 'rejected' ? 'Danbooru reference is temporarily unavailable.' : 'No wiki description or general-rated preview is available for this tag.' };
    }
    return { tag, ...(description ? { description } : {}), otherNames, ...(preview ? { preview } : {}) };
  }

  async #cachePreview(post: JsonRecord | undefined, allowNsfw: boolean): Promise<TagReference['preview'] | undefined> {
    const ratings = { g: 'general', s: 'sensitive', q: 'questionable', e: 'explicit' } as const;
    const rating = post && typeof post.rating === 'string' ? ratings[post.rating as keyof typeof ratings] : undefined;
    if (!post || !rating || (!allowNsfw && rating !== 'general') || !Number.isSafeInteger(post.id) || typeof post.preview_file_url !== 'string' || !Number.isSafeInteger(post.image_width) || !Number.isSafeInteger(post.image_height)) return undefined;
    const remote = new URL(post.preview_file_url);
    if (remote.protocol !== 'https:' || remote.hostname !== 'cdn.donmai.us') return undefined;
    const response = await fetch(remote, { headers: { Accept: 'image/avif,image/webp,image/jpeg,image/png,image/gif', 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(12_000) });
    if (!response.ok) return undefined;
    const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim();
    const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : mimeType === 'image/gif' ? 'gif' : undefined;
    const length = Number(response.headers.get('content-length') ?? 0);
    if (!extension || length > MAX_IMAGE_BYTES) return undefined;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return undefined;
    const id = createHash('sha256').update(String(post.id)).update(remote.href).digest('hex').slice(0, 32);
    const filename = `${id}.${extension}`;
    const destination = path.join(this.#previewRoot, filename);
    try { await access(destination); }
    catch { await writeFile(destination, bytes, { flag: 'wx' }).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'EEXIST') throw error; }); }
    return { uri: `zynalo-asset://tag-preview/${filename}`, postId: post.id as number, width: post.image_width as number, height: post.image_height as number, rating };
  }
}
