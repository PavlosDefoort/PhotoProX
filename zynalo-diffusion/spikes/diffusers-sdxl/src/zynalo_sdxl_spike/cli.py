from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .config import InferenceConfig
from .events import JsonlEmitter
from .runtime import configure_deterministic_environment, execute


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="zynalo-sdxl",
        description="Run deterministic SDXL inference from a local .safetensors checkpoint on NVIDIA CUDA.",
    )
    parser.add_argument("--checkpoint", required=True, type=Path, help="Local SDXL .safetensors checkpoint.")
    parser.add_argument("--prompt", required=True, help="Positive prompt.")
    parser.add_argument("--negative-prompt", default="", help="Negative prompt.")
    parser.add_argument("--output", required=True, type=Path, help="Output PNG path.")
    parser.add_argument(
        "--config",
        dest="config_source",
        help="Optional local Diffusers config directory or Hub repository ID used by from_single_file().",
    )
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--width", type=int, default=1024)
    parser.add_argument("--height", type=int, default=1024)
    parser.add_argument("--steps", type=int, default=30)
    parser.add_argument("--guidance", type=float, default=5.0)
    parser.add_argument("--runs", type=int, default=1, help="Measured runs; each uses the same seed.")
    parser.add_argument("--warmup-runs", type=int, default=0, help="Unmeasured warmup runs.")
    parser.add_argument("--device", dest="device_index", type=int, default=0, help="CUDA device index.")
    parser.add_argument("--dtype", choices=("float16", "bfloat16", "float32"), default="float16")
    parser.add_argument("--offline", action="store_true", help="Forbid Hugging Face network access during load.")
    parser.add_argument("--attention-slicing", action="store_true", help="Reduce VRAM at a performance cost.")
    parser.add_argument("--vae-tiling", action="store_true", help="Tile VAE decode to reduce peak VRAM.")
    parser.add_argument(
        "--no-verify-determinism",
        dest="verify_determinism",
        action="store_false",
        help="Do not fail when measured runs have different pixel hashes.",
    )
    parser.add_argument("--report", type=Path, help="Benchmark JSON path; defaults beside the output PNG.")
    parser.set_defaults(verify_determinism=True)
    return parser


def main(argv: list[str] | None = None) -> int:
    configure_deterministic_environment()
    args = build_parser().parse_args(argv)
    emitter = JsonlEmitter()
    try:
        config = InferenceConfig(**vars(args)).validate()
        execute(config, emitter)
        return 0
    except KeyboardInterrupt:
        emitter.emit("error", stage="interrupted", error_type="KeyboardInterrupt", message="Interrupted by user.")
        print("KeyboardInterrupt: interrupted by user.", file=sys.stderr)
        return 130
    except Exception as error:
        emitter.emit(
            "error",
            stage="failed",
            error_type=type(error).__name__,
            message=str(error),
        )
        print(f"{type(error).__name__}: {error}", file=sys.stderr)
        return 1
