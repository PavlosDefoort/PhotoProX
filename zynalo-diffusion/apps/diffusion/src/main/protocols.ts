import { net, protocol } from 'electron';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const APP_SCHEME = 'zynalo';
const ASSET_SCHEME = 'zynalo-asset';

export function registerPrivilegedSchemes(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true },
    },
    {
      scheme: ASSET_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true },
    },
  ]);
}

export function registerProtocolHandlers(rendererRoot: string, generatedAssetRoot: string, tagPreviewRoot?: string): void {
  protocol.handle(APP_SCHEME, async (request) => {
    const url = new URL(request.url);
    if (url.hostname !== 'app') return new Response('Not found', { status: 404 });

    const relativePath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname).slice(1);
    const resolved = path.resolve(rendererRoot, relativePath);
    const relative = path.relative(rendererRoot, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !existsSync(resolved)) {
      return new Response('Not found', { status: 404 });
    }
    return net.fetch(pathToFileURL(resolved).toString());
  });

  protocol.handle(ASSET_SCHEME, (request) => {
    const url = new URL(request.url);
    if (url.hostname === 'tag-preview' && tagPreviewRoot && /^\/[a-f0-9]{32}\.(?:jpg|png|webp|gif)$/.test(url.pathname)) {
      const resolved = path.resolve(tagPreviewRoot, url.pathname.slice(1));
      const relative = path.relative(tagPreviewRoot, resolved);
      if (relative.startsWith('..') || path.isAbsolute(relative) || !existsSync(resolved)) return new Response('Not found', { status: 404 });
      return net.fetch(pathToFileURL(resolved).toString());
    }
    if (url.hostname === 'generated' && /^\/[a-zA-Z0-9_-]{1,128}$/.test(url.pathname)) {
      const resolved = path.resolve(generatedAssetRoot, `${url.pathname.slice(1)}.png`);
      const relative = path.relative(generatedAssetRoot, resolved);
      if (relative.startsWith('..') || path.isAbsolute(relative) || !existsSync(resolved)) {
        return new Response('Not found', { status: 404 });
      }
      return net.fetch(pathToFileURL(resolved).toString());
    }
    if (url.hostname !== 'mock' || !/^\/[a-f0-9]{8}$/.test(url.pathname)) {
      return new Response('Not found', { status: 404 });
    }
    const width = boundedNumber(url.searchParams.get('width'), 512, 64, 2_048);
    const height = boundedNumber(url.searchParams.get('height'), 512, 64, 2_048);
    const seed = boundedNumber(url.searchParams.get('seed'), 0, 0, 4_294_967_295);
    const signature = url.pathname.slice(1);
    const svg = placeholderSvg(width, height, seed, signature);
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  });
}

function boundedNumber(value: string | null, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, Math.round(parsed))) : fallback;
}

function placeholderSvg(width: number, height: number, seed: number, signature: string): string {
  const hue = seed % 360;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue} 70% 28%)" />
      <stop offset="1" stop-color="hsl(${(hue + 80) % 360} 75% 12%)" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)" />
  <circle cx="50%" cy="42%" r="22%" fill="none" stroke="rgba(255,255,255,.32)" stroke-width="4" />
  <text x="50%" y="76%" text-anchor="middle" fill="white" font-family="system-ui, sans-serif" font-size="${Math.max(16, Math.round(width / 28))}">Mock generation</text>
  <text x="50%" y="82%" text-anchor="middle" fill="rgba(255,255,255,.7)" font-family="monospace" font-size="${Math.max(11, Math.round(width / 48))}">seed ${seed} · ${signature}</text>
</svg>`;
}
