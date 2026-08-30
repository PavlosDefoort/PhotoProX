from __future__ import annotations

import gc
import importlib.metadata
import os
import platform
import threading
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

from .anime6b import Anime6bUpscaler, validate_anime6b_model
from .metadata import build_png_metadata, pixel_sha256, save_png_with_metadata, sha256_file
from .runtime import _memory_metrics, _milliseconds, _runtime_details, configure_deterministic_environment

ProgressCallback = Callable[[str, float, float, int | None, int | None, str | None], None]
SDXL_CLIP_LAYER_SELECTION = "penultimate-hidden-state"


class HostGenerationCancelled(RuntimeError):
    pass


def diffusers_clip_skip_for_semantic_layer(selection: object) -> None:
    """Map semantic SDXL prompt conditioning to Diffusers without numeric off-by-two ambiguity."""
    if selection != SDXL_CLIP_LAYER_SELECTION:
        raise ValueError("Only the SDXL penultimate hidden state is supported for CLIP conditioning.")
    # Diffusers SDXL uses hidden_states[-2] when clip_skip is None. Passing 2 would select [-4].
    return None


def resolved_clip_layer_metadata(selection: object) -> dict[str, object]:
    diffusers_clip_skip_for_semantic_layer(selection)
    return {
        "semantic": SDXL_CLIP_LAYER_SELECTION,
        "hidden_state_index": -2,
        "diffusers_clip_skip": None,
        "webui_clip_skip_equivalent": 2,
        "prompt_hidden_state_encoders": ["text_encoder", "text_encoder_2"],
        "pooled_embedding": "text-encoder-2-final-pooled-output",
    }


def lanczos_resize(image: Any, width: int, height: int) -> Any:
    from PIL import Image

    resized = image.resize((width, height), resample=Image.Resampling.LANCZOS)
    if resized.size != (width, height):
        raise RuntimeError("Lanczos resize did not produce the requested final dimensions.")
    return resized


def process_ram_bytes() -> int | None:
    """Return a best-effort current process working-set sample without another dependency."""
    if os.name == "nt":
        try:
            import ctypes
            from ctypes import wintypes

            class ProcessMemoryCounters(ctypes.Structure):
                _fields_ = [
                    ("cb", wintypes.DWORD), ("PageFaultCount", wintypes.DWORD),
                    ("PeakWorkingSetSize", ctypes.c_size_t), ("WorkingSetSize", ctypes.c_size_t),
                    ("QuotaPeakPagedPoolUsage", ctypes.c_size_t), ("QuotaPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t), ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
                    ("PagefileUsage", ctypes.c_size_t), ("PeakPagefileUsage", ctypes.c_size_t),
                ]
            counters = ProcessMemoryCounters()
            counters.cb = ctypes.sizeof(counters)
            get_current_process = ctypes.windll.kernel32.GetCurrentProcess
            get_current_process.argtypes = []
            get_current_process.restype = wintypes.HANDLE
            get_process_memory_info = ctypes.windll.psapi.GetProcessMemoryInfo
            get_process_memory_info.argtypes = [wintypes.HANDLE, ctypes.POINTER(ProcessMemoryCounters), wintypes.DWORD]
            get_process_memory_info.restype = wintypes.BOOL
            handle = get_current_process()
            if get_process_memory_info(handle, ctypes.byref(counters), counters.cb):
                return int(counters.WorkingSetSize)
        except Exception:
            return None
    else:
        try:
            import resource
            maximum = int(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss)
            return maximum if platform.system() == "Darwin" else maximum * 1024
        except Exception:
            return None
    return None


def normalized_detail_failure(error: Exception, stage: str) -> dict[str, object]:
    detail_text = str(error)
    lowered = detail_text.lower()
    if "out of memory" in lowered:
        code = "GPU_OUT_OF_MEMORY"
    elif isinstance(error, MemoryError):
        code = "SYSTEM_MEMORY"
    elif stage == "detail-preparing":
        code = "PIPELINE_CONVERSION_FAILED"
    elif stage == "upscaling":
        code = "RESIZE_FAILED"
    elif stage == "saving":
        code = "ASSET_SAVE_FAILED"
    else:
        code = "DETAIL_PASS_FAILED"
    message = (
        "The larger detail pass ran out of GPU memory. Your base image was saved successfully. "
        "Try Standard instead of Strong, a smaller final size, or fewer second-pass steps."
        if code == "GPU_OUT_OF_MEMORY"
        else f"Detail Pass failed during {stage}. Your base image was saved successfully. {detail_text}"
    )
    return {"stage": stage, "code": code, "message": message[:4000], "retryable": True}


@dataclass(frozen=True, slots=True)
class BackendConfiguration:
    checkpoint: Path | None
    output_root: Path
    model_id: str | None
    model_name: str | None
    config_source: str | None
    device_index: int
    dtype: str
    offline: bool
    expected_sha256: str | None = None
    anime6b_model: Path | None = None


class PersistentSdxlBackend:
    """One resident SDXL checkpoint with a component-sharing img2img view."""

    def __init__(self, configuration: BackendConfiguration) -> None:
        self.configuration = configuration
        self.pipeline: Any = None
        self.detail_pipeline: Any = None
        self.torch: Any = None
        self.device: Any = None
        self.inference_dtype: Any = None
        self.anime6b_upscaler: Anime6bUpscaler | None = None
        self.last_upscaler_metadata: dict[str, object] = {"semantic": "lanczos"}
        self.runtime_details: dict[str, object] = {}
        self.checkpoint_sha256 = ""
        self.default_scheduler_class: Any = None
        self.default_scheduler_config: Any = None
        self.load_count = 0
        self.generation_count = 0
        self.component_reuse: dict[str, object] = {}

    def load(self, configuration: BackendConfiguration | None = None) -> dict[str, object]:
        if configuration is not None:
            self.unload()
            self.configuration = configuration
        if self.configuration.checkpoint is None or self.configuration.model_id is None or self.configuration.model_name is None:
            raise RuntimeError("No model is configured for loading.")
        configure_deterministic_environment()
        import torch
        from diffusers import StableDiffusionXLPipeline

        if not torch.cuda.is_available():
            raise RuntimeError("A CUDA-enabled PyTorch build and NVIDIA GPU are required.")
        if self.configuration.device_index >= torch.cuda.device_count():
            raise RuntimeError("Configured CUDA device is not available.")
        device = torch.device(f"cuda:{self.configuration.device_index}")
        if self.configuration.dtype == "bfloat16" and not torch.cuda.is_bf16_supported():
            raise RuntimeError("Configured CUDA device does not support bfloat16.")
        dtype = {"float16": torch.float16, "bfloat16": torch.bfloat16, "float32": torch.float32}[self.configuration.dtype]

        torch.cuda.set_device(device)
        torch.cuda.init()
        torch.use_deterministic_algorithms(True)
        torch.backends.cudnn.benchmark = False
        torch.backends.cudnn.deterministic = True
        torch.backends.cuda.matmul.allow_tf32 = False
        torch.backends.cudnn.allow_tf32 = False
        torch.set_grad_enabled(False)
        torch.cuda.empty_cache()
        torch.cuda.reset_peak_memory_stats(device)

        load_started_ns = time.perf_counter_ns()
        self.checkpoint_sha256 = self.configuration.expected_sha256 or sha256_file(self.configuration.checkpoint)
        load_arguments: dict[str, object] = {"torch_dtype": dtype, "use_safetensors": True, "local_files_only": self.configuration.offline}
        if self.configuration.config_source:
            possible_path = Path(self.configuration.config_source).expanduser()
            load_arguments["config"] = str(possible_path.resolve()) if possible_path.exists() else self.configuration.config_source
        pipeline = StableDiffusionXLPipeline.from_single_file(str(self.configuration.checkpoint), **load_arguments)
        pipeline.set_progress_bar_config(disable=True)
        pipeline.to(device)
        torch.cuda.synchronize(device)

        self.pipeline = pipeline
        self.default_scheduler_class = pipeline.scheduler.__class__
        self.default_scheduler_config = pipeline.scheduler.config
        self.detail_pipeline = None
        self.component_reuse = {}
        self.torch = torch
        self.device = device
        self.inference_dtype = dtype
        self.runtime_details = _runtime_details(torch, device)
        self.load_count += 1
        return {"elapsedMs": _milliseconds(load_started_ns), "memory": _memory_metrics(torch, device, 0), "checkpointSha256": self.checkpoint_sha256}

    def unload(self) -> None:
        anime6b_upscaler = self.anime6b_upscaler
        detail_pipeline = self.detail_pipeline
        pipeline = self.pipeline
        self.detail_pipeline = None
        self.pipeline = None
        self.anime6b_upscaler = None
        self.last_upscaler_metadata = {"semantic": "lanczos"}
        self.component_reuse = {}
        self.runtime_details = {}
        self.checkpoint_sha256 = ""
        self.default_scheduler_class = None
        self.default_scheduler_config = None
        if detail_pipeline is not None:
            del detail_pipeline
        if anime6b_upscaler is not None:
            anime6b_upscaler.close()
        if pipeline is not None:
            del pipeline
        gc.collect()
        if self.torch is not None and self.torch.cuda.is_available():
            self.torch.cuda.empty_cache()
            self.torch.cuda.ipc_collect()

    def _detail_execution_pipeline(self) -> Any:
        if self.pipeline is None:
            raise RuntimeError("Model is not loaded.")
        if self.detail_pipeline is not None:
            return self.detail_pipeline
        try:
            from diffusers import AutoPipelineForImage2Image

            detail = AutoPipelineForImage2Image.from_pipe(self.pipeline)
            # Schedulers contain mutable per-run timesteps. Clone only this lightweight configuration;
            # every learned module remains shared by object identity.
            detail.scheduler = self.pipeline.scheduler.__class__.from_config(self.pipeline.scheduler.config)
            detail.set_progress_bar_config(disable=True)
        except Exception as error:
            raise RuntimeError(f"Could not construct the component-sharing SDXL img2img pipeline: {error}") from error
        shared_names: list[str] = []
        for name in ("unet", "vae", "text_encoder", "text_encoder_2"):
            base_component = getattr(self.pipeline, name, None)
            detail_component = getattr(detail, name, None)
            if base_component is not None:
                if detail_component is not base_component:
                    raise RuntimeError(f"SDXL img2img component reuse failed for {name}.")
                shared_names.append(name)
        self.component_reuse = {
            "method": "AutoPipelineForImage2Image.from_pipe",
            "sharedComponents": shared_names,
            "weightsSharedByIdentity": True,
            "checkpointLoadCount": self.load_count,
        }
        self.detail_pipeline = detail
        return detail

    def _scheduler_for_selection(self, selection: object) -> Any:
        if self.pipeline is None:
            raise RuntimeError("Model is not loaded.")
        if self.default_scheduler_class is None:
            self.default_scheduler_class = self.pipeline.scheduler.__class__
            self.default_scheduler_config = self.pipeline.scheduler.config
        if selection == "checkpoint-default":
            scheduler_class = self.default_scheduler_class
        elif selection == "euler-ancestral":
            from diffusers import EulerAncestralDiscreteScheduler

            scheduler_class = EulerAncestralDiscreteScheduler
        else:
            raise ValueError("Unsupported sampler selection.")
        return scheduler_class.from_config(self.default_scheduler_config)

    def _configure_schedulers(self, selection: object) -> None:
        if self.pipeline is None:
            raise RuntimeError("Model is not loaded.")
        self.pipeline.scheduler = self._scheduler_for_selection(selection)
        if self.detail_pipeline is not None:
            self.detail_pipeline.scheduler = self._scheduler_for_selection(selection)

    def runtime_diagnostics(self) -> dict[str, object]:
        packages: dict[str, str | None] = {}
        for package in ("torch", "diffusers", "transformers", "safetensors"):
            try:
                packages[package] = importlib.metadata.version(package)
            except importlib.metadata.PackageNotFoundError:
                packages[package] = None
        result: dict[str, object] = {
            "pythonVersion": platform.python_version(), "packages": packages, "cudaAvailable": False,
            "cudaRuntime": None, "gpuName": None, "computeCapability": None, "totalVramMb": None,
            "allocatedMb": None, "reservedMb": None, "driver": None,
        }
        try:
            import torch
            available = bool(torch.cuda.is_available())
            result["cudaAvailable"] = available
            result["cudaRuntime"] = torch.version.cuda
            if available:
                index = self.configuration.device_index
                properties = torch.cuda.get_device_properties(index)
                result.update({
                    "gpuName": properties.name, "computeCapability": f"{properties.major}.{properties.minor}",
                    "totalVramMb": round(properties.total_memory / (1024 * 1024)),
                    "allocatedMb": round(torch.cuda.memory_allocated(index) / (1024 * 1024)),
                    "reservedMb": round(torch.cuda.memory_reserved(index) / (1024 * 1024)), "driver": None,
                })
        except Exception:
            pass
        return result

    def hardware(self) -> dict[str, object]:
        upscalers = ["lanczos"]
        if self.configuration.anime6b_model is not None:
            validate_anime6b_model(self.configuration.anime6b_model)
            upscalers.append("realesrgan-anime6b")
        capabilities = {"detailPass": True, "detailPassUpscalers": upscalers}
        if not self.runtime_details:
            diagnostics = self.runtime_diagnostics()
            if not diagnostics["cudaAvailable"]:
                raise RuntimeError("CUDA is unavailable in PyTorch.")
            return {"backend": "cuda", "deviceName": diagnostics["gpuName"], "dedicatedMemoryMb": diagnostics["totalVramMb"], "capabilities": capabilities}
        gpu = self.runtime_details["gpu"]
        assert isinstance(gpu, dict)
        return {"backend": "cuda", "deviceName": str(gpu["name"]), "dedicatedMemoryMb": round(int(gpu["total_memory_bytes"]) / (1024 * 1024)), "capabilities": capabilities}

    def models(self) -> list[dict[str, object]]:
        if self.pipeline is None or self.configuration.model_id is None:
            return []
        return [{"id": self.configuration.model_id, "name": self.configuration.model_name, "family": "Diffusers SDXL", "installed": True}]

    def _begin_stage(self) -> int:
        assert self.torch is not None
        self.torch.cuda.synchronize(self.device)
        self.torch.cuda.reset_peak_memory_stats(self.device)
        return time.perf_counter_ns()

    def _finish_stage(self, name: str, started_ns: int) -> dict[str, object]:
        assert self.torch is not None
        self.torch.cuda.synchronize(self.device)
        metric: dict[str, object] = {
            "stage": name,
            "durationMs": _milliseconds(started_ns),
            "peakAllocatedVram": int(self.torch.cuda.max_memory_allocated(self.device)),
            "peakReservedVram": int(self.torch.cuda.max_memory_reserved(self.device)),
        }
        ram = process_ram_bytes()
        if ram is not None:
            metric["processRamBytes"] = ram
        return metric

    def _asset(self, image: Any, metadata: dict[str, object]) -> tuple[dict[str, object], Path]:
        asset_id = uuid.uuid4().hex
        relative_path = f"{asset_id}.png"
        output_path = self.configuration.output_root / relative_path
        temporary_path = output_path.with_suffix(".tmp")
        try:
            save_png_with_metadata(image, temporary_path, metadata)
            temporary_path.replace(output_path)
        except Exception:
            temporary_path.unlink(missing_ok=True)
            raise
        return {"id": asset_id, "relativePath": relative_path, "mimeType": "image/png", "width": image.size[0], "height": image.size[1]}, output_path

    @staticmethod
    def _rewrite_asset_metadata(image: Any, output_path: Path, metadata: dict[str, object]) -> None:
        temporary_path = output_path.with_suffix(".tmp")
        try:
            save_png_with_metadata(image, temporary_path, metadata)
            temporary_path.replace(output_path)
        finally:
            temporary_path.unlink(missing_ok=True)

    def _metadata(
        self, request: dict[str, object], stages: list[dict[str, object]], status: str,
        base_hash: str, final_hash: str | None, total_ms: float, failure: dict[str, object] | None,
    ) -> dict[str, object]:
        detail = request["detailPass"]
        assert isinstance(detail, dict)
        detail_prompt = request["prompt"] if not detail.get("enabled") or detail.get("promptMode") == "inherit" else detail.get("prompt", "")
        detail_negative = request["negativePrompt"] if not detail.get("enabled") or detail.get("negativePromptMode") == "inherit" else detail.get("negativePrompt", "")
        parameters = {
            "prompt": request["prompt"], "negative_prompt": request["negativePrompt"], "model_id": request["modelId"],
            "seed": request["seed"], "base_seed": request["seed"], "base_width": request["width"], "base_height": request["height"],
            "base_steps": request["steps"], "base_guidance": request["guidance"], "detail_pass": detail,
            "detail_prompt": detail_prompt, "detail_negative_prompt": detail_negative,
            "detail_seed_derivation": "zynalo-detail-seed-v1" if detail.get("enabled") and detail.get("seedMode") == "derived" else "explicit",
            "checkpoint_filename": self.configuration.checkpoint.name if self.configuration.checkpoint is not None else None,
            "dtype": self.configuration.dtype, "scheduler_base": self.pipeline.scheduler.__class__.__name__ if self.pipeline is not None else None,
            "scheduler_detail": self.detail_pipeline.scheduler.__class__.__name__ if self.detail_pipeline is not None else None,
            "sampler_selection": {
                "semantic": request["sampler"],
                "base_scheduler": self.pipeline.scheduler.__class__.__name__ if self.pipeline is not None else None,
                "detail_scheduler": self.detail_pipeline.scheduler.__class__.__name__ if self.detail_pipeline is not None and detail.get("enabled") else None,
                "passes_match": not detail.get("enabled") or (
                    self.pipeline is not None and self.detail_pipeline is not None and
                    self.pipeline.scheduler.__class__ is self.detail_pipeline.scheduler.__class__
                ),
            },
            "component_reuse": self.component_reuse,
            "detail_upscaler": self.last_upscaler_metadata if detail.get("enabled") else None,
            "clip_layer_selection": {
                "base": resolved_clip_layer_metadata(request["clipLayerSelection"]),
                "detail": resolved_clip_layer_metadata(request["clipLayerSelection"]) if detail.get("enabled") else None,
                "passes_match": True,
            },
        }
        peaks = [int(stage.get("peakAllocatedVram", 0)) for stage in stages]
        reserves = [int(stage.get("peakReservedVram", 0)) for stage in stages]
        return build_png_metadata(
            parameters=parameters, checkpoint_sha256=self.checkpoint_sha256, runtime=self.runtime_details,
            timing={"total_ms": total_ms, "stages": stages},
            memory={"peak_allocated_bytes": max(peaks, default=0), "peak_reserved_bytes": max(reserves, default=0), "stage_peaks_are_reset_absolute_process_values": True},
            run_index=self.generation_count + 1, pixels_sha256=final_hash or base_hash,
            completion={"status": status, "base_pixel_sha256": base_hash, "final_pixel_sha256": final_hash, "failure": failure},
        )

    def generate(self, job_id: str, request: dict[str, object], cancel_event: threading.Event, progress: ProgressCallback) -> dict[str, object]:
        if self.pipeline is None or self.torch is None:
            raise RuntimeError("Model is not loaded.")
        self._configure_schedulers(request["sampler"])
        torch = self.torch
        detail = request["detailPass"]
        assert isinstance(detail, dict)
        detail_enabled = bool(detail["enabled"])
        base_seed = int(request["seed"])
        detail_seed = int(detail["seed"]) if detail_enabled else None
        base_steps = int(request["steps"])
        detail_configured_steps = int(detail["steps"]) if detail_enabled else 0
        detail_effective_steps = max(1, int(detail_configured_steps * float(detail.get("strength", 0)))) if detail_enabled else 0
        clip_skip = diffusers_clip_skip_for_semantic_layer(request["clipLayerSelection"])
        denoise_steps = base_steps + detail_effective_steps
        base_overall_end = 0.03 + (base_steps / denoise_steps) * 0.84
        stages: list[dict[str, object]] = []
        started_ns = time.perf_counter_ns()
        base_asset: dict[str, object] | None = None
        base_path: Path | None = None
        base_image: Any = None
        base_hash = ""
        current_stage = "queued"
        progress("queued", 0.0, 0.0, None, None, None)

        def cancelled() -> None:
            if cancel_event.is_set():
                raise HostGenerationCancelled(f"Generation {job_id} was cancelled.")

        torch.manual_seed(base_seed)
        torch.cuda.manual_seed_all(base_seed)
        base_generator = torch.Generator(device=self.device).manual_seed(base_seed)
        progress("encoding-prompt", 1.0, 0.03, None, None, "base")
        stage_started = self._begin_stage()
        base_completed_steps = 0

        def base_callback(pipeline: Any, step_index: int, _timestep: Any, callback_kwargs: dict[str, Any]) -> dict[str, Any]:
            nonlocal base_completed_steps
            completed = step_index + 1
            base_completed_steps = completed
            if cancel_event.is_set():
                pipeline._interrupt = True
            overall = 0.03 + (completed / denoise_steps) * 0.84
            progress("base-generating", completed / base_steps, overall, completed, base_steps, "base")
            return callback_kwargs

        try:
            current_stage = "base-generating"
            with torch.inference_mode():
                output = self.pipeline(
                    prompt=str(request["prompt"]), negative_prompt=str(request["negativePrompt"]) or None,
                    width=int(request["width"]), height=int(request["height"]), num_inference_steps=base_steps,
                    guidance_scale=float(request["guidance"]), generator=base_generator, num_images_per_prompt=1,
                    clip_skip=clip_skip,
                    callback_on_step_end=base_callback, callback_on_step_end_tensor_inputs=[],
                )
            self.pipeline._interrupt = False
            if cancel_event.is_set() and base_completed_steps < base_steps:
                cancelled()
            stages.append(self._finish_stage("base", stage_started))
            current_stage = "base-decoding"
            progress("base-decoding", 1.0, base_overall_end, None, None, "base")
            decode_started = self._begin_stage()
            base_image = output.images[0].convert("RGB")
            base_hash = pixel_sha256(base_image)
            stages.append(self._finish_stage("decode", decode_started))
            save_started = self._begin_stage()
            preliminary = self._metadata(request, stages, "base-only", base_hash, None, _milliseconds(started_ns), None)
            base_asset, base_path = self._asset(base_image, preliminary)
            stages.append(self._finish_stage("save", save_started))
        finally:
            if self.pipeline is not None:
                self.pipeline._interrupt = False

        assert base_asset is not None and base_path is not None
        seeds: dict[str, object] = {"baseSeed": base_seed, "derivation": "explicit"}
        if detail_enabled:
            seeds["detailSeed"] = detail_seed
            seeds["derivation"] = "zynalo-detail-seed-v1" if detail["seedMode"] == "derived" else "explicit"

        def partial(status: str, failure: dict[str, object]) -> dict[str, object]:
            total_ms = _milliseconds(started_ns)
            metadata = self._metadata(request, stages, status, base_hash, None, total_ms, failure)
            self._rewrite_asset_metadata(base_image, base_path, metadata)
            self.generation_count += 1
            return {
                "jobId": job_id, "seed": base_seed, "durationMs": total_ms, "status": status,
                "output": base_asset, "baseAsset": base_asset, "stages": stages, "seeds": seeds,
                "parameters": request, "basePixelSha256": base_hash, "failure": failure,
            }

        if not detail_enabled:
            progress("saving", 1.0, 0.98, None, None, None)
            completed_metadata = self._metadata(request, stages, "completed", base_hash, None, _milliseconds(started_ns), None)
            self._rewrite_asset_metadata(base_image, base_path, completed_metadata)
            progress("completed", 1.0, 1.0, None, None, None)
            total_ms = _milliseconds(started_ns)
            self.generation_count += 1
            return {
                "jobId": job_id, "seed": base_seed, "durationMs": total_ms, "status": "completed",
                "output": base_asset, "baseAsset": base_asset, "stages": stages, "seeds": seeds,
                "parameters": request, "basePixelSha256": base_hash,
            }

        if cancel_event.is_set():
            return partial("cancelled", {
                "stage": "base-decoding", "code": "CANCELLED",
                "message": "Detail Pass cancelled. The base image is still available.", "retryable": True,
            })

        final_asset: dict[str, object] | None = None
        final_hash: str | None = None
        final_path: Path | None = None
        try:
            cancelled()
            current_stage = "upscaling"
            progress("upscaling", 0.0, base_overall_end, None, None, None)
            upscale_started = self._begin_stage()
            if detail["upscaler"] == "lanczos":
                upscaled = lanczos_resize(base_image, int(detail["targetWidth"]), int(detail["targetHeight"]))
                self.last_upscaler_metadata = {"semantic": "lanczos", "exact_target_dimensions": True}
            elif detail["upscaler"] == "realesrgan-anime6b":
                if self.configuration.anime6b_model is None:
                    raise RuntimeError("R-ESRGAN Anime6B is not configured. Add anime6bModel to engine-config.json.")
                if self.anime6b_upscaler is None:
                    assert self.torch is not None and self.inference_dtype is not None
                    self.anime6b_upscaler = Anime6bUpscaler(
                        self.configuration.anime6b_model, self.torch, self.device, self.inference_dtype
                    )
                upscaled = self.anime6b_upscaler.upscale(
                    base_image, int(detail["targetWidth"]), int(detail["targetHeight"])
                )
                self.last_upscaler_metadata = {
                    **self.anime6b_upscaler.metadata(), "exact_target_dimensions": True,
                    "requested_scale": detail["scale"],
                }
            else:
                raise RuntimeError("Unsupported Detail Pass upscaler.")
            stages.append(self._finish_stage("upscale", upscale_started))
            progress("upscaling", 1.0, base_overall_end + 0.015, None, None, None)
            cancelled()

            current_stage = "detail-preparing"
            progress("detail-preparing", 0.0, base_overall_end + 0.015, None, None, "detail")
            detail_pipeline = self._detail_execution_pipeline()
            progress("detail-preparing", 1.0, base_overall_end + 0.03, None, None, "detail")
            cancelled()
            assert detail_seed is not None
            detail_generator = torch.Generator(device=self.device).manual_seed(detail_seed)
            detail_prompt = str(request["prompt"]) if detail["promptMode"] == "inherit" else str(detail["prompt"])
            detail_negative = str(request["negativePrompt"]) if detail["negativePromptMode"] == "inherit" else str(detail["negativePrompt"])
            detail_started = self._begin_stage()

            def detail_callback(pipeline: Any, step_index: int, _timestep: Any, callback_kwargs: dict[str, Any]) -> dict[str, Any]:
                completed = step_index + 1
                if cancel_event.is_set():
                    pipeline._interrupt = True
                stage_value = min(1.0, completed / detail_effective_steps)
                detail_start = base_overall_end + 0.03
                overall = detail_start + stage_value * (0.94 - detail_start)
                progress("detail-generating", stage_value, overall, completed, detail_effective_steps, "detail")
                return callback_kwargs

            current_stage = "detail-generating"
            with torch.inference_mode():
                detail_output = detail_pipeline(
                    prompt=detail_prompt, negative_prompt=detail_negative or None, image=upscaled,
                    strength=float(detail["strength"]), num_inference_steps=detail_configured_steps,
                    guidance_scale=float(request["guidance"]), generator=detail_generator, num_images_per_prompt=1,
                    clip_skip=clip_skip,
                    callback_on_step_end=detail_callback, callback_on_step_end_tensor_inputs=[],
                )
            detail_pipeline._interrupt = False
            cancelled()
            stages.append(self._finish_stage("detail", detail_started))
            current_stage = "final-decoding"
            progress("final-decoding", 1.0, 0.96, None, None, "detail")
            decode_started = self._begin_stage()
            final_image = detail_output.images[0].convert("RGB")
            if final_image.size != (int(detail["targetWidth"]), int(detail["targetHeight"])):
                raise RuntimeError("SDXL img2img returned unexpected final dimensions.")
            final_hash = pixel_sha256(final_image)
            stages.append(self._finish_stage("decode", decode_started))
            cancelled()
            current_stage = "saving"
            progress("saving", 0.0, 0.97, None, None, None)
            save_started = self._begin_stage()
            final_metadata = self._metadata(request, stages, "completed", base_hash, final_hash, _milliseconds(started_ns), None)
            final_asset, final_path = self._asset(final_image, final_metadata)
            stages.append(self._finish_stage("save", save_started))
            completed_metadata = self._metadata(request, stages, "completed", base_hash, final_hash, _milliseconds(started_ns), None)
            self._rewrite_asset_metadata(final_image, final_path, completed_metadata)
            self._rewrite_asset_metadata(base_image, base_path, completed_metadata)
            progress("saving", 1.0, 0.99, None, None, None)
            progress("completed", 1.0, 1.0, None, None, None)
        except HostGenerationCancelled:
            failure = {"stage": current_stage, "code": "CANCELLED", "message": "Detail Pass cancelled. The base image is still available.", "retryable": True}
            return partial("cancelled", failure)
        except Exception as error:
            if final_path is not None:
                final_path.unlink(missing_ok=True)
            return partial("base-only", normalized_detail_failure(error, current_stage))
        finally:
            if self.detail_pipeline is not None:
                self.detail_pipeline._interrupt = False

        assert final_asset is not None and final_hash is not None
        total_ms = _milliseconds(started_ns)
        self.generation_count += 1
        return {
            "jobId": job_id, "seed": base_seed, "durationMs": total_ms, "status": "completed",
            "output": final_asset, "baseAsset": base_asset, "finalAsset": final_asset, "stages": stages,
            "seeds": seeds, "parameters": request, "basePixelSha256": base_hash, "finalPixelSha256": final_hash,
        }
