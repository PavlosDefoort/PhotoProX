from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from zynalo_sdxl_spike.config import (
    ConfigurationError,
    InferenceConfig,
    default_report_path,
    output_path_for_run,
)


class InferenceConfigTests(unittest.TestCase):
    def make_config(self, directory: Path, **overrides: object) -> InferenceConfig:
        checkpoint = directory / "model.safetensors"
        checkpoint.write_bytes(b"test checkpoint")
        values: dict[str, object] = {
            "checkpoint": checkpoint,
            "prompt": "a quiet observatory",
            "output": directory / "result.png",
            **overrides,
        }
        return InferenceConfig(**values)  # type: ignore[arg-type]

    def test_validates_and_resolves_paths(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            validated = self.make_config(Path(temporary)).validate()
            self.assertTrue(validated.checkpoint.is_absolute())
            self.assertEqual(validated.report, default_report_path(validated.output))

    def test_rejects_invalid_checkpoint_dimensions_and_seed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            bad_checkpoint = directory / "model.ckpt"
            bad_checkpoint.write_bytes(b"not safetensors")
            config = InferenceConfig(
                checkpoint=bad_checkpoint,
                prompt="test",
                output=directory / "result.jpg",
                width=1001,
                seed=-1,
            )
            with self.assertRaises(ConfigurationError) as context:
                config.validate()
            message = str(context.exception)
            self.assertIn(".safetensors", message)
            self.assertIn("width", message)
            self.assertIn("unsigned 32-bit", message)
            self.assertIn(".png", message)

    def test_output_names_are_stable_for_benchmarks(self) -> None:
        output = Path("image.png")
        self.assertEqual(output_path_for_run(output, 1, 1), output)
        self.assertEqual(output_path_for_run(output, 2, 3), Path("image-run002.png"))


if __name__ == "__main__":
    unittest.main()
