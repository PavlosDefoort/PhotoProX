# ADR 0006: Bounded Danbooru wiki references and preview cache

- Status: Accepted
- Date: 2026-08-27

## Context

The offline catalog can identify and rank tags but does not carry Danbooru wiki prose or example images. Those resources change independently and would materially enlarge a bundled snapshot. Fetching them directly in the renderer would require weakening CSP and expose remote URLs and unrestricted network access to renderer code.

## Decision

On tag hover, request a reference through narrow sender-checked IPC. Electron main queries the public Danbooru wiki API for exact-title DText and the posts API for one preview. It sends no login, API key, cookies, prompt, model information, or other tag context. DText is reduced to bounded plain text and React/CodeMirror renders it only as text.

Preview lookup defaults to `rating:general`. A persisted **Allow NSFW previews** checkbox explicitly permits sensitive, questionable, or explicit results; the returned rating is displayed in the card. Wiki text is not gated by this preview preference. Requests are restricted to canonical tag syntax so renderer input cannot become an arbitrary Danbooru metatag query.

Electron downloads at most 2 MB from an HTTPS `cdn.donmai.us` preview URL, accepts only JPEG, PNG, WebP, or GIF, names it by a deterministic hash, and stores it under `userData/tag-reference-cache/previews`. The renderer receives only a root-confined `zynalo-asset://tag-preview/...` URI. CSP continues to use `connect-src 'none'`, so the renderer itself cannot contact Danbooru.

## Consequences

- Hover cards can show current wiki descriptions, alternate names, and an example thumbnail.
- This feature requires internet access and discloses the hovered tag plus the application user agent to Danbooru/CDN.
- General-only preview behavior is the default; NSFW images require explicit opt-in and are visibly rated.
- Network or missing-content failures degrade to a concise unavailable message without affecting prompt editing or generation.
- Cached thumbnails occupy application-managed storage; no gallery or history is created.
