from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path


class ConfigurationError(ValueError):
    """Raised when CLI input is unsafe or incompatible with this spike."""


@dataclass(frozen=True, slots=True)
class InferenceConfig:
    checkpoint: Path
    prompt: str
    output: Path
    negative_prompt: str = ""
    config_source: str | None = None
    seed: int = 0
    width: int = 1024
    height: int = 1024
    steps: int = 30
    guidance: float = 5.0
    runs: int = 1
    warmup_runs: int = 0
    device_index: int = 0
    dtype: str = "float16"
    offline: bool = False
    attention_slicing: bool = False
    vae_tiling: bool = False
    verify_determinism: bool = True
    report: Path | None = None

    def validate(self) -> "InferenceConfig":
        checkpoint = self.checkpoint.expanduser().resolve()
        output = self.output.expanduser().resolve()
        report = self.report.expanduser().resolve() if self.report else default_report_path(output)

        issues: list[str] = []
        if not checkpoint.is_file():
            issues.append(f"Checkpoint does not exist or is not a file: {checkpoint}")
        if checkpoint.suffix.lower() != ".safetensors":
            issues.append("Checkpoint must have a .safetensors extension.")
        if not self.prompt.strip():
            issues.append("Prompt must not be empty.")
        if len(self.prompt) > 4_000 or len(self.negative_prompt) > 4_000:
            issues.append("Prompt fields must not exceed 4,000 characters.")
        if output.suffix.lower() != ".png":
            issues.append("Output must have a .png extension.")
        for name, value in (("width", self.width), ("height", self.height)):
            if value < 64 or value > 2048 or value % 8 != 0:
                issues.append(f"{name} must be from 64 to 2048 and divisible by 8.")
        if not 1 <= self.steps <= 150:
            issues.append("Steps must be from 1 to 150.")
        if not 0.0 <= self.guidance <= 30.0:
            issues.append("Guidance must be from 0 to 30.")
        if not 0 <= self.seed <= 4_294_967_295:
            issues.append("Seed must be an unsigned 32-bit integer.")
        if not 1 <= self.runs <= 100:
            issues.append("Runs must be from 1 to 100.")
        if not 0 <= self.warmup_runs <= 20:
            issues.append("Warmup runs must be from 0 to 20.")
        if not 0 <= self.device_index <= 31:
            issues.append("CUDA device index must be from 0 to 31.")
        if self.dtype not in {"float16", "bfloat16", "float32"}:
            issues.append("dtype must be float16, bfloat16, or float32.")
        if report.suffix.lower() != ".json":
            issues.append("Benchmark report must have a .json extension.")
        if issues:
            raise ConfigurationError(" ".join(issues))

        return InferenceConfig(
            **{
                **asdict(self),
                "checkpoint": checkpoint,
                "output": output,
                "report": report,
                "prompt": self.prompt.strip(),
                "negative_prompt": self.negative_prompt.strip(),
            }
        )

    def public_parameters(self) -> dict[str, object]:
        """Return reproducibility settings without exposing the checkpoint's full path."""
        return {
            "checkpoint_filename": self.checkpoint.name,
            "prompt": self.prompt,
            "negative_prompt": self.negative_prompt,
            "config_source": self.config_source,
            "seed": self.seed,
            "width": self.width,
            "height": self.height,
            "steps": self.steps,
            "guidance": self.guidance,
            "runs": self.runs,
            "warmup_runs": self.warmup_runs,
            "device_index": self.device_index,
            "dtype": self.dtype,
            "offline": self.offline,
            "attention_slicing": self.attention_slicing,
            "vae_tiling": self.vae_tiling,
            "verify_determinism": self.verify_determinism,
        }


def default_report_path(output: Path) -> Path:
    return output.with_name(f"{output.stem}.benchmark.json")


def output_path_for_run(output: Path, run_index: int, run_count: int) -> Path:
    if run_count == 1:
        return output
    return output.with_name(f"{output.stem}-run{run_index:03d}{output.suffix}")
