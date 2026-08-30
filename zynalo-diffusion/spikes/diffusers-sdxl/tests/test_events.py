from __future__ import annotations

import io
import json
import unittest

from zynalo_sdxl_spike.events import EVENT_SCHEMA, JsonlEmitter


class JsonlEmitterTests(unittest.TestCase):
    def test_emits_one_parseable_record_per_line(self) -> None:
        stream = io.StringIO()
        emitter = JsonlEmitter(stream)
        emitter.emit("progress", stage="generating", progress=0.25)
        emitter.emit("progress", stage="generating", progress=0.5)

        lines = stream.getvalue().splitlines()
        self.assertEqual(len(lines), 2)
        records = [json.loads(line) for line in lines]
        self.assertEqual([record["sequence"] for record in records], [1, 2])
        self.assertTrue(all(record["schema"] == EVENT_SCHEMA for record in records))
        self.assertEqual(records[1]["progress"], 0.5)


if __name__ == "__main__":
    unittest.main()
