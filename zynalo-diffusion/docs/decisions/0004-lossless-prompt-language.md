# ADR 0004: Lossless, platform-neutral prompt language service

- Status: Accepted
- Date: 2026-08-27

## Context

Tags mode needs token ranges, completion, diagnostics, explanations, and repairs for Booru-style prompts. Prompts may also contain custom triggers, model-specific tokens, and syntax the first analyzer does not understand. Reconstructing source from an abstract syntax tree would risk changing whitespace, escaping, parentheses, weights, or unknown content before generation. Putting rules directly in React would make those semantics difficult to test and unavailable to later authoring modes.

## Decision

Keep the exact source string as the prompt document's authority. Parsing produces bounded token and syntax views with source ranges but never regenerates the prompt. Unknown tags and unsupported syntax remain first-class source spans. Generation receives the exact positive and negative source strings.

Implement parsing, catalog validation/indexing, completion, linting, explanations, quick-fix construction, and text-edit application in the platform-neutral `@zynalo/prompt-language` package. It depends on no React, Electron, filesystem, Python, Diffusers, or DOM API. React consumes it through the renderer's `PromptWorkspaceService`; CodeMirror 6 supplies durable text editing, selections, completion interaction, diagnostic marks, and undo history.

Diagnostics have three meanings. Errors are malformed supported syntax or hard limits that the UI cannot safely represent and may block submission. Warnings are valid but potentially unintended prompts and never block submission. Guidance describes optional unspecified creative dimensions and can be reduced or disabled. No diagnostic silently changes source.

All quick fixes are explicit source-range edits. Each edit includes the expected text and source length from which it was calculated. Application rejects stale or overlapping edits. Conflicts offer separate removal choices, associated series tags and profile recommendations require explicit insertion, and no global repair action exists.

Use a versioned, validated, hand-curated 343-record local development catalog for the first WAI profile. It is intentionally incomplete, contains original concise descriptions, runs offline, and is bounded as untrusted input. A `PromptCatalog` boundary allows a separate indexed main-side autocomplete source to preserve the same language-service and UI semantics; ADR 0005 adopts that extension without moving filesystem access into this package.

Assign the WAI profile through an allow-listed validated checkpoint SHA-256 rather than a filename inference. Models without an assignment use the generic catalog with an explicit compatibility caveat. Profiles may recommend tags but never inject them.

## Consequences

- Parse/render cycles are byte-for-byte stable until a user edits or accepts a fix.
- Custom triggers and future syntax survive current analysis and generation.
- Completion and diagnostics can be unit-tested without Electron or the DOM.
- Build-mode compilation and Describe-mode translation validation can reuse the same document, catalog, lint, and edit contracts later without inheriting renderer dependencies.
- The first fixture gives useful offline behavior but cannot establish that an unknown tag is invalid or represent the full vocabulary of any training dataset.
- Full A1111 syntax compatibility is not claimed; unsupported syntax is identified and preserved.
