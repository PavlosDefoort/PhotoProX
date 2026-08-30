import { createHash } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.join(projectRoot, 'resources', 'tag-catalog');
const temporaryRoot = path.join(outputRoot, '.update');
const baseUrl = 'https://danbooru.donmai.us';
const pageLimit = 1_000;
const maximumPages = 1_000;
const intervalArgument = process.argv.find((argument) => argument.startsWith('--request-interval='));
const requestIntervalMs = intervalArgument ? Number(intervalArgument.split('=')[1]) : 350;
if (!Number.isFinite(requestIntervalMs) || requestIntervalMs < 200 || requestIntervalMs > 10_000) throw new TypeError('Request interval must be from 200 to 10000 milliseconds.');

const categories = [
  { id: 0, name: 'general' },
  { id: 1, name: 'artist' },
  { id: 3, name: 'copyright' },
  { id: 4, name: 'character' },
  { id: 5, name: 'meta' },
];

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function getJson(pathname, allowEnd = false) {
  let lastError;
  for (let attempt = 0; attempt < 7; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}${pathname}`, { headers: { Accept: 'application/json', 'User-Agent': 'Zynalo-Diffusion-catalog-builder/0.1' } });
      if (allowEnd && (response.status === 410 || response.status === 422)) return [];
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      const value = await response.json();
      if (!Array.isArray(value)) throw new TypeError('Expected a JSON array.');
      return value;
    } catch (error) {
      lastError = error;
      if (attempt === 6) break;
      await delay(Math.min(30_000, 1_000 * (2 ** attempt)));
    }
  }
  throw new Error(`Danbooru request failed: ${pathname}`, { cause: lastError });
}

async function fetchCategory(category) {
  const records = [];
  for (let page = 1; page <= maximumPages; page += 1) {
    const query = new URLSearchParams({
      limit: String(pageLimit),
      page: String(page),
      only: 'name,category,post_count',
      'search[category]': String(category.id),
      'search[order]': 'count',
      'search[hide_empty]': 'no',
    });
    const batch = await getJson(`/tags.json?${query}`, true);
    for (const value of batch) {
      if (typeof value !== 'object' || value === null) throw new TypeError(`Invalid ${category.name} tag response.`);
      const item = value;
      if (typeof item.name !== 'string' || item.category !== category.id || !Number.isSafeInteger(item.post_count) || item.post_count < 0) throw new TypeError(`Invalid ${category.name} tag fields.`);
      records.push({ name: item.name, category: item.category, postCount: item.post_count });
    }
    if (page === 1 || page % 25 === 0 || batch.length < pageLimit) process.stderr.write(`${category.name}: ${records.length.toLocaleString('en-US')} tags (${page} pages)\n`);
    if (batch.length < pageLimit) return records;
    if (page === maximumPages) throw new RangeError(`${category.name} reached the ${maximumPages.toLocaleString('en-US')}-page safety ceiling; refusing to publish an incomplete snapshot.`);
    await delay(requestIntervalMs);
  }
  return records;
}

async function fetchAliases() {
  const aliases = new Map();
  let count = 0;
  for (let page = 1; page <= maximumPages; page += 1) {
    const query = new URLSearchParams({ limit: String(pageLimit), page: String(page), only: 'antecedent_name,consequent_name', 'search[status]': 'active' });
    const batch = await getJson(`/tag_aliases.json?${query}`, true);
    for (const value of batch) {
      if (typeof value !== 'object' || value === null || typeof value.antecedent_name !== 'string' || typeof value.consequent_name !== 'string') throw new TypeError('Invalid tag alias response.');
      const current = aliases.get(value.consequent_name) ?? [];
      current.push(value.antecedent_name);
      aliases.set(value.consequent_name, current);
      count += 1;
    }
    if (page === 1 || page % 25 === 0 || batch.length < pageLimit) process.stderr.write(`aliases: ${count.toLocaleString('en-US')} (${page} pages)\n`);
    if (batch.length < pageLimit) return aliases;
    if (page === maximumPages) throw new RangeError('Aliases reached the pagination safety ceiling; refusing to publish an incomplete snapshot.');
    await delay(requestIntervalMs);
  }
  return aliases;
}

function csvField(value) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

await mkdir(temporaryRoot, { recursive: true });
try {
  const aliases = await fetchAliases();
  const records = [];
  const byCategory = {};
  const categoryDatasets = await Promise.all(categories.map(async (category) => ({ category, records: await fetchCategory(category) })));
  for (const dataset of categoryDatasets) {
    byCategory[dataset.category.name] = dataset.records.length;
    for (const record of dataset.records) records.push(record);
  }
  records.sort((left, right) => right.postCount - left.postCount || left.name.localeCompare(right.name));
  const csv = `${records.map((record) => [record.name, record.category, record.postCount, (aliases.get(record.name) ?? []).sort().join(',')].map(csvField).join(',')).join('\n')}\n`;
  const metadata = {
    schema: 'zynalo.danbooru-autocomplete/v1',
    generated_at: new Date().toISOString(),
    tag_count_total: records.length,
    active_alias_count: [...aliases.values()].reduce((total, values) => total + values.length, 0),
    by_category: byCategory,
    source: `${baseUrl}/tags.json and /tag_aliases.json`,
    include_zero_post_tags: true,
    sha256: createHash('sha256').update(csv).digest('hex'),
  };
  await writeFile(path.join(temporaryRoot, 'danbooru.csv'), csv, 'utf8');
  await writeFile(path.join(temporaryRoot, 'meta.json'), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  await rename(path.join(temporaryRoot, 'danbooru.csv'), path.join(outputRoot, 'danbooru.csv'));
  await rename(path.join(temporaryRoot, 'meta.json'), path.join(outputRoot, 'meta.json'));
  process.stderr.write(`complete: ${records.length.toLocaleString('en-US')} tags and ${metadata.active_alias_count.toLocaleString('en-US')} aliases\n`);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
