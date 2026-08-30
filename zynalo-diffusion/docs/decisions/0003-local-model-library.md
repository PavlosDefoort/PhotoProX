# ADR 0003: Local model registration, storage, and explicit loading

## Decision

Maintain a schema-versioned registry under Electron `userData`. Trusted records contain canonical checkpoint paths; renderer-facing records contain stable generated IDs, safe location labels, hashes, validation state, and compatibility evidence. Renderer model IDs are resolved back to paths only inside Electron main immediately before a controlled Python `load-model` command.

Registration and loading are separate. Registration performs bounded safetensors structural checks and streaming SHA-256 without constructing a pipeline. Loading remains the authoritative compatibility test because tensor names alone cannot guarantee that every third-party single-file checkpoint matches the Diffusers SDXL pipeline.

Support both external and managed records. External registration avoids duplicating multi-gigabyte user files but is sensitive to moves and changes. Managed import provides stable application ownership through free-space checks, temporary staging, streaming copy verification, and atomic promotion. Registration removal never silently deletes a user-owned file, and managed deletion requires a distinct explicit request.

The Python runtime remains external. Bundling Python, PyTorch, CUDA wheels, driver compatibility policy, and automatic runtime repair is a separate distribution milestone; representing that as already solved would make diagnostics and package size misleading.

## Consequences

- Application restart preserves registration and the last selected stable ID.
- Selection is cheap; explicit load/switch may take time and can fail independently.
- Missing, statistically changed, rehashed, invalid, and unsupported models have distinct states.
- A valid safetensors container is necessary but not sufficient evidence of SDXL compatibility.
- Registry contents are treated as untrusted and managed paths must remain inside the managed root.
- Zero-setup runtime distribution remains deferred.
