# ADR 0005: Versioned offline Danbooru autocomplete index

- Status: Accepted
- Date: 2026-08-27

## Context

The curated 343-record WAI catalog supplies useful descriptions, conflicts, implications, and misspelling guidance, but it cannot cover the much larger Danbooru vocabulary. Loading hundreds of thousands of records into renderer JavaScript would increase startup cost, weaken the filesystem boundary, and turn the language package's deliberately bounded catalog fixture into an unmaintainable generated file.

## Decision

Keep the curated catalog as the semantic overlay. When the optional local resource is available, package a separate, versioned CSV snapshot outside ASAR and load it only in Electron main. Build canonical-name and active-alias lexical indexes once, use binary prefix ranges, rank by match kind and post count, and return no more than 50 strictly validated records over narrow sender-checked IPC. CodeMirror requests at most 20 and preserves the exact active-token edit range.

The renderer never receives a catalog path or the complete database. Records returned by autocomplete are safely cached into the language service so accepted snapshot tags are recognized, while an existing curated record always retains its richer semantics.

The optional 2026-08-24 snapshot contains 186,699 ranked records from `PYU224/tagdb-updater`, sourced from Danbooru's public API. It includes general, artist, copyright, character, and meta categories plus active aliases, including adult terminology. It is broad but intentionally capped by the upstream producer and is not described as every live Danbooru row. It is excluded from the public source commit; its upstream MIT notice is kept beside the data when the snapshot is used.

Autocomplete operation performs no network access. `npm run catalog:update` is an explicit developer-only builder that walks Danbooru's public tag and active-alias APIs, includes zero-post records, verifies response shapes and pagination ceilings, writes count/checksum metadata, and atomically replaces the resource only after a complete run. ADR 0006 separately governs opt-in hover references.

## Consequences

- Autocomplete covers 186,699 offline snapshot records without expanding the renderer bundle or the curated catalog validation limit.
- Snapshot age, record count, provenance, and offline status are visible in the prompt workspace.
- Search remains bounded at the IPC and UI layers, though initial main-process index construction uses memory proportional to the snapshot.
- The vocabulary is a dated snapshot, not a live service; newly created Danbooru tags require an explicit developer update and application rebuild.
- Autocomplete coverage and rich semantic guidance remain intentionally separate: most snapshot-only tags have category/count information, not curated prose or conflict rules.
