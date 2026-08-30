# Zynalo Diffusion: Diffusers SDXL spike

This directory contains the isolated benchmark harness and the persistent SDXL engine host used by the Electron application. The host remains an out-of-process boundary; Electron packages its source but does not import Python modules in-process.

The harness:

- requires CUDA and deliberately has no CPU fallback;
- loads a local checkpoint with `StableDiffusionXLPipeline.from_single_file()`;
- configures deterministic PyTorch/cuBLAS/cuDNN behavior before CUDA initialization;
- recreates a CUDA generator from the same unsigned 32-bit seed for every run;
- emits one JSON object per stdout line, including every denoising step;
- measures synchronized model-load and generation wall time;
- reports CUDA peak allocated/reserved memory and generation working-set delta;
- embeds prompts, settings, versions, timing, VRAM, checkpoint SHA-256, and pixel SHA-256 in each PNG;
- writes a separate benchmark JSON report;
- verifies that repeated measured runs have identical decoded pixel hashes.

## Prerequisites

- Windows 10/11 or Linux x86-64
- Python 3.12 x64 (Python 3.10–3.14 is accepted)
- An NVIDIA GPU with a driver compatible with the selected PyTorch CUDA wheel
- A user-provided SDXL checkpoint ending in `.safetensors`
- Enough free disk space for the virtual environment, model cache, checkpoint, and PNG outputs

The commands below pin PyTorch 2.11.0 with its CUDA 12.8 wheel and the top-level Python packages used by this spike. The PyTorch wheel contains the needed CUDA runtime libraries; a separate CUDA Toolkit installation is not normally needed. If the installed NVIDIA driver cannot support CUDA 12.8, choose a compatible command from the official PyTorch selector rather than silently installing the CPU wheel.

## Exact Windows installation

Run from this `spikes/diffusers-sdxl` directory in PowerShell:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install torch==2.11.0 torchvision==0.26.0 --index-url https://download.pytorch.org/whl/cu128
.\.venv\Scripts\python.exe -m pip install --requirement requirements.txt
.\.venv\Scripts\python.exe -m pip install --no-deps --editable .
```

Verify that the environment sees CUDA:

```powershell
.\.venv\Scripts\python.exe -c "import torch; print(torch.__version__, torch.version.cuda); assert torch.cuda.is_available(); print(torch.cuda.get_device_name(0))"
```

## Exact Linux installation

```bash
python3.12 -m venv .venv
./.venv/bin/python -m pip install --upgrade pip
./.venv/bin/python -m pip install torch==2.11.0 torchvision==0.26.0 --index-url https://download.pytorch.org/whl/cu128
./.venv/bin/python -m pip install --requirement requirements.txt
./.venv/bin/python -m pip install --no-deps --editable .
./.venv/bin/python -c 'import torch; print(torch.__version__, torch.version.cuda); assert torch.cuda.is_available(); print(torch.cuda.get_device_name(0))'
```

## Checkpoint configuration

A single `.safetensors` file contains weights but may not contain every scheduler, tokenizer, or component configuration required by Diffusers.

- For a standard SDXL-compatible checkpoint with network access, pass `--config stabilityai/stable-diffusion-xl-base-1.0`. Diffusers downloads missing configuration files into the normal Hugging Face cache.
- For a fully local run, prepare a local Diffusers SDXL configuration directory and pass its path with `--config C:\Models\sdxl-config --offline`.
- Omitting `--config` asks Diffusers to infer the source configuration from the checkpoint. This works for many conventional SDXL checkpoints but is less explicit.

The spike never downloads or selects a checkpoint. Review the model license and obtain the checkpoint separately.

## Generate one image

```powershell
.\.venv\Scripts\zynalo-sdxl.exe `
  --checkpoint "C:\Models\my-sdxl-model.safetensors" `
  --config "stabilityai/stable-diffusion-xl-base-1.0" `
  --prompt "cinematic photograph of a glass observatory above the clouds" `
  --negative-prompt "text, watermark, blurry" `
  --output ".\outputs\observatory.png" `
  --seed 123456789 `
  --width 1024 `
  --height 1024 `
  --steps 30 `
  --guidance 5.0
```

The image is written to `outputs/observatory.png`; the full report is written to `outputs/observatory.benchmark.json`.

## Benchmark and capture progress

This performs one warmup and three measured runs. All measured runs use the same seed. The command fails if their decoded pixels differ.

```powershell
.\.venv\Scripts\zynalo-sdxl.exe `
  --checkpoint "C:\Models\my-sdxl-model.safetensors" `
  --config "C:\Models\sdxl-config" `
  --offline `
  --prompt "cinematic photograph of a glass observatory above the clouds" `
  --negative-prompt "text, watermark, blurry" `
  --output ".\outputs\benchmark.png" `
  --seed 123456789 `
  --steps 30 `
  --warmup-runs 1 `
  --runs 3 `
  --report ".\outputs\benchmark.json" `
  > ".\outputs\progress.jsonl" `
  2> ".\outputs\run.stderr.log"
```

Measured images are named `benchmark-run001.png`, `benchmark-run002.png`, and `benchmark-run003.png`. Stdout is reserved for JSONL events described by `schemas/progress-event.schema.json`; library diagnostics and the final human-readable error line use stderr. Exit code `0` means success and `1` means validation, loading, inference, determinism, or save failure.

Representative progress event:

```json
{"schema":"zynalo.diffusion.sdxl-spike.event/v1","sequence":12,"timestamp":"2026-08-26T20:00:00.000+00:00","event":"progress","stage":"generating","phase":"measured","run_index":1,"current_step":7,"total_steps":30,"progress":0.233333,"elapsed_ms":1842.51}
```

## PNG metadata

The `zynalo_diffusion` iTXt chunk contains the complete structured metadata document. Convenience chunks also expose `prompt`, `negative_prompt`, `seed`, `checkpoint_sha256`, and `pixel_sha256`.

Inspect it with:

```powershell
.\.venv\Scripts\python.exe -c "from PIL import Image; import json; image=Image.open(r'.\outputs\observatory.png'); print(json.dumps(json.loads(image.info['zynalo_diffusion']), indent=2))"
```

The checkpoint's absolute path is intentionally not recorded; only its filename and SHA-256 are persisted.

## Memory and timing interpretation

- Timers use `perf_counter_ns()` and synchronize CUDA immediately before and after generation.
- `peak_allocated` is the highest tensor allocation observed by PyTorch, including persistent model weights.
- `peak_reserved` is the high-water mark of the CUDA caching allocator.
- `peak_working_delta` subtracts allocated bytes immediately before generation, approximating transient generation memory.
- PNG encoding time is separate from GPU generation time.
- JSONL emission occurs once per denoising step and is included in the measured generation wall time.

Use `--attention-slicing` or `--vae-tiling` to reduce VRAM pressure, but benchmark these modes separately because they change performance. Lower width/height if a 1024×1024 run does not fit.

## Determinism scope

The harness requests deterministic algorithms, disables TF32, disables cuDNN benchmarking, fixes the cuBLAS workspace configuration, and verifies repeated pixels. This targets reproducibility on the same GPU model, driver, checkpoint, package versions, inputs, and flags. Bit-identical output across different NVIDIA architectures, drivers, or library versions is not guaranteed. Some third-party checkpoint components may use an operation for which PyTorch has no deterministic CUDA implementation; the harness fails instead of silently using that operation.

## Lightweight tests

These tests do not import Torch, Diffusers, or load a model:

```powershell
$env:PYTHONPATH = "src"
py -3.12 -m unittest discover -s tests -v
```

An actual GPU benchmark is intentionally separate because it requires the user-selected checkpoint and its license/configuration context.

## Persistent JSONL host

Electron launches this module with unbuffered stdio:

```powershell
$env:PYTHONPATH = (Resolve-Path ".\src").Path
.\.venv\Scripts\python.exe -u -m zynalo_sdxl_spike.host `
  --checkpoint "C:\Models\my-sdxl-model.safetensors" `
  --output-root ".\outputs\host" `
  --model-id "my-sdxl" `
  --model-name "My SDXL" `
  --config "C:\Models\sdxl-config" `
  --offline
```

Stdout is reserved for one `zynalo.diffusion.engine-host/v2` JSON object per line. The host emits `hello`, model-load, ready, shutdown, and stopped lifecycle messages and accepts `inspect-hardware`, `list-models`, `status`, `runtime-diagnostics`, `load-model`, `unload-model`, `generate`, `cancel`, and `shutdown` commands. Version two adds resolved Detail Pass settings, stage/overall progress, base/final assets, stage metrics, and partial-success results. An optional startup model loads before the command loop and remains resident; generation runs on a worker so the main loop can accept cancellation. Diagnostics use stderr.

Electron normally starts the host without `--checkpoint`, receives the ready handshake, queries `runtime-diagnostics`, and later sends a validated internal `load-model` reference selected from its registry. `load-model` and `unload-model` switch the single resident pipeline; successful models remain warm between generation commands. The command-line checkpoint arguments above remain supported for backward-compatible spike and migration testing.

## References

- [Diffusers single-file loading](https://huggingface.co/docs/diffusers/api/loaders/single_file)
- [Diffusers SDXL pipeline and step callback](https://huggingface.co/docs/diffusers/main/api/pipelines/stable_diffusion/stable_diffusion_xl)
- [PyTorch installation selector](https://pytorch.org/get-started/locally/)
- [PyTorch deterministic algorithm API](https://docs.pytorch.org/docs/stable/generated/torch.use_deterministic_algorithms.html)
