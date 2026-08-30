# Zynalo Diffusion

Zynalo Diffusion is a standalone Electron application for offline local SDXL generation. It uses a persistent, supervised Python/Diffusers process, an application-managed local model registry, and a deterministic mock fallback. It does not modify or depend on Zynalo Studio/PhotoProX.

## Architecture

```text
React renderer
  -> renderer prompt workspace + platform-neutral prompt language service
    -> lossless source document + curated semantic catalog
    -> async bounded autocomplete IPC
      -> main-process offline Danbooru snapshot index
  -> renderer diffusion runtime/service
    -> narrow typed preload API
      -> sender-checked and payload-validated Electron IPC
        -> model registry + composite DiffusionEngine
          -> persistent Python JSONL engine host
            -> Diffusers / CUDA
```

The renderer sees stable model IDs and safe display labels, never checkpoint paths. Registration validates a file and persists metadata; loading is a separate action that sends a trusted internal reference from Electron main to Python. One model can be resident at a time. Switching releases the previous pipeline and CUDA cache before loading the next model. Warm generations retain the successful pipeline.

The versioned `zynalo.diffusion.engine-host/v2` protocol carries lifecycle events, dependency diagnostics, model load/unload commands, stage-aware generation progress/results, cancellation, partial success, and structured errors as capped newline-delimited JSON. Version-one peers fail the explicit protocol handshake instead of interpreting the expanded result shape. Generated PNGs remain under Electron `userData/generated-assets` and reach the renderer only as root-confined `zynalo-asset://generated/<id>` references.

## Detail Pass (high-res fix)

Detail Pass is an optional two-pass SDXL workflow. Zynalo first creates the composition at the selected **base resolution**, upscales that decoded RGB image in memory to the explicit **final resolution**, and then sends it through a controlled SDXL image-to-image denoising pass. The result is therefore not a pixel-only enlargement and it is not the SDXL Refiner.

Guided mode offers data-driven **Off**, **Standard**, and **Strong** presets. Generic Standard starts at 1.5×, strength 0.30, and 12 configured second-pass steps; generic Strong starts at 1.5×, strength 0.45, and 16 steps. The verified WAI profile overrides those values with 1.5×, 20 second-pass steps, and strength 0.35 for Standard or 0.50 for Strong. The UI always shows the resolved base/final sizes and labels the 2–3× time estimate as rough.

Selecting the verified WAI SDXL profile applies its documented generation range through measured midpoint defaults: **1024×1344**, 25 base steps, CFG 6, and semantic sampler `euler-ancestral` (shown as **Euler a**). The default remains editable within the validated 15–30 step and CFG 5–7 recommendations. The checkpoint-integrated VAE is used automatically; Zynalo does not request or configure a separate VAE.

Advanced mode exposes High-res fix, Lanczos or a configured R-ESRGAN 4x+ Anime6B model, scale, final dimensions, aspect locking, denoising strength, configured second-pass steps, inherited/custom positive and negative prompts, and derived/custom detail seeds. Scale and locked dimensions stay synchronized and dimensions remain aligned to 8 pixels. Unlocked manual dimensions are submitted exactly and are rejected—not silently clamped—if they violate the 3,072-pixel-per-axis or 4,194,304-final-pixel limits. Lower denoising strength preserves the base image; higher strength lets the model redraw more details and can change faces, clothing, poses, or composition.

The resident `StableDiffusionXLPipeline` is reused through Diffusers 0.40.0 `AutoPipelineForImage2Image.from_pipe`. Zynalo verifies `unet`, `vae`, `text_encoder`, and `text_encoder_2` object identity and clones only the lightweight mutable scheduler configuration. WAI's semantic `euler-ancestral` selection creates separate `EulerAncestralDiscreteScheduler` instances from the checkpoint scheduler config for txt2img and img2img, preventing mutable timestep state from leaking between passes. A Detail Pass never calls checkpoint loading again. Model unload/switch clears both pipeline views before CUDA cache collection.

Base and detail generators are separate. An omitted base seed is resolved to a concrete unsigned 32-bit value before IPC submission. Derived detail seeds use `detailSeed = (baseSeed + 0x9e3779b9) mod 2^32`, recorded as `zynalo-detail-seed-v1`. Pixel identity is supported only for an otherwise identical request on the same verified hardware, driver, checkpoint, and package versions.

The WAI SDXL profile records CLIP conditioning semantically as `penultimate-hidden-state`, the behavior conventionally called **Clip skip 2** in WebUI. Diffusers SDXL already selects `hidden_states[-2]` when its numeric `clip_skip` argument is `None`; passing Diffusers `clip_skip=2` would incorrectly select `hidden_states[-4]`. Zynalo therefore resolves the semantic layer before IPC and explicitly maps it to `clip_skip=None` for both txt2img and img2img. PNG metadata records the semantic name, hidden-state index, WebUI equivalent, Diffusers argument, both text encoders, pooled-output behavior, and whether the two passes match.

Progress distinguishes **Creating composition**, **Upscaling**, **Adding fine detail**, and **Saving**. Cancellation during the base denoise stops normally. Once the base pass has completed, Zynalo atomically saves it before beginning the larger pass; cancellation, CUDA OOM, conversion, resize, or final-save failure then returns a structured `cancelled` or `base-only` result and keeps that base asset available. No hidden lower-setting retry occurs.

Both base and final PNGs contain schema-versioned settings, prompts, dimensions, seeds, scheduler names, stage timings, reset CUDA allocated/reserved peaks, best-effort process working-set samples, runtime versions, checkpoint SHA-256, and pixel hashes. The renderer toggles assets by restricted URI and never receives a path or base64 copy. Stage VRAM values are absolute process allocations observed after resetting the CUDA peak counters at each boundary, not isolated incremental guarantees; process RAM is a boundary sample rather than a stage-isolated peak.

Zynalo supports both dependency-free Lanczos and the official **R-ESRGAN 4x+ Anime6B** weights recommended by the WAI examples. Anime6B runs the six-block RRDBNet in bounded tiles at its native 4× scale, then resamples the result in memory to the exact requested final dimensions (for example 1536×2016). Its `.pth` is loaded with PyTorch `weights_only=True`, strict state-dictionary matching, and the allow-listed SHA-256 `f872d837d3c90ed2e05227bed711af5671a6fd1c9f7d7e91c911a61f155e99da`; it is never downloaded or accepted by filename alone. The UI offers Anime6B only when configured and otherwise keeps Lanczos as an explicit fallback. Metadata records the model hash, RRDBNet-6B architecture, tile settings, native scale, final resampling, and selected upscaler. Latent upscaling remains deliberately unavailable.

## Tags prompt IDE

The generation workspace implements **Tags mode**, an offline Booru-prompt editor backed by CodeMirror 6 and the platform-neutral `@zynalo/prompt-language` package. Build and Describe modes are not present in this milestone.

The exact editor source is authoritative. Parsing never regenerates a prompt, unknown tags and unsupported syntax remain in place, and generation submits the visible positive and negative strings without invisible normalization. PNG `prompt`, `negative_prompt`, and structured `zynalo_diffusion` metadata contain those exact submitted strings.

Version-one analysis supports:

- comma-separated and multiline tags, leading/trailing whitespace, and empty comma entries;
- canonical underscores plus space-separated aliases;
- parenthesized emphasis and numeric weights such as `(smile:1.2)`;
- safely bounded nested and escaped parentheses;
- character tags containing parentheses, including `nami_(one_piece)`;
- unknown raw tags and character/series tags.

Zynalo does not claim full A1111 prompt-language compatibility. Braces, brackets, pipes, and other unsupported constructs are preserved and sent unchanged, but are marked as not analyzed. Malformed supported parentheses or weights, excessive nesting, and hard size limits block generation because the UI cannot represent them safely. Unknown catalog entries are warnings, not invalid tags: they may be model triggers, embeddings, or valid tags outside the small fixture.

Autocomplete can combine the curated semantic catalog with an optional main-process offline Danbooru snapshot. The public repository does not include that adult-capable upstream vocabulary; contributors may generate it locally with `npm run catalog:update`. Without it, the curated catalog remains available. It searches canonical tags, spaces versus underscores, aliases, common misspellings, characters, and series. Exact matches rank ahead of fuzzy matches, while snapshot prefix matches use post counts for ranking. Type to open it, or press **Ctrl+Space**; use **Up/Down**, **Enter** or **Tab** to choose and **Escape** to dismiss. Acceptance replaces only the active token. Existing tags are suppressed from normal suggestions. Associated series tags are offered separately and are never inserted silently.

Hovering over a tag requests its current Danbooru wiki description, alternate names, and one example thumbnail through Electron main. Wiki DText is reduced to bounded plain text. Preview lookup defaults to `rating:general`; **Allow NSFW previews** explicitly enables sensitive, questionable, or explicit thumbnails and persists as a local preference. Every thumbnail is labeled with its rating. A missing wiki, missing safe example, or network failure leaves editing and generation functional.

Diagnostics are deliberately distinct:

- **Errors** identify unsafe malformed syntax or exceeded limits and may block generation.
- **Warnings** identify duplicates, aliases, misspellings, deprecated/unknown tags, subject-count conflicts, conflicting framing/viewpoints/settings, and missing character-series associations. Warnings never block generation.
- **Suggestions** describe unspecified creative dimensions. Guidance can be **Full**, **Important only**, or **Off** and never implies that optional dimensions are required.

Select a problem to focus its exact source range. Every quick fix is an explicit range edit and enters CodeMirror's normal undo history. Available fixes include canonical/misspelling replacement, duplicate or either-side conflict removal, associated-series insertion, optional subject/framing/viewpoint/lighting additions, one-tag space normalization, and empty-entry removal. A fix carries its source bounds and source length; stale fixes fail instead of editing a changed prompt. There is intentionally no “Fix everything” action.

Moving the caret into or hovering over a token shows its category, concise catalog meaning, aliases, and character-series association. **Exact raw prompts** exposes both source strings verbatim.

### Model awareness and catalog

The verified checkpoint SHA-256 `befc694a296f75e996488ebf9f9db8a1493bd059b6e704b975829e87d5aeb4fa` maps to the versioned `wai-illustrious-sdxl-v1` Booru profile. Assignment uses the validated checkpoint hash, never the filename. Other models receive generic local-catalog assistance with an explicit warning that it may not reflect their training. Profile quality suggestions are explicit buttons; no quality or negative tags are injected.

The bundled `zynalo-wai-development` catalog version 1.0.0 contains 343 curated records across subjects, selected characters and series, appearance, hair, eyes, clothing, expressions, actions, poses, objects, framing, viewpoints, composition, environments, lighting/time, and quality/meta tags. It remains the hand-curated semantic layer with original short descriptions maintained under this repository's MIT license.

When present locally, the versioned 2026-08-24 snapshot contains 186,699 ranked Danbooru tags across general, artist, copyright, character, and meta categories, with active aliases. The workspace displays its count and date. The snapshot is broad but is capped by its upstream producer, so it is not presented as every live Danbooru database row. It contains adult terminology and is intentionally excluded from the public source commit. It is stored outside ASAR, indexed in Electron main, and queried through sender-checked, payload-validated IPC; no path or bulk data reaches the sandboxed renderer. Autocomplete remains offline; only an actual hover reference performs the documented network lookup. See [ADR 0005](docs/decisions/0005-offline-danbooru-autocomplete.md), [ADR 0006](docs/decisions/0006-danbooru-hover-references.md), and the packaged upstream license in `resources/tag-catalog/UPSTREAM-LICENSE.txt` when the optional snapshot is used.

### Limits and measured performance

Analysis is bounded to 4,000 characters, 512 tokens, parenthesis depth 8, 200 diagnostics, 20 rendered completion results, 256 characters per tag/alias, 1,000 curated semantic records, and 240 characters per description. Snapshot IPC accepts at most 50 results and 512 duplicate exclusions. Exceeding a source limit preserves the original source, stops additional expensive analysis, and reports a clear blocking diagnostic. Renderer analysis is debounced by 120 ms; snapshot completion is asynchronous and indexed outside the renderer.

On the development machine, the automated 3,900-character/53-token benchmark measured approximately 2.24 ms catalog construction, 2.09 ms parsing, 0.79 ms linting, and 0.63 ms average autocomplete latency over 200 searches. These are regression measurements, not cross-machine guarantees.

Only the positive draft, negative draft, guidance level, Problems-panel visibility, and NSFW-preview opt-in persist in renderer-origin storage. Data is schema-shaped and bounded; malformed persisted state is removed and cannot block startup. No prompt history or synchronization is created.

## Runtime setup

Requirements:

- Windows 10/11 x64
- Python 3.10 or newer
- the pinned packages described in [the SDXL spike README](spikes/diffusers-sdxl/README.md)
- a CUDA-enabled PyTorch wheel and compatible NVIDIA driver
- a user-supplied SDXL `.safetensors` checkpoint
- an already cached or fully local Diffusers SDXL configuration
- optional official `RealESRGAN_x4plus_anime_6B.pth` weights for the WAI-recommended upscaler

Zynalo does not install Python, PyTorch, CUDA, model files, or Hugging Face configuration. A separate CUDA Toolkit is normally unnecessary because the selected PyTorch wheel carries its CUDA runtime.

From this directory:

```powershell
npm install
$env:ZYNALO_DIFFUSION_PYTHON = (Resolve-Path ".\spikes\diffusers-sdxl\.venv\Scripts\python.exe").Path
$env:ZYNALO_DIFFUSION_CONFIG = "OnomaAIResearch/Illustrious-xl-early-release-v0"
$env:ZYNALO_DIFFUSION_ANIME6B_MODEL = "C:\ML\stable-diffusion-webui\models\RealESRGAN\RealESRGAN_x4plus_anime_6B.pth"
$env:ZYNALO_DIFFUSION_OFFLINE = "1"
npm run dev
```

Offline is the default. For a fully local setup, set `ZYNALO_DIFFUSION_CONFIG` to an absolute Diffusers configuration directory. `ZYNALO_DIFFUSION_ANIME6B_MODEL` is optional and must identify the exact allow-listed official Anime6B `.pth`; it enables the UI option but never triggers a download. The same setting can be stored as the trusted `anime6bModel` absolute path in Electron's `engine-config.json`. When a configured checkpoint is under WebUI's `models/Stable-diffusion`, Zynalo also discovers the standard sibling `models/RealESRGAN/RealESRGAN_x4plus_anime_6B.pth` path and still validates its hash in the Python host. The former `ZYNALO_DIFFUSION_CHECKPOINT` variable remains a backward-compatible migration path: when present, Electron validates and registers that checkpoint rather than making the renderer depend on its path.

## Model import workflow

Open **Model Library**, choose **Import model**, and select a `.safetensors` file using the native picker. Zynalo checks the bounded safetensors header, tensor metadata and ranges, streams SHA-256, and reports size and conservative SDXL compatibility before enabling import.

Choose one storage mode:

- **Register in place** references the existing file immediately without duplicating multiple gigabytes. Moving, renaming, replacing, or deleting it breaks the registration. Removing the registration never deletes the external file.
- **Copy into Zynalo** checks free space, copies through a temporary file while hashing, verifies the copy, and atomically promotes it into managed storage. Removing its registration and permanently deleting the managed file are separate actions; deletion requires explicit confirmation.

The registry is schema-versioned and atomically persisted as `model-registry.v1.json` beneath Electron's user-data directory, normally `%APPDATA%\Zynalo Diffusion`. Managed checkpoints are under its `models` directory. Malformed registries are preserved as timestamped `model-registry.corrupt-*.json` files and replaced with a safe empty registry. Interrupted managed-copy staging files are removed on startup.

After import:

1. Select the registered model in either Model Library or the generation workspace.
2. Click **Load model**. Loading is indeterminate while Python releases any previous model and constructs the new SDXL pipeline.
3. Generate only after the workspace reports **Loaded and ready**.
4. Repeated generations use the same resident pipeline.

The last registered selection is persisted but rechecked on startup. Missing or changed files cannot be loaded until they are revalidated or re-imported. Safetensors validation cannot prove every checkpoint will construct a compatible Diffusers pipeline, so pre-load wording is intentionally “Likely SDXL checkpoint. Compatibility is confirmed when loaded.”

## Diagnostics

Open **Diagnostics** and use **Refresh**, **Copy report**, or **Save JSON**. The report covers:

- application version/mode, safe storage labels, engine state, and protocol version;
- Python discovery/version and required package versions;
- PyTorch CUDA availability, GPU, runtime, compute capability, VRAM, and current allocations;
- selected/loaded model, file state, size, hash, compatibility, validation time, and last load error.

States are marked healthy, warning, blocking, or unknown and include corrective actions. Reports exclude prompts, negative prompts, generated images, environment variables, credentials, and full personal paths.

## Common failures

- **Python runtime not found:** set `ZYNALO_DIFFUSION_PYTHON` to the interpreter in the verified Zynalo environment.
- **Required package unavailable:** install the pinned requirements into that interpreter.
- **CUDA unavailable in PyTorch:** install a CUDA-enabled PyTorch wheel compatible with the NVIDIA driver. Do not install a CUDA Toolkit unless the selected wheel explicitly requires it.
- **Model file changed after registration:** revalidate it; if the hash changed, remove the old registration and import the intended file again.
- **Missing model:** restore the external file at its registered location or remove and re-import it.
- **GPU out of memory during load:** close other GPU-heavy applications or use a checkpoint/runtime configuration that fits available VRAM.
- **Managed import lacks space:** free at least the checkpoint size plus staging headroom, then retry.
- **Engine crash during load:** refresh Diagnostics, verify Python/CUDA packages, then retry; the mock engine remains available.

User cancellation of the picker or copy is treated as cancellation, not an application error.

## Development and verification

```powershell
npm run typecheck
npm test
npm run lint
npm run build
npm run package
npm run catalog:update # optional developer-only local refresh
git diff --check -- zynalo-diffusion
```

Python tests:

```powershell
$env:PYTHONPATH = (Resolve-Path ".\spikes\diffusers-sdxl\src").Path
.\spikes\diffusers-sdxl\.venv\Scripts\python.exe -m unittest discover -s .\spikes\diffusers-sdxl\tests -v
```

Opt-in registered-model RTX test:

```powershell
$env:ZYNALO_REAL_PYTHON = (Resolve-Path ".\spikes\diffusers-sdxl\.venv\Scripts\python.exe").Path
$env:ZYNALO_REAL_CHECKPOINT = "C:\ML\stable-diffusion-webui\models\Stable-diffusion\waiIllustriousSDXL_v150.safetensors"
npm test -- tests/python-engine-real.test.ts --reporter=verbose
```

That test registers in place, restarts the registry, explicitly loads once, verifies base determinism, runs and repeats the 512×512 → 768×768 Standard Detail Pass, changes only the detail seed, cancels during detail with base preservation, runs another warm generation, writes `.test-output/detail-pass-benchmark.json`, revalidates, exercises diagnostics, removes without deleting the source, and re-registers it.

The full WAI comparison is opt-in because it is substantially slower:

```powershell
$env:ZYNALO_RUN_DETAIL_BENCHMARK = "1"
npm test -- tests/detail-pass-benchmark-real.test.ts --reporter=verbose
```

It loads the checkpoint once and writes `.test-output/wai-detail-pass-benchmark.json` for A) the documented 1024×1344 base size with 25 steps, CFG 6, and Euler a, B) WAI Standard Anime6B to 1536×2016 at strength 0.35 and 20 detail steps, C) WAI Strong Anime6B to 1536×2016 at strength 0.50 and 20 detail steps, and a deterministic Standard repeat. The JSON contains stage timings and CUDA peaks from the returned results. Composition preservation, face/hand mutation, and actual fine-detail improvement still require a human side-by-side review against a conventionally enlarged base; resolution alone is not treated as proof of improved quality.

Focused Tags checks are included in the ordinary suite. To print the timing measurement alone:

```powershell
npm test -- tests/prompt-performance.test.ts --reporter=verbose
```

Packaged WAI verification uses a registry under a disposable user-data directory, launches the packaged executable with `--remote-debugging-port=<port>`, and then runs:

```powershell
node .\tests\fixtures\package-renderer-smoke.mjs <port>
```

That browser-level pass exercises space-based Nami completion, Enter acceptance, explanations, conflict diagnostics, problem navigation, explicit fixes, fix undo, stale-analysis refresh, unknown-tag preservation, draft/preference restart restoration, malformed-expression blocking, model loading, a real 512×512 base generation, a real 512×512 → 768×768 Standard Detail Pass, base/final controls, generated-image display, Model Library, and Diagnostics. Inspect both resulting PNGs with Pillow to compare the plain text prompt fields and `zynalo_diffusion.parameters` with the reported exact raw editor strings.

For a focused packaged Detail Pass UI gate after launching the executable with a remote-debugging port, run:

```powershell
node .\tests\fixtures\package-detail-ui-smoke.mjs <port>
```

It drives the rendered Standard preset, verifies the stage sequence and exact metadata, decodes the restricted final asset at 768×768, checks the base/final controls, and closes the packaged app cleanly.

`npm run package` creates `out\Zynalo Diffusion-win32-x64\zynalo-diffusion.exe`. The package includes curated engine-host `.py` source and the optional local tag snapshot when present. It excludes Python, virtual environments, packages, models, Hugging Face caches, generated/test outputs, development tools, tests, and source maps.

## Privacy and security

- No telemetry, model download, or prompt synchronization is implemented. Autocomplete and generation remain offline; hovering a tag makes a bounded public Danbooru wiki/post request and caches the returned thumbnail in application-managed storage.
- `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true` remain enabled.
- CodeMirror is bundled locally. Its generated styles use a fixed style nonce admitted by CSP; scripts retain `script-src 'self'`, and `connect-src 'none'` remains enforced.
- Native file dialogs, filesystem access, clipboard operations, process control, and diagnostics saving remain narrow main-process capabilities.
- Every IPC sender and payload is validated; renderer input never becomes an unchecked model path.
- The asset protocol serves generated image IDs only and cannot serve checkpoints or arbitrary files.
- Safetensors data is parsed as bounded metadata and raw tensor ranges; pickle/code deserialization is not supported.

See [ADR 0001](docs/decisions/0001-static-renderer-typed-ipc.md), [ADR 0002](docs/decisions/0002-persistent-python-engine-host.md), [ADR 0003](docs/decisions/0003-local-model-library.md), [ADR 0004](docs/decisions/0004-lossless-prompt-language.md), [ADR 0005](docs/decisions/0005-offline-danbooru-autocomplete.md), [ADR 0006](docs/decisions/0006-danbooru-hover-references.md), and [ADR 0007](docs/decisions/0007-detail-pass-two-pass-img2img.md).

## Explicitly deferred

Build/Scene Builder mode, Describe mode, natural-language translation, LLM integrations, live/runtime tag downloads, character images, model downloads, Civitai, starter packs, bundled Python/PyTorch, automatic runtime installation, LoRAs, embeddings, separate VAEs, ControlNet, regional prompting, inpainting, latent upscaling, additional external upscalers, tiled diffusion, batch generation, prompt history/galleries, cloud accounts, telemetry, updates, macOS/Linux packaging, broad redesign, Zynalo Studio integration, and automatic VRAM profiles remain out of scope.
