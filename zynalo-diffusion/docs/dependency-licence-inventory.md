# Dependency and licence inventory

This is an engineering inventory, not a legal conclusion. Review licences and
attribution requirements before redistribution.

## Bundled source and data

- The root application and Diffusion workspace declare MIT licensing.
- `resources/tag-catalog/danbooru.csv` is an optional adult-capable upstream
  snapshot and is excluded from the public source commit. If generated locally
  or distributed in a package, its accompanying `UPSTREAM-LICENSE.txt` must
  remain with the data and should be reviewed before redistribution.
- `packages/prompt-language` contains curated prompt metadata maintained as
  project source under the repository's MIT terms.
- CodeMirror, Electron, React, Vite, Vitest, TypeScript, and the other npm
  dependencies are installed from their package manifests/lockfile; their
  individual licence notices are not copied into the repository. Review the
  generated dependency notices required by the eventual distribution process.

## External runtime components

- Diffusion expects Python, Diffusers, Transformers, Accelerate, Pillow,
  Safetensors, and a CUDA-enabled PyTorch installation externally.
- NVIDIA drivers/CUDA runtime support, Hugging Face configuration, SDXL
  checkpoints, and optional Real-ESRGAN Anime6B weights are not bundled.
- Model and weight licences, including the WAI and Real-ESRGAN source/weight
  terms, must be reviewed for each model selected by a user. No model weights
  are part of this repository.

## Packaging boundary

Electron packages the application source and optional local tag snapshot, not Python,
virtual environments, node modules, model checkpoints, caches, generated
images, or development outputs. Keep third-party notices with any bundled
source or data and perform a dependency notice audit before a public release.
