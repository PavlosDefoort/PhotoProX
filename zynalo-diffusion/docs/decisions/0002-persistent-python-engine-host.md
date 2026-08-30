# ADR 0002: Persistent out-of-process Python engine host

## Decision

Run Diffusers SDXL in one supervised Python child process and communicate exclusively with versioned newline-delimited JSON over standard input/output. Keep the existing platform-neutral `DiffusionEngine` interface, route the configured SDXL model and mock model through a composite engine, and retain the loaded pipeline between jobs.

Electron owns configuration, process lifecycle, IPC validation, job correlation, and the generated-output root. Python owns checkpoint loading, deterministic CUDA inference, progress callbacks, cancellation, metadata, and atomic PNG writes. Only validated opaque asset identifiers cross into the renderer.

## Consequences

- Warm generations avoid model reload cost.
- Python or CUDA failures cannot directly crash the renderer and are surfaced as lifecycle/job errors.
- Protocol evolution requires a new protocol version or backward-compatible validators.
- Packaged builds still require a separately installed compatible Python environment and user-supplied checkpoint/configuration.
- Forced Windows cleanup must terminate the process tree because a virtual-environment launcher may create a child interpreter.
