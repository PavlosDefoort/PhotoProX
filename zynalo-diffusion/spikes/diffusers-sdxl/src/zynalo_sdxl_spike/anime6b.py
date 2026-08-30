from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

ANIME6B_FILENAME = "RealESRGAN_x4plus_anime_6B.pth"
ANIME6B_SHA256 = "f872d837d3c90ed2e05227bed711af5671a6fd1c9f7d7e91c911a61f155e99da"
ANIME6B_NATIVE_SCALE = 4


def validate_anime6b_model(path: Path) -> str:
    resolved = path.expanduser().resolve()
    if not resolved.is_file() or resolved.suffix.lower() != ".pth":
        raise ValueError("Anime6B model must be an existing .pth file.")
    digest = hashlib.sha256()
    with resolved.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    actual = digest.hexdigest()
    if actual != ANIME6B_SHA256:
        raise ValueError(
            f"Anime6B SHA-256 mismatch: expected {ANIME6B_SHA256}, received {actual}."
        )
    return actual


def _architecture(torch: Any) -> Any:
    nn = torch.nn
    functional = torch.nn.functional

    class ResidualDenseBlock(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.conv1 = nn.Conv2d(64, 32, 3, 1, 1)
            self.conv2 = nn.Conv2d(96, 32, 3, 1, 1)
            self.conv3 = nn.Conv2d(128, 32, 3, 1, 1)
            self.conv4 = nn.Conv2d(160, 32, 3, 1, 1)
            self.conv5 = nn.Conv2d(192, 64, 3, 1, 1)
            self.lrelu = nn.LeakyReLU(negative_slope=0.2, inplace=True)

        def forward(self, value: Any) -> Any:
            value1 = self.lrelu(self.conv1(value))
            value2 = self.lrelu(self.conv2(torch.cat((value, value1), 1)))
            value3 = self.lrelu(self.conv3(torch.cat((value, value1, value2), 1)))
            value4 = self.lrelu(self.conv4(torch.cat((value, value1, value2, value3), 1)))
            value5 = self.conv5(torch.cat((value, value1, value2, value3, value4), 1))
            return value5 * 0.2 + value

    class RRDB(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.rdb1 = ResidualDenseBlock()
            self.rdb2 = ResidualDenseBlock()
            self.rdb3 = ResidualDenseBlock()

        def forward(self, value: Any) -> Any:
            return self.rdb3(self.rdb2(self.rdb1(value))) * 0.2 + value

    class RRDBNet(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.conv_first = nn.Conv2d(3, 64, 3, 1, 1)
            self.body = nn.Sequential(*(RRDB() for _ in range(6)))
            self.conv_body = nn.Conv2d(64, 64, 3, 1, 1)
            self.conv_up1 = nn.Conv2d(64, 64, 3, 1, 1)
            self.conv_up2 = nn.Conv2d(64, 64, 3, 1, 1)
            self.conv_hr = nn.Conv2d(64, 64, 3, 1, 1)
            self.conv_last = nn.Conv2d(64, 3, 3, 1, 1)
            self.lrelu = nn.LeakyReLU(negative_slope=0.2, inplace=True)

        def forward(self, value: Any) -> Any:
            feature = self.conv_first(value)
            feature = feature + self.conv_body(self.body(feature))
            feature = self.lrelu(self.conv_up1(functional.interpolate(feature, scale_factor=2, mode="nearest")))
            feature = self.lrelu(self.conv_up2(functional.interpolate(feature, scale_factor=2, mode="nearest")))
            return self.conv_last(self.lrelu(self.conv_hr(feature)))

    return RRDBNet()


class Anime6bUpscaler:
    """Strict, in-memory RealESRGAN x4+ Anime6B inference without unsafe pickle objects."""

    def __init__(self, model_path: Path, torch: Any, device: Any, dtype: Any, tile: int = 256, tile_pad: int = 10) -> None:
        self.model_path = model_path.expanduser().resolve()
        self.sha256 = validate_anime6b_model(self.model_path)
        self.torch = torch
        self.device = device
        self.dtype = dtype
        self.tile = tile
        self.tile_pad = tile_pad
        model = _architecture(torch)
        checkpoint = torch.load(str(self.model_path), map_location="cpu", weights_only=True)
        if not isinstance(checkpoint, dict):
            raise ValueError("Anime6B checkpoint must contain a weights dictionary.")
        weights = checkpoint.get("params_ema", checkpoint.get("params", checkpoint))
        if not isinstance(weights, dict) or not all(isinstance(key, str) for key in weights):
            raise ValueError("Anime6B checkpoint does not contain a valid state dictionary.")
        model.load_state_dict(weights, strict=True)
        model.eval().to(device=device, dtype=dtype)
        self.model = model

    def close(self) -> None:
        model = self.model
        self.model = None
        if model is not None:
            del model

    def _run_tiles(self, source: Any) -> Any:
        torch = self.torch
        _, _, height, width = source.shape
        output = torch.zeros((1, 3, height * 4, width * 4), dtype=self.dtype, device=self.device)
        for top in range(0, height, self.tile):
            for left in range(0, width, self.tile):
                bottom = min(top + self.tile, height)
                right = min(left + self.tile, width)
                padded_top = max(0, top - self.tile_pad)
                padded_left = max(0, left - self.tile_pad)
                padded_bottom = min(height, bottom + self.tile_pad)
                padded_right = min(width, right + self.tile_pad)
                tile = source[:, :, padded_top:padded_bottom, padded_left:padded_right]
                tile_output = self.model(tile)
                crop_top = (top - padded_top) * 4
                crop_left = (left - padded_left) * 4
                crop_bottom = crop_top + (bottom - top) * 4
                crop_right = crop_left + (right - left) * 4
                output[:, :, top * 4:bottom * 4, left * 4:right * 4] = tile_output[:, :, crop_top:crop_bottom, crop_left:crop_right]
        return output

    def upscale(self, image: Any, width: int, height: int) -> Any:
        import numpy as np
        from PIL import Image

        rgb = image.convert("RGB")
        array = np.asarray(rgb, dtype=np.float32) / 255.0
        source = self.torch.from_numpy(array.transpose(2, 0, 1)).unsqueeze(0).to(device=self.device, dtype=self.dtype)
        with self.torch.inference_mode():
            output = self._run_tiles(source).clamp_(0, 1).float().cpu().numpy()[0].transpose(1, 2, 0)
        native = Image.fromarray((output * 255.0).round().astype(np.uint8), mode="RGB")
        result = native.resize((width, height), resample=Image.Resampling.LANCZOS)
        if result.size != (width, height):
            raise RuntimeError("Anime6B did not produce the requested final dimensions.")
        return result

    def metadata(self) -> dict[str, object]:
        return {
            "semantic": "realesrgan-x4plus-anime6b",
            "model_filename": self.model_path.name,
            "model_sha256": self.sha256,
            "architecture": "RRDBNet-6B",
            "native_scale": ANIME6B_NATIVE_SCALE,
            "tile": self.tile,
            "tile_pad": self.tile_pad,
            "final_resample": "lanczos-from-native-x4",
            "weights_only_load": True,
        }
