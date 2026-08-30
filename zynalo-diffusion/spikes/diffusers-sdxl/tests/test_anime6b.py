import os
import tempfile
import unittest
from pathlib import Path

from zynalo_sdxl_spike.anime6b import ANIME6B_SHA256, Anime6bUpscaler, validate_anime6b_model


class Anime6bTests(unittest.TestCase):
    def test_rejects_missing_and_untrusted_pth_files(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            with self.assertRaisesRegex(ValueError, "existing .pth"):
                validate_anime6b_model(root / "missing.pth")
            untrusted = root / "model.pth"
            untrusted.write_bytes(b"not trusted weights")
            with self.assertRaisesRegex(ValueError, "SHA-256 mismatch"):
                validate_anime6b_model(untrusted)

    @unittest.skipUnless(os.environ.get("ZYNALO_DIFFUSION_ANIME6B_MODEL"), "Set the Anime6B model path for the real weight-load test.")
    def test_official_weights_load_strictly_and_upscale_in_memory(self):
        import torch
        from PIL import Image

        path = Path(os.environ["ZYNALO_DIFFUSION_ANIME6B_MODEL"])
        self.assertEqual(validate_anime6b_model(path), ANIME6B_SHA256)
        upscaler = Anime6bUpscaler(path, torch, torch.device("cpu"), torch.float32, tile=8, tile_pad=2)
        try:
            result = upscaler.upscale(Image.new("RGB", (8, 8), (80, 120, 160)), 12, 16)
            self.assertEqual(result.size, (12, 16))
            self.assertEqual(result.mode, "RGB")
            self.assertTrue(upscaler.metadata()["weights_only_load"])
        finally:
            upscaler.close()


if __name__ == "__main__":
    unittest.main()
