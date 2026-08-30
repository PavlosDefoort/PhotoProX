# Transitional repository architecture

## Decision

Keep one Git repository with two independent applications:

```text
repository root/       Zynalo Studio (PhotoProX heritage)
zynalo-diffusion/      Zynalo Diffusion
```

This keeps related product work discoverable while allowing each application
to be installed, built, packaged, versioned, and released independently. The
installation products remain separate (`Zynalo Studio.exe` and `Zynalo
Diffusion.exe`). Repository structure and installation structure are separate
concerns.

Diffusion remains isolated in `zynalo-diffusion/` for now because Studio does
not yet consume its generation workflow. The final `apps/studio`,
`apps/diffusion`, and `packages/*` migration is deferred until Studio's first
real consumption of that shared workflow. That event will provide a concrete
shared API boundary instead of forcing speculative packages today.

Studio must not import Diffusion renderer components, Electron main-process
code, or preload internals. Any future shared package must be platform-neutral
and headless. Application layouts, storage, Electron processes, installers,
release versions, update channels, and product-specific interfaces stay local
to their application.

Potential future shared areas are diffusion contracts, engine clients,
generation recipes, prompt language, model profiles, model management,
upscaler contracts, regional-generation contracts, and platform-neutral UI
primitives. No placeholder shared packages are created by this decision.

See [Diffusion's migration inventory](../zynalo-diffusion/docs/migration-inventory.md)
for the current package-by-package assessment.
