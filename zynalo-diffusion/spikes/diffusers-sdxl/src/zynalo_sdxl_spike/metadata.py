from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, BinaryIO

PNG_METADATA_SCHEMA = "zynalo.diffusion.generated-image/v2"


def sha256_file(path: Path, chunk_size: int = 8 * 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        _update_digest(digest, stream, chunk_size)
    return digest.hexdigest()


def _update_digest(digest: Any, stream: BinaryIO, chunk_size: int) -> None:
    while chunk := stream.read(chunk_size):
        digest.update(chunk)


def pixel_sha256(image: Any) -> str:
    digest = hashlib.sha256()
    digest.update(str(image.mode).encode("utf-8"))
    digest.update(f"{image.size[0]}x{image.size[1]}".encode("ascii"))
    digest.update(image.tobytes())
    return digest.hexdigest()


def build_png_metadata(
    *,
    parameters: dict[str, object],
    checkpoint_sha256: str,
    runtime: dict[str, object],
    timing: dict[str, object],
    memory: dict[str, object],
    run_index: int,
    pixels_sha256: str,
    completion: dict[str, object] | None = None,
) -> dict[str, object]:
    result: dict[str, object] = {
        "schema": PNG_METADATA_SCHEMA,
        "generator": "Zynalo Diffusion SDXL spike",
        "run_index": run_index,
        "parameters": parameters,
        "checkpoint_sha256": checkpoint_sha256,
        "pixel_sha256": pixels_sha256,
        "runtime": runtime,
        "timing": timing,
        "memory": memory,
    }
    if completion is not None:
        result["completion"] = completion
    return result


def save_png_with_metadata(image: Any, output: Path, metadata: dict[str, object]) -> None:
    from PIL.PngImagePlugin import PngInfo

    output.parent.mkdir(parents=True, exist_ok=True)
    png_info = PngInfo()
    png_info.add_itxt("zynalo_diffusion", json.dumps(metadata, ensure_ascii=False, sort_keys=True))
    parameters = metadata["parameters"]
    if isinstance(parameters, dict):
        png_info.add_itxt("prompt", str(parameters.get("prompt", "")))
        png_info.add_itxt("negative_prompt", str(parameters.get("negative_prompt", "")))
        png_info.add_text("seed", str(parameters.get("seed", "")))
    png_info.add_text("checkpoint_sha256", str(metadata["checkpoint_sha256"]))
    png_info.add_text("pixel_sha256", str(metadata["pixel_sha256"]))
    image.save(output, format="PNG", pnginfo=png_info)


def write_json_atomic(path: Path, data: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    temporary.replace(path)
