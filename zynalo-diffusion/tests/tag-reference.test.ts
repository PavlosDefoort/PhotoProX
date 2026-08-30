import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateTagReferenceRequest } from '@zynalo/diffusion-contracts';
import { TagReferenceService } from '../apps/diffusion/src/main/tag-reference';

const temporaryRoots: string[] = [];

afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('Danbooru wiki and preview reference service', () => {
  it('sanitizes wiki DText and defaults to a general-rated application-local preview', async () => {
    const requested: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input)); requested.push(url.href);
      if (url.pathname === '/wiki_pages.json') return Response.json([{ title: 'dutch_angle', body: 'A tilted camera angle with [[dynamic_perspective]].\n\nSecond paragraph.\n\nh4. Examples\n\n* !post #1', other_names: ['ダッチアングル'], is_deleted: false }]);
      if (url.pathname === '/posts.json') return Response.json([{ id: 123, rating: 'g', preview_file_url: 'https://cdn.donmai.us/180x180/aa/bb/example.jpg', image_width: 1280, image_height: 960 }]);
      if (url.hostname === 'cdn.donmai.us') return new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), { headers: { 'Content-Type': 'image/jpeg' } });
      throw new Error(`Unexpected request ${url}`);
    }));
    const root = await mkdtemp(path.join(os.tmpdir(), 'zynalo-tag-reference-')); temporaryRoots.push(root);
    const service = new TagReferenceService(root); await service.initialize();
    const result = await service.get('dutch angle', false);
    expect(result).toMatchObject({ tag: 'dutch_angle', description: 'A tilted camera angle with dynamic_perspective.\n\nSecond paragraph.', otherNames: ['ダッチアングル'], preview: { postId: 123, rating: 'general', width: 1280, height: 960 } });
    expect(result.preview?.uri).toMatch(/^zynalo-asset:\/\/tag-preview\/[a-f0-9]{32}\.jpg$/);
    expect(requested.find((url) => url.includes('/posts.json'))).toContain('rating%3Ageneral');
    const filename = new URL(result.preview!.uri).pathname.slice(1);
    expect(await readFile(path.join(root, filename))).toEqual(Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  });

  it('allows and labels an explicit preview only after opt-in', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname === '/wiki_pages.json') return Response.json([]);
      if (url.pathname === '/posts.json') {
        expect(url.searchParams.get('tags')).toBe('example_tag');
        return Response.json([{ id: 456, rating: 'e', preview_file_url: 'https://cdn.donmai.us/180x180/aa/bb/explicit.webp', image_width: 800, image_height: 1200 }]);
      }
      return new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/webp' } });
    }));
    const root = await mkdtemp(path.join(os.tmpdir(), 'zynalo-tag-reference-')); temporaryRoots.push(root);
    const service = new TagReferenceService(root); await service.initialize();
    await expect(service.get('example_tag', true)).resolves.toMatchObject({ preview: { rating: 'explicit', postId: 456 } });
  });

  it('strictly validates the new IPC request and NSFW preference', () => {
    expect(validateTagReferenceRequest({ tag: 'dutch_angle' })).toEqual({ tag: 'dutch_angle' });
    expect(validateTagReferenceRequest({ tag: 'dutch_angle', allowNsfw: true })).toEqual({ tag: 'dutch_angle', allowNsfw: true });
    expect(validateTagReferenceRequest({ tag: 'x', allowNsfw: 'yes' })).toBeUndefined();
    expect(validateTagReferenceRequest({ tag: 'x', extra: true })).toBeUndefined();
    expect(validateTagReferenceRequest({ tag: '   ' })).toBeUndefined();
  });
});
