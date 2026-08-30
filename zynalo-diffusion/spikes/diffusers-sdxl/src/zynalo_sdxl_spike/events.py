from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from typing import TextIO

EVENT_SCHEMA = "zynalo.diffusion.sdxl-spike.event/v1"


class JsonlEmitter:
    """Write one stable machine-readable event per stdout line."""

    def __init__(self, stream: TextIO | None = None) -> None:
        self._stream = stream or sys.stdout
        self._sequence = 0

    def emit(self, event: str, **payload: object) -> dict[str, object]:
        self._sequence += 1
        record: dict[str, object] = {
            "schema": EVENT_SCHEMA,
            "sequence": self._sequence,
            "timestamp": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
            "event": event,
            **payload,
        }
        self._stream.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
        self._stream.flush()
        return record
