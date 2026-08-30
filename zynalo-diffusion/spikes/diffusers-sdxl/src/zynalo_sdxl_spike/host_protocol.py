from __future__ import annotations

import json
import re
import sys
import threading
from dataclasses import dataclass
from typing import TextIO

PROTOCOL = "zynalo.diffusion.engine-host/v2"
MAX_LINE_BYTES = 1024 * 1024
IDENTIFIER = re.compile(r"^[A-Za-z0-9_-]{1,128}$")
COMMANDS = {"inspect-hardware", "list-models", "generate", "cancel", "status", "runtime-diagnostics", "load-model", "unload-model", "shutdown"}


@dataclass(frozen=True, slots=True)
class Command:
    identifier: str
    name: str
    payload: dict[str, object]


class ProtocolValidationError(ValueError):
    pass


class ProtocolWriter:
    def __init__(self, stream: TextIO | None = None) -> None:
        self._stream = stream or sys.stdout
        self._lock = threading.Lock()

    def write(self, message_type: str, **payload: object) -> None:
        message = {"protocol": PROTOCOL, "type": message_type, **payload}
        encoded = json.dumps(message, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
        with self._lock:
            self._stream.write(encoded + "\n")
            self._stream.flush()

    def lifecycle(self, event: str, **payload: object) -> None:
        self.write("lifecycle", event=event, **payload)

    def response(self, identifier: str, result: object = None) -> None:
        self.write("response", id=identifier, ok=True, result=result)

    def error_response(self, identifier: str, code: str, message: str, retryable: bool = False) -> None:
        self.write(
            "response",
            id=identifier,
            ok=False,
            error={"code": code, "message": message[:4000], "retryable": retryable},
        )

    def protocol_error(self, code: str, message: str) -> None:
        self.write(
            "protocol-error",
            error={"code": code, "message": message[:4000], "retryable": False},
        )


def parse_command(line: str) -> Command:
    if len(line.encode("utf-8")) > MAX_LINE_BYTES:
        raise ProtocolValidationError("Command exceeds the 1 MiB line limit.")
    try:
        value = json.loads(line)
    except json.JSONDecodeError as error:
        raise ProtocolValidationError(f"Malformed JSON: {error.msg}.") from error
    if not isinstance(value, dict):
        raise ProtocolValidationError("Command must be a JSON object.")
    if set(value) != {"protocol", "type", "id", "command", "payload"}:
        raise ProtocolValidationError("Command envelope contains missing or unexpected fields.")
    if value["protocol"] != PROTOCOL or value["type"] != "command":
        raise ProtocolValidationError("Unsupported protocol or message type.")
    identifier = value["id"]
    command = value["command"]
    payload = value["payload"]
    if not isinstance(identifier, str) or not IDENTIFIER.fullmatch(identifier):
        raise ProtocolValidationError("Invalid command ID.")
    if command not in COMMANDS:
        raise ProtocolValidationError("Unknown command.")
    if not isinstance(payload, dict):
        raise ProtocolValidationError("Command payload must be an object.")
    return Command(identifier=identifier, name=command, payload=payload)


def validate_job_payload(payload: dict[str, object]) -> str:
    if set(payload) != {"jobId"}:
        raise ProtocolValidationError("Job payload must contain only jobId.")
    job_id = payload["jobId"]
    if not isinstance(job_id, str) or not IDENTIFIER.fullmatch(job_id):
        raise ProtocolValidationError("Invalid job ID.")
    return job_id


def validate_load_model_payload(payload: dict[str, object]) -> dict[str, str]:
    if set(payload) != {"model"} or not isinstance(payload["model"], dict):
        raise ProtocolValidationError("Load-model payload must contain only a model object.")
    model = payload["model"]
    if set(model) != {"id", "name", "checkpoint", "sha256"}:
        raise ProtocolValidationError("Model reference contains missing or unexpected fields.")
    if not isinstance(model["id"], str) or not IDENTIFIER.fullmatch(model["id"]):
        raise ProtocolValidationError("Invalid model ID.")
    if not isinstance(model["name"], str) or not 1 <= len(model["name"]) <= 200:
        raise ProtocolValidationError("Invalid model name.")
    if not isinstance(model["checkpoint"], str) or not model["checkpoint"].lower().endswith(".safetensors"):
        raise ProtocolValidationError("Invalid checkpoint reference.")
    if not isinstance(model["sha256"], str) or not re.fullmatch(r"[a-f0-9]{64}", model["sha256"]):
        raise ProtocolValidationError("Invalid checkpoint SHA-256.")
    return {key: str(value) for key, value in model.items()}


def validate_generate_payload(payload: dict[str, object], expected_model_id: str) -> dict[str, object]:
    if set(payload) != {"request"} or not isinstance(payload["request"], dict):
        raise ProtocolValidationError("Generate payload must contain only a request object.")
    request = payload["request"]
    allowed = {"prompt", "negativePrompt", "modelId", "seed", "width", "height", "steps", "guidance", "sampler", "clipLayerSelection", "detailPass"}
    required = {"prompt", "modelId", "seed", "width", "height", "steps", "guidance", "detailPass"}
    if not set(request).issubset(allowed) or not required.issubset(request):
        raise ProtocolValidationError("Generation request contains missing or unexpected fields.")
    prompt = request["prompt"]
    negative_prompt = request.get("negativePrompt", "")
    model_id = request["modelId"]
    if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > 4000:
        raise ProtocolValidationError("Prompt must contain from 1 to 4,000 characters.")
    if not isinstance(negative_prompt, str) or len(negative_prompt) > 4000:
        raise ProtocolValidationError("Negative prompt must be text up to 4,000 characters.")
    if model_id != expected_model_id:
        raise ProtocolValidationError("Generation request targets an unknown model.")
    for field in ("width", "height"):
        value = request[field]
        if not isinstance(value, int) or isinstance(value, bool) or value < 64 or value > 2048 or value % 8:
            raise ProtocolValidationError(f"{field} must be from 64 to 2048 and divisible by 8.")
    steps = request["steps"]
    guidance = request["guidance"]
    if not isinstance(steps, int) or isinstance(steps, bool) or not 1 <= steps <= 150:
        raise ProtocolValidationError("Steps must be from 1 to 150.")
    if not isinstance(guidance, (int, float)) or isinstance(guidance, bool) or not 0 <= guidance <= 30:
        raise ProtocolValidationError("Guidance must be from 0 to 30.")
    seed = request["seed"]
    if not isinstance(seed, int) or isinstance(seed, bool) or not 0 <= seed <= 4_294_967_295:
        raise ProtocolValidationError("Seed must be an unsigned 32-bit integer.")
    clip_layer_selection = request.get("clipLayerSelection", "penultimate-hidden-state")
    if clip_layer_selection != "penultimate-hidden-state":
        raise ProtocolValidationError("Only the SDXL penultimate hidden state is supported for CLIP conditioning.")
    sampler = request.get("sampler", "checkpoint-default")
    if sampler not in {"checkpoint-default", "euler-ancestral"}:
        raise ProtocolValidationError("Sampler must be checkpoint-default or euler-ancestral.")
    detail_pass = _validate_detail_pass(request["detailPass"], int(request["width"]), int(request["height"]), seed)
    return {
        "prompt": prompt,
        "negativePrompt": negative_prompt,
        "modelId": model_id,
        "seed": seed,
        "width": request["width"],
        "height": request["height"],
        "steps": steps,
        "guidance": float(guidance),
        "sampler": sampler,
        "clipLayerSelection": clip_layer_selection,
        "detailPass": detail_pass,
    }


def _validate_detail_pass(value: object, base_width: int, base_height: int, base_seed: int) -> dict[str, object]:
    if not isinstance(value, dict) or not isinstance(value.get("enabled"), bool):
        raise ProtocolValidationError("Detail Pass must be an object with an enabled flag.")
    if not value["enabled"]:
        if set(value) != {"enabled"}:
            raise ProtocolValidationError("Disabled Detail Pass settings contain unexpected fields.")
        return {"enabled": False}
    allowed = {
        "enabled", "upscaler", "scale", "targetWidth", "targetHeight", "lockAspectRatio", "strength",
        "steps", "promptMode", "prompt", "negativePromptMode", "negativePrompt", "seedMode", "seed",
    }
    required = allowed - {"prompt", "negativePrompt"}
    if not set(value).issubset(allowed) or not required.issubset(value):
        raise ProtocolValidationError("Enabled Detail Pass settings contain missing or unexpected fields.")
    if value["upscaler"] not in {"lanczos", "realesrgan-anime6b"}:
        raise ProtocolValidationError("Upscaler must be lanczos or realesrgan-anime6b.")
    scale = value["scale"]
    if not isinstance(scale, (int, float)) or isinstance(scale, bool) or not 1 < scale <= 2:
        raise ProtocolValidationError("Detail Pass scale must be greater than 1 and no more than 2.")
    for field in ("targetWidth", "targetHeight"):
        dimension = value[field]
        if not isinstance(dimension, int) or isinstance(dimension, bool) or not 64 <= dimension <= 3072 or dimension % 8:
            raise ProtocolValidationError(f"{field} must be from 64 to 3072 and divisible by 8.")
    target_width = int(value["targetWidth"])
    target_height = int(value["targetHeight"])
    if target_width * target_height > 4_194_304:
        raise ProtocolValidationError("Final image exceeds the 4,194,304 pixel allocation limit.")
    if not isinstance(value["lockAspectRatio"], bool):
        raise ProtocolValidationError("Aspect-ratio lock must be true or false.")
    if value["lockAspectRatio"]:
        aspect_error = abs((target_width / target_height) - (base_width / base_height)) / (base_width / base_height)
        expected_width = max(64, int((base_width * float(scale)) / 8 + 0.5) * 8)
        expected_height = max(64, int((base_height * float(scale)) / 8 + 0.5) * 8)
        if aspect_error > 0.005 or target_width != expected_width or target_height != expected_height:
            raise ProtocolValidationError("Detail Pass scale and aspect-locked dimensions are out of sync.")
    strength = value["strength"]
    if not isinstance(strength, (int, float)) or isinstance(strength, bool) or not 0.05 <= strength <= 0.95:
        raise ProtocolValidationError("Denoising strength must be from 0.05 to 0.95.")
    detail_steps = value["steps"]
    if not isinstance(detail_steps, int) or isinstance(detail_steps, bool) or not 1 <= detail_steps <= 100:
        raise ProtocolValidationError("Second-pass steps must be from 1 to 100.")
    for mode_field, prompt_field in (("promptMode", "prompt"), ("negativePromptMode", "negativePrompt")):
        mode = value[mode_field]
        prompt = value.get(prompt_field)
        if mode not in {"inherit", "custom"}:
            raise ProtocolValidationError(f"{mode_field} must be inherit or custom.")
        if prompt is not None and (not isinstance(prompt, str) or len(prompt) > 4000):
            raise ProtocolValidationError(f"{prompt_field} must be text up to 4,000 characters.")
        if mode == "custom" and (not isinstance(prompt, str) or not prompt.strip()):
            raise ProtocolValidationError(f"{prompt_field} is required in custom mode.")
        if mode == "inherit" and prompt is not None:
            raise ProtocolValidationError(f"{prompt_field} must be omitted in inherit mode.")
    if value["seedMode"] not in {"derived", "custom"}:
        raise ProtocolValidationError("Detail seed mode must be derived or custom.")
    detail_seed = value["seed"]
    if not isinstance(detail_seed, int) or isinstance(detail_seed, bool) or not 0 <= detail_seed <= 4_294_967_295:
        raise ProtocolValidationError("Detail seed must be an unsigned 32-bit integer.")
    if value["seedMode"] == "derived" and detail_seed != ((base_seed + 0x9E3779B9) & 0xFFFFFFFF):
        raise ProtocolValidationError("Derived detail seed does not match zynalo-detail-seed-v1.")
    result = dict(value)
    result["scale"] = float(scale)
    result["strength"] = float(strength)
    return result
