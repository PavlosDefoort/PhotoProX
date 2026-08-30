# Zynalo

Zynalo is the transitional home of two separate applications:

- **Zynalo Studio** — the existing web and desktop photo editor, historically
  published as PhotoProX.
- **Zynalo Diffusion** — a standalone Electron application for local/offline
  image generation.

The repository currently keeps the applications independent:

```text
repository root/       Zynalo Studio / PhotoProX
zynalo-diffusion/      Zynalo Diffusion and its private npm workspace
```

This is intentionally not the final `apps/` and `packages/` monorepo layout.
Both products remain separately buildable, packageable, installable,
versionable, and releasable:

```text
Zynalo Studio.exe
Zynalo Diffusion.exe
```

## Studio

Studio is the established Next.js photo editor. Existing root commands remain
the source of truth:

```powershell
npm install
npm run dev
npm run build:web
npm run dev:desktop
npm run package:desktop
npm run make:desktop
```

See the root `package.json` for the complete command set. Studio may be worked
on without installing or building Diffusion.

## Diffusion

Diffusion is self-contained under [`zynalo-diffusion/`](zynalo-diffusion/).
Read its [application README](zynalo-diffusion/README.md) for installation,
development, typechecking, tests, Python setup, packaging, security, and
offline model configuration. From that directory, the normal checks are:

```powershell
npm install
npm run typecheck
npm test
npm run lint
npm run build
npm run package
```

Python, PyTorch, CUDA-enabled drivers, model checkpoints, and Hugging Face
configuration are external prerequisites. They are deliberately not bundled
or committed. Generated output, runtimes, caches, credentials, and model
weights are excluded by the repository and Diffusion ignore rules.

## Architecture direction

The intended long-term model is one repository containing two applications and
shared headless packages when justified. Potential shared boundaries include
diffusion contracts, engine clients, generation recipes, prompt language,
model profiles, model management, upscaler contracts, regional-generation
contracts, and platform-neutral UI primitives.

Application layouts, Electron main processes, preload bridges, storage,
installers, release versions, update channels, and product-specific interfaces
remain application-owned. Studio must not import Diffusion renderer components
or Electron internals. Shared code must be platform-neutral and headless.

The final `apps/studio`, `apps/diffusion`, and `packages/*` migration is
deferred until **Studio first consumes the shared generation workflow**. The
current boundary and migration inventory are documented in
[docs/repository-architecture.md](docs/repository-architecture.md) and
[zynalo-diffusion/docs/migration-inventory.md](zynalo-diffusion/docs/migration-inventory.md).

## Development status and contribution notes

Both products contain active experimental and transitional work; this README
does not claim production readiness for unfinished features. Review the
product-specific documentation before running optional real-engine or GPU
checks. Do not commit secrets, local paths, model files, Python environments,
packaged applications, or generated benchmark output. Preserve upstream
notices for bundled source/data; see Diffusion's
[dependency and licence inventory](zynalo-diffusion/docs/dependency-licence-inventory.md).

The repository is currently hosted as `PhotoProx`; the Zynalo naming is the
product direction during this transition.
