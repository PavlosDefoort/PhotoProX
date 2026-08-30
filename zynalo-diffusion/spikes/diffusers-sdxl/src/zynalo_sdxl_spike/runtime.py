from __future__ import annotations

import os
import platform
import statistics
import time
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path
from typing import Any

from . import __version__
from .config import InferenceConfig, output_path_for_run
from .events import JsonlEmitter
from .metadata import (
    build_png_metadata,
    pixel_sha256,
    save_png_with_metadata,
    sha256_file,
    write_json_atomic,
)

REPORT_SCHEMA = "zynalo.diffusion.sdxl-spike.benchmark/v1"
BYTES_PER_GIB = 1024**3


class RuntimeRequirementError(RuntimeError):
    """Raised when CUDA or an inference dependency is unavailable."""


class DeterminismError(RuntimeError):
    """Raised when fixed-seed measured runs do not produce identical pixels."""


def configure_deterministic_environment() -> None:
    # PyTorch requires this before a CUDA context is created for deterministic cuBLAS.
    os.environ.setdefault("CUBLAS_WORKSPACE_CONFIG", ":4096:8")
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")


def package_versions() -> dict[str, str]:
    packages = ("torch", "diffusers", "transformers", "accelerate", "safetensors", "Pillow")
    result: dict[str, str] = {"zynalo_sdxl_spike": __version__}
    for package in packages:
        try:
            result[package.lower()] = version(package)
        except PackageNotFoundError:
            result[package.lower()] = "not-installed"
    return result


def _milliseconds(start_ns: int, end_ns: int | None = None) -> float:
    return round(((end_ns or time.perf_counter_ns()) - start_ns) / 1_000_000, 3)


def _memory_metrics(torch: Any, device: Any, baseline_allocated: int) -> dict[str, int | float]:
    peak_allocated = int(torch.cuda.max_memory_allocated(device))
    peak_reserved = int(torch.cuda.max_memory_reserved(device))
    return {
        "baseline_allocated_bytes": baseline_allocated,
        "peak_allocated_bytes": peak_allocated,
        "peak_reserved_bytes": peak_reserved,
        "peak_working_delta_bytes": max(0, peak_allocated - baseline_allocated),
        "peak_allocated_gib": round(peak_allocated / BYTES_PER_GIB, 3),
        "peak_reserved_gib": round(peak_reserved / BYTES_PER_GIB, 3),
        "peak_working_delta_gib": round(max(0, peak_allocated - baseline_allocated) / BYTES_PER_GIB, 3),
    }


def _runtime_details(torch: Any, device: Any) -> dict[str, object]:
    properties = torch.cuda.get_device_properties(device)
    return {
        "python": platform.python_version(),
        "platform": platform.platform(),
        "packages": package_versions(),
        "cuda_runtime": torch.version.cuda,
        "cudnn": int(torch.backends.cudnn.version() or 0),
        "gpu": {
            "index": device.index,
            "name": properties.name,
            "compute_capability": f"{properties.major}.{properties.minor}",
            "total_memory_bytes": int(properties.total_memory),
            "total_memory_gib": round(properties.total_memory / BYTES_PER_GIB, 3),
        },
        "determinism": {
            "algorithms": True,
            "cublas_workspace_config": os.environ.get("CUBLAS_WORKSPACE_CONFIG"),
            "cudnn_benchmark": False,
            "cudnn_deterministic": True,
            "tf32": False,
        },
    }


def _timing_summary(values: list[float]) -> dict[str, float]:
    return {
        "count": float(len(values)),
        "min_ms": round(min(values), 3),
        "max_ms": round(max(values), 3),
        "mean_ms": round(statistics.fmean(values), 3),
        "median_ms": round(statistics.median(values), 3),
    }


def execute(config: InferenceConfig, emitter: JsonlEmitter) -> dict[str, object]:
    configure_deterministic_environment()
    try:
        import torch
        from diffusers import StableDiffusionXLPipeline
    except ImportError as error:
        raise RuntimeRequirementError(
            "Inference dependencies are missing. Follow the isolated installation steps in README.md."
        ) from error

    if not torch.cuda.is_available():
        raise RuntimeRequirementError("A CUDA-enabled PyTorch build and NVIDIA GPU are required; CPU fallback is disabled.")
    if config.device_index >= torch.cuda.device_count():
        raise RuntimeRequirementError(
            f"CUDA device {config.device_index} was requested, but only {torch.cuda.device_count()} device(s) are visible."
        )

    device = torch.device(f"cuda:{config.device_index}")
    if config.dtype == "bfloat16" and not torch.cuda.is_bf16_supported():
        raise RuntimeRequirementError("The selected NVIDIA GPU does not support bfloat16.")
    dtype = {
        "float16": torch.float16,
        "bfloat16": torch.bfloat16,
        "float32": torch.float32,
    }[config.dtype]

    torch.cuda.set_device(device)
    torch.cuda.init()
    torch.manual_seed(config.seed)
    torch.cuda.manual_seed_all(config.seed)
    torch.use_deterministic_algorithms(True)
    torch.backends.cudnn.benchmark = False
    torch.backends.cudnn.deterministic = True
    torch.backends.cuda.matmul.allow_tf32 = False
    torch.backends.cudnn.allow_tf32 = False
    torch.set_grad_enabled(False)

    started_ns = time.perf_counter_ns()
    runtime_details = _runtime_details(torch, device)
    emitter.emit("startup", stage="initializing", parameters=config.public_parameters(), runtime=runtime_details)

    hash_started_ns = time.perf_counter_ns()
    emitter.emit("checkpoint_hash_started", stage="validating-checkpoint", filename=config.checkpoint.name)
    checkpoint_sha256 = sha256_file(config.checkpoint)
    checkpoint_hash_ms = _milliseconds(hash_started_ns)
    emitter.emit(
        "checkpoint_hash_completed",
        stage="validating-checkpoint",
        filename=config.checkpoint.name,
        sha256=checkpoint_sha256,
        elapsed_ms=checkpoint_hash_ms,
    )

    torch.cuda.empty_cache()
    torch.cuda.reset_peak_memory_stats(device)
    load_started_ns = time.perf_counter_ns()
    emitter.emit("model_load_started", stage="loading-model")
    load_arguments: dict[str, object] = {
        "torch_dtype": dtype,
        "use_safetensors": True,
        "local_files_only": config.offline,
    }
    if config.config_source:
        possible_path = Path(config.config_source).expanduser()
        load_arguments["config"] = str(possible_path.resolve()) if possible_path.exists() else config.config_source

    pipeline = StableDiffusionXLPipeline.from_single_file(str(config.checkpoint), **load_arguments)
    pipeline.set_progress_bar_config(disable=True)
    pipeline.to(device)
    if config.attention_slicing:
        pipeline.enable_attention_slicing()
    if config.vae_tiling:
        pipeline.enable_vae_tiling()
    torch.cuda.synchronize(device)
    model_load_ms = _milliseconds(load_started_ns)
    load_memory = _memory_metrics(torch, device, 0)
    emitter.emit(
        "model_load_completed",
        stage="loading-model",
        elapsed_ms=model_load_ms,
        memory=load_memory,
    )

    measured_runs: list[dict[str, object]] = []
    expected_pixel_hash: str | None = None
    total_run_count = config.warmup_runs + config.runs

    for absolute_index in range(1, total_run_count + 1):
        is_warmup = absolute_index <= config.warmup_runs
        phase = "warmup" if is_warmup else "measured"
        phase_index = absolute_index if is_warmup else absolute_index - config.warmup_runs
        emitter.emit(
            "run_started",
            stage="generating",
            phase=phase,
            run_index=phase_index,
            run_count=config.warmup_runs if is_warmup else config.runs,
        )

        generator = torch.Generator(device=device).manual_seed(config.seed)
        baseline_allocated = int(torch.cuda.memory_allocated(device))
        torch.cuda.reset_peak_memory_stats(device)
        torch.cuda.synchronize(device)
        generation_started_ns = time.perf_counter_ns()

        def progress_callback(
            _pipeline: Any,
            step_index: int,
            _timestep: Any,
            callback_kwargs: dict[str, Any],
        ) -> dict[str, Any]:
            completed_steps = step_index + 1
            emitter.emit(
                "progress",
                stage="generating",
                phase=phase,
                run_index=phase_index,
                current_step=completed_steps,
                total_steps=config.steps,
                progress=round(completed_steps / config.steps, 6),
                elapsed_ms=_milliseconds(generation_started_ns),
            )
            return callback_kwargs

        with torch.inference_mode():
            pipeline_output = pipeline(
                prompt=config.prompt,
                negative_prompt=config.negative_prompt or None,
                width=config.width,
                height=config.height,
                num_inference_steps=config.steps,
                guidance_scale=config.guidance,
                generator=generator,
                num_images_per_prompt=1,
                callback_on_step_end=progress_callback,
                callback_on_step_end_tensor_inputs=[],
            )
        torch.cuda.synchronize(device)
        generation_ms = _milliseconds(generation_started_ns)
        run_memory = _memory_metrics(torch, device, baseline_allocated)
        image = pipeline_output.images[0]

        if is_warmup:
            emitter.emit(
                "run_completed",
                stage="warmup-complete",
                phase=phase,
                run_index=phase_index,
                generation_ms=generation_ms,
                memory=run_memory,
            )
            del image, pipeline_output, generator
            continue

        pixels_sha256 = pixel_sha256(image)
        if expected_pixel_hash is None:
            expected_pixel_hash = pixels_sha256
        elif config.verify_determinism and pixels_sha256 != expected_pixel_hash:
            raise DeterminismError(
                f"Run {phase_index} pixel hash {pixels_sha256} did not match first run {expected_pixel_hash}."
            )

        output_path = output_path_for_run(config.output, phase_index, config.runs)
        metadata = build_png_metadata(
            parameters=config.public_parameters(),
            checkpoint_sha256=checkpoint_sha256,
            runtime=runtime_details,
            timing={"generation_ms": generation_ms, "model_load_ms": model_load_ms},
            memory=run_memory,
            run_index=phase_index,
            pixels_sha256=pixels_sha256,
        )
        emitter.emit("image_save_started", stage="saving", run_index=phase_index, output=str(output_path))
        save_started_ns = time.perf_counter_ns()
        save_png_with_metadata(image, output_path, metadata)
        save_ms = _milliseconds(save_started_ns)
        run_result: dict[str, object] = {
            "run_index": phase_index,
            "seed": config.seed,
            "generation_ms": generation_ms,
            "save_ms": save_ms,
            "memory": run_memory,
            "pixel_sha256": pixels_sha256,
            "output": str(output_path),
        }
        measured_runs.append(run_result)
        emitter.emit("run_completed", stage="complete", phase=phase, **run_result)
        del image, pipeline_output, generator

    generation_values = [float(run["generation_ms"]) for run in measured_runs]
    peak_allocated = max(int(run["memory"]["peak_allocated_bytes"]) for run in measured_runs)  # type: ignore[index]
    peak_reserved = max(int(run["memory"]["peak_reserved_bytes"]) for run in measured_runs)  # type: ignore[index]
    report: dict[str, object] = {
        "schema": REPORT_SCHEMA,
        "parameters": config.public_parameters(),
        "checkpoint_sha256": checkpoint_sha256,
        "runtime": runtime_details,
        "timing": {
            "checkpoint_hash_ms": checkpoint_hash_ms,
            "model_load_ms": model_load_ms,
            "generation": _timing_summary(generation_values),
            "total_harness_ms": _milliseconds(started_ns),
        },
        "memory": {
            "model_load": load_memory,
            "measured_peak_allocated_bytes": peak_allocated,
            "measured_peak_reserved_bytes": peak_reserved,
            "measured_peak_allocated_gib": round(peak_allocated / BYTES_PER_GIB, 3),
            "measured_peak_reserved_gib": round(peak_reserved / BYTES_PER_GIB, 3),
        },
        "deterministic_pixels_verified": config.verify_determinism and config.runs > 1,
        "runs": measured_runs,
    }
    assert config.report is not None
    write_json_atomic(config.report, report)
    emitter.emit(
        "benchmark_completed",
        stage="complete",
        report=str(config.report),
        timing=report["timing"],
        memory=report["memory"],
        deterministic_pixels_verified=report["deterministic_pixels_verified"],
    )
    return report
