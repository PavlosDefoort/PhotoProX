import sys
import tempfile
import threading
import types
import unittest
from contextlib import nullcontext
from pathlib import Path
from unittest.mock import patch

from zynalo_sdxl_spike.host_backend import BackendConfiguration, PersistentSdxlBackend, diffusers_clip_skip_for_semantic_layer, lanczos_resize, normalized_detail_failure, process_ram_bytes, resolved_clip_layer_metadata


class FakeScheduler:
    def __init__(self, config=None):
        self.config = config or {"prediction_type": "epsilon"}

    @classmethod
    def from_config(cls, config):
        return cls(dict(config))


class FakeEulerAncestralScheduler(FakeScheduler):
    pass


class FakePipeline:
    def __init__(self):
        self.unet = object()
        self.vae = object()
        self.text_encoder = object()
        self.text_encoder_2 = object()
        self.scheduler = FakeScheduler()

    def set_progress_bar_config(self, **_kwargs):
        pass


class FakeAutoPipeline:
    calls = 0

    @classmethod
    def from_pipe(cls, source):
        cls.calls += 1
        result = FakePipeline()
        for name in ("unet", "vae", "text_encoder", "text_encoder_2", "scheduler"):
            setattr(result, name, getattr(source, name))
        return result


class FakeCuda:
    @staticmethod
    def synchronize(_device): pass
    @staticmethod
    def reset_peak_memory_stats(_device): pass
    @staticmethod
    def max_memory_allocated(_device): return 0
    @staticmethod
    def max_memory_reserved(_device): return 0
    @staticmethod
    def manual_seed_all(_seed): pass


class FakeGenerator:
    def manual_seed(self, _seed): return self


class FakeTorch:
    cuda = FakeCuda()
    @staticmethod
    def manual_seed(_seed): pass
    @staticmethod
    def Generator(device=None): return FakeGenerator()
    @staticmethod
    def inference_mode(): return nullcontext()


class ExecutableFakePipeline(FakePipeline):
    def __init__(self):
        super().__init__()
        self.calls = []
        self._interrupt = False

    def __call__(self, **kwargs):
        from PIL import Image

        self.calls.append(kwargs)
        callback = kwargs["callback_on_step_end"]
        configured = int(kwargs["num_inference_steps"])
        effective = max(1, int(configured * float(kwargs.get("strength", 1))))
        for step in range(effective):
            callback(self, step, None, {})
        if "image" in kwargs:
            image = kwargs["image"].copy()
        else:
            image = Image.new("RGB", (int(kwargs["width"]), int(kwargs["height"])), (20, 40, 60))
        return types.SimpleNamespace(images=[image])


class ExecutableAutoPipeline:
    last = None

    @classmethod
    def from_pipe(cls, source):
        result = ExecutableFakePipeline()
        for name in ("unet", "vae", "text_encoder", "text_encoder_2", "scheduler"):
            setattr(result, name, getattr(source, name))
        cls.last = result
        return result


class HostBackendTests(unittest.TestCase):
    def test_base_and_detail_calls_use_the_same_semantic_penultimate_layer(self):
        with tempfile.TemporaryDirectory() as temporary:
            backend = PersistentSdxlBackend(BackendConfiguration(
                checkpoint=Path(temporary) / "model.safetensors", output_root=Path(temporary),
                model_id="model", model_name="Model", config_source=None, device_index=0,
                dtype="float16", offline=True,
            ))
            backend.pipeline = ExecutableFakePipeline()
            backend.torch = FakeTorch()
            backend.device = "cuda:0"
            backend.checkpoint_sha256 = "a" * 64
            backend.load_count = 1
            request = {
                "prompt": "test", "negativePrompt": "", "modelId": "model", "seed": 42,
                "width": 64, "height": 64, "steps": 2, "guidance": 5.0,
                "sampler": "checkpoint-default",
                "clipLayerSelection": "penultimate-hidden-state",
                "detailPass": {
                    "enabled": True, "upscaler": "lanczos", "scale": 1.5,
                    "targetWidth": 96, "targetHeight": 96, "lockAspectRatio": True,
                    "strength": 0.3, "steps": 12, "promptMode": "inherit",
                    "negativePromptMode": "inherit", "seedMode": "derived", "seed": 2654435811,
                },
            }
            with patch.dict(sys.modules, {"diffusers": types.SimpleNamespace(AutoPipelineForImage2Image=ExecutableAutoPipeline)}):
                result = backend.generate("py-test", request, threading.Event(), lambda *_args: None)
            self.assertEqual(result["status"], "completed")
            self.assertIsNone(backend.pipeline.calls[0]["clip_skip"])
            self.assertIsNotNone(ExecutableAutoPipeline.last)
            self.assertIsNone(ExecutableAutoPipeline.last.calls[0]["clip_skip"])

    def test_euler_ancestral_scheduler_is_cloned_for_both_passes(self):
        with tempfile.TemporaryDirectory() as temporary:
            backend = PersistentSdxlBackend(BackendConfiguration(
                checkpoint=Path(temporary) / "model.safetensors", output_root=Path(temporary),
                model_id="model", model_name="Model", config_source=None, device_index=0,
                dtype="float16", offline=True,
            ))
            backend.pipeline = FakePipeline()
            backend.detail_pipeline = FakePipeline()
            backend.default_scheduler_class = FakeScheduler
            backend.default_scheduler_config = backend.pipeline.scheduler.config
            module = types.SimpleNamespace(EulerAncestralDiscreteScheduler=FakeEulerAncestralScheduler)
            with patch.dict(sys.modules, {"diffusers": module}):
                backend._configure_schedulers("euler-ancestral")
            self.assertIsInstance(backend.pipeline.scheduler, FakeEulerAncestralScheduler)
            self.assertIsInstance(backend.detail_pipeline.scheduler, FakeEulerAncestralScheduler)
            self.assertIsNot(backend.pipeline.scheduler, backend.detail_pipeline.scheduler)

    def test_semantic_penultimate_layer_maps_to_diffusers_default_without_off_by_two(self):
        self.assertIsNone(diffusers_clip_skip_for_semantic_layer("penultimate-hidden-state"))
        self.assertEqual(resolved_clip_layer_metadata("penultimate-hidden-state"), {
            "semantic": "penultimate-hidden-state", "hidden_state_index": -2,
            "diffusers_clip_skip": None, "webui_clip_skip_equivalent": 2,
            "prompt_hidden_state_encoders": ["text_encoder", "text_encoder_2"],
            "pooled_embedding": "text-encoder-2-final-pooled-output",
        })
        with self.assertRaises(ValueError):
            diffusers_clip_skip_for_semantic_layer(2)

    def test_detail_failures_are_stage_specific_and_actionable(self):
        self.assertEqual(normalized_detail_failure(RuntimeError("CUDA out of memory"), "detail-generating")["code"], "GPU_OUT_OF_MEMORY")
        self.assertIn("smaller final size", normalized_detail_failure(RuntimeError("CUDA out of memory"), "detail-generating")["message"])
        self.assertEqual(normalized_detail_failure(MemoryError("allocation failed"), "detail-generating")["code"], "SYSTEM_MEMORY")
        self.assertEqual(normalized_detail_failure(RuntimeError("bad conversion"), "detail-preparing")["code"], "PIPELINE_CONVERSION_FAILED")
        self.assertEqual(normalized_detail_failure(RuntimeError("resize failed"), "upscaling")["code"], "RESIZE_FAILED")
        self.assertEqual(normalized_detail_failure(RuntimeError("disk full"), "saving")["code"], "ASSET_SAVE_FAILED")

    def test_process_ram_sample_is_available(self):
        sample = process_ram_bytes()
        self.assertIsNotNone(sample)
        self.assertGreater(sample, 0)

    def test_lanczos_resize_uses_exact_dimensions(self):
        class FakeImage:
            def __init__(self):
                self.size = (512, 512)
                self.call = None

            def resize(self, size, resample):
                self.call = (size, resample)
                result = FakeImage()
                result.size = size
                return result

        source = FakeImage()
        pil = types.SimpleNamespace(Image=types.SimpleNamespace(Resampling=types.SimpleNamespace(LANCZOS="lanczos")))
        with patch.dict(sys.modules, {"PIL": pil}):
            result = lanczos_resize(source, 768, 1024)
        self.assertEqual(result.size, (768, 1024))
        self.assertEqual(source.call, ((768, 1024), "lanczos"))

    def test_img2img_view_reuses_every_learned_component_and_is_cached(self):
        with tempfile.TemporaryDirectory() as temporary:
            backend = PersistentSdxlBackend(BackendConfiguration(
                checkpoint=Path(temporary) / "model.safetensors", output_root=Path(temporary),
                model_id="model", model_name="Model", config_source=None, device_index=0,
                dtype="float16", offline=True,
            ))
            backend.pipeline = FakePipeline()
            backend.load_count = 1
            module = types.SimpleNamespace(AutoPipelineForImage2Image=FakeAutoPipeline)
            FakeAutoPipeline.calls = 0
            with patch.dict(sys.modules, {"diffusers": module}):
                detail = backend._detail_execution_pipeline()
                self.assertIs(detail.unet, backend.pipeline.unet)
                self.assertIs(detail.vae, backend.pipeline.vae)
                self.assertIs(detail.text_encoder, backend.pipeline.text_encoder)
                self.assertIs(detail.text_encoder_2, backend.pipeline.text_encoder_2)
                self.assertIsNot(detail.scheduler, backend.pipeline.scheduler)
                self.assertIs(backend._detail_execution_pipeline(), detail)
            self.assertEqual(FakeAutoPipeline.calls, 1)
            self.assertTrue(backend.component_reuse["weightsSharedByIdentity"])
            self.assertEqual(backend.component_reuse["checkpointLoadCount"], 1)
            backend.unload()
            self.assertIsNone(backend.pipeline)
            self.assertIsNone(backend.detail_pipeline)


if __name__ == "__main__":
    unittest.main()
