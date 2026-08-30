from __future__ import annotations

import argparse
import os
import queue
import sys
import threading
import time
import traceback
import uuid
from pathlib import Path

from . import __version__
from .host_backend import BackendConfiguration, HostGenerationCancelled, PersistentSdxlBackend
from .host_protocol import (
    Command,
    ProtocolValidationError,
    ProtocolWriter,
    parse_command,
    validate_generate_payload,
    validate_job_payload,
    validate_load_model_payload,
)


class EngineHost:
    def __init__(self, backend: PersistentSdxlBackend, writer: ProtocolWriter) -> None:
        self.backend = backend
        self.writer = writer
        self.state = "loading"
        self.active_job_id: str | None = None
        self.cancel_event = threading.Event()
        self.stop_event = threading.Event()
        self.jobs: queue.Queue[tuple[str, dict[str, object]] | None] = queue.Queue(maxsize=1)
        self.worker = threading.Thread(target=self._worker, name="zynalo-sdxl-worker", daemon=False)
        self._state_lock = threading.Lock()

    def start(self) -> bool:
        self.writer.lifecycle("hello", hostVersion=__version__, pid=os.getpid())
        if self.backend.configuration.checkpoint is None:
            with self._state_lock:
                self.state = "ready"
            self.worker.start()
            self.writer.lifecycle("ready", loadCount=self.backend.load_count)
            return True
        load_started = time.perf_counter_ns()
        self._model_lifecycle("model-load-started")
        try:
            self.backend.load()
        except Exception as error:
            self.writer.protocol_error("MODEL_LOAD_FAILED", str(error))
            traceback.print_exc(file=sys.stderr)
            self.stop_event.set()
            return False
        with self._state_lock:
            self.state = "ready"
        self._model_lifecycle(
            "model-load-completed",
            loadCount=self.backend.load_count,
            elapsedMs=round((time.perf_counter_ns() - load_started) / 1_000_000, 3),
        )
        self._model_lifecycle("ready", loadCount=self.backend.load_count)
        self.worker.start()
        return True

    def _worker(self) -> None:
        while not self.stop_event.is_set():
            item = self.jobs.get()
            if item is None:
                break
            job_id, request = item
            try:
                result = self.backend.generate(job_id, request, self.cancel_event, self._progress(job_id))
                self.writer.write("generation-result", jobId=job_id, result=result)
            except HostGenerationCancelled as error:
                self.writer.write(
                    "generation-error",
                    jobId=job_id,
                    error={"code": "CANCELLED", "message": str(error), "retryable": True},
                )
            except Exception as error:
                detail = str(error)
                lowered = detail.lower()
                code = "GPU_OUT_OF_MEMORY" if "out of memory" in lowered else "SYSTEM_MEMORY" if isinstance(error, MemoryError) else "GENERATION_FAILED"
                self.writer.write(
                    "generation-error",
                    jobId=job_id,
                    error={"code": code, "message": detail[:4000], "retryable": True},
                )
                traceback.print_exc(file=sys.stderr)
            finally:
                self.cancel_event.clear()
                with self._state_lock:
                    self.active_job_id = None
                    if not self.stop_event.is_set():
                        self.state = "ready"

    def _progress(self, job_id: str):
        def emit(
            stage: str,
            stage_progress: float,
            overall_progress: float,
            current_step: int | None,
            total_steps: int | None,
            pass_name: str | None,
        ) -> None:
            payload: dict[str, object] = {
                "jobId": job_id,
                "stage": stage,
                "stageProgress": round(stage_progress, 6),
                "overallProgress": round(overall_progress, 6),
                "progress": round(overall_progress, 6),
            }
            if current_step is not None:
                payload["currentStep"] = current_step
            if total_steps is not None:
                payload["totalSteps"] = total_steps
            if pass_name is not None:
                payload["pass"] = pass_name
            self.writer.write("progress", **payload)
        return emit

    def handle(self, command: Command) -> bool:
        try:
            if command.name == "inspect-hardware":
                self._require_empty(command.payload)
                self._require_ready()
                self.writer.response(command.identifier, self.backend.hardware())
            elif command.name == "list-models":
                self._require_empty(command.payload)
                self._require_ready()
                self.writer.response(command.identifier, self.backend.models())
            elif command.name == "status":
                self._require_empty(command.payload)
                with self._state_lock:
                    status: dict[str, object] = {
                        "state": self.state,
                        "modelLoadCount": self.backend.load_count,
                        "generationCount": self.backend.generation_count,
                    }
                    if self.active_job_id:
                        status["activeJobId"] = self.active_job_id
                    if self.backend.pipeline is not None and self.backend.configuration.model_id:
                        status["loadedModelId"] = self.backend.configuration.model_id
                self.writer.response(command.identifier, status)
            elif command.name == "runtime-diagnostics":
                self._require_empty(command.payload)
                self._require_ready()
                self.writer.response(command.identifier, self.backend.runtime_diagnostics())
            elif command.name == "load-model":
                self._require_ready()
                model = validate_load_model_payload(command.payload)
                checkpoint = Path(model["checkpoint"]).expanduser().resolve()
                if not checkpoint.is_file() or checkpoint.suffix.lower() != ".safetensors":
                    raise ProtocolValidationError("Checkpoint is missing or is not a .safetensors file.")
                with self._state_lock:
                    self.state = "loading"
                self.writer.lifecycle("model-load-started", modelId=model["id"])
                started = time.perf_counter_ns()
                try:
                    configuration = BackendConfiguration(
                        checkpoint=checkpoint, output_root=self.backend.configuration.output_root,
                        model_id=model["id"], model_name=model["name"], config_source=self.backend.configuration.config_source,
                        device_index=self.backend.configuration.device_index, dtype=self.backend.configuration.dtype,
                        offline=self.backend.configuration.offline, expected_sha256=model["sha256"],
                        anime6b_model=self.backend.configuration.anime6b_model,
                    )
                    self.backend.load(configuration)
                    self.writer.lifecycle("model-load-completed", modelId=model["id"], loadCount=self.backend.load_count, elapsedMs=round((time.perf_counter_ns() - started) / 1_000_000, 3))
                    self.writer.response(command.identifier, {"modelId": model["id"], "loadCount": self.backend.load_count})
                except Exception as error:
                    traceback.print_exc(file=sys.stderr)
                    detail = str(error)
                    lowered = detail.lower()
                    code = "GPU_OUT_OF_MEMORY" if "out of memory" in lowered else "CUDA_UNAVAILABLE" if "cuda" in lowered and "unavailable" in lowered else "PYTHON_PACKAGE_MISSING" if isinstance(error, ModuleNotFoundError) else "MODEL_LOAD_FAILED"
                    self.writer.error_response(command.identifier, code, detail, retryable=True)
                finally:
                    with self._state_lock:
                        self.state = "ready"
            elif command.name == "unload-model":
                self._require_empty(command.payload)
                self._require_ready()
                self.backend.unload()
                self.writer.response(command.identifier, None)
            elif command.name == "generate":
                self._require_ready()
                request = validate_generate_payload(command.payload, self.backend.configuration.model_id)
                job_id = f"py-{uuid.uuid4().hex}"
                with self._state_lock:
                    if self.active_job_id is not None or not self.jobs.empty():
                        raise RuntimeError("The Python engine is already generating.")
                    self.active_job_id = job_id
                    self.state = "generating"
                self.writer.response(command.identifier, {"jobId": job_id})
                self.jobs.put_nowait((job_id, request))
            elif command.name == "cancel":
                job_id = validate_job_payload(command.payload)
                with self._state_lock:
                    if self.active_job_id != job_id:
                        raise LookupError("Unknown active generation job.")
                self.cancel_event.set()
                self.writer.response(command.identifier, None)
            elif command.name == "shutdown":
                self._require_empty(command.payload)
                with self._state_lock:
                    self.state = "stopping"
                self._model_lifecycle("shutting-down")
                self.cancel_event.set()
                self.stop_event.set()
                self.writer.response(command.identifier, None)
                self.jobs.put(None)
                return False
        except ProtocolValidationError as error:
            self.writer.error_response(command.identifier, "INVALID_PAYLOAD", str(error))
        except LookupError as error:
            self.writer.error_response(command.identifier, "UNKNOWN_JOB", str(error))
        except RuntimeError as error:
            code = "ENGINE_BUSY" if "already generating" in str(error) else "ENGINE_NOT_READY"
            self.writer.error_response(command.identifier, code, str(error), retryable=True)
        return True

    def _require_ready(self) -> None:
        with self._state_lock:
            if self.state != "ready":
                raise RuntimeError("The Python engine is not ready.")

    @staticmethod
    def _require_empty(payload: dict[str, object]) -> None:
        if payload:
            raise ProtocolValidationError("Command payload must be empty.")

    def _model_lifecycle(self, event: str, **payload: object) -> None:
        model_id = self.backend.configuration.model_id
        if model_id:
            self.writer.lifecycle(event, modelId=model_id, **payload)
        else:
            self.writer.lifecycle(event, **payload)

    def close(self) -> None:
        self.stop_event.set()
        self.cancel_event.set()
        if self.worker.is_alive():
            if self.jobs.empty() and self.active_job_id is None:
                self.jobs.put(None)
            self.worker.join(timeout=30)
        self._model_lifecycle("stopped", loadCount=self.backend.load_count)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Persistent Zynalo Diffusion SDXL JSONL engine host")
    parser.add_argument("--checkpoint", type=Path)
    parser.add_argument("--output-root", required=True, type=Path)
    parser.add_argument("--model-id")
    parser.add_argument("--model-name")
    parser.add_argument("--expected-sha256")
    parser.add_argument("--config")
    parser.add_argument("--device", type=int, default=0)
    parser.add_argument("--dtype", choices=("float16", "bfloat16", "float32"), default="float16")
    parser.add_argument("--offline", action="store_true")
    parser.add_argument("--anime6b-model", type=Path)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    checkpoint = args.checkpoint.expanduser().resolve() if args.checkpoint else None
    output_root = args.output_root.expanduser().resolve()
    anime6b_model = args.anime6b_model.expanduser().resolve() if args.anime6b_model else None
    if checkpoint is not None and (not checkpoint.is_file() or checkpoint.suffix.lower() != ".safetensors"):
        print("Checkpoint must be an existing .safetensors file.", file=sys.stderr)
        return 2
    if (checkpoint is None) != (args.model_id is None or args.model_name is None):
        print("Checkpoint, model ID, and model name must be supplied together.", file=sys.stderr)
        return 2
    if anime6b_model is not None and (not anime6b_model.is_file() or anime6b_model.suffix.lower() != ".pth"):
        print("Anime6B model must be an existing .pth file.", file=sys.stderr)
        return 2
    output_root.mkdir(parents=True, exist_ok=True)
    configuration = BackendConfiguration(
        checkpoint=checkpoint,
        output_root=output_root,
        model_id=args.model_id,
        model_name=args.model_name,
        config_source=args.config,
        device_index=args.device,
        dtype=args.dtype,
        offline=args.offline,
        expected_sha256=args.expected_sha256,
        anime6b_model=anime6b_model,
    )
    writer = ProtocolWriter()
    host = EngineHost(PersistentSdxlBackend(configuration), writer)
    if not host.start():
        host.close()
        return 1
    try:
        for line in sys.stdin:
            if host.stop_event.is_set():
                break
            try:
                command = parse_command(line)
            except ProtocolValidationError as error:
                writer.protocol_error("MALFORMED_COMMAND", str(error))
                continue
            if not host.handle(command):
                break
    finally:
        host.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
