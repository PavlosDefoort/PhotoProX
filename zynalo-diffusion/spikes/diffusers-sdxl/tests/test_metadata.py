from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from zynalo_sdxl_spike.metadata import build_png_metadata, sha256_file, write_json_atomic


class MetadataTests(unittest.TestCase):
    def test_hashes_checkpoint_in_chunks(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            checkpoint = Path(temporary) / "model.safetensors"
            contents = b"deterministic checkpoint fixture"
            checkpoint.write_bytes(contents)
            self.assertEqual(sha256_file(checkpoint, chunk_size=3), hashlib.sha256(contents).hexdigest())

    def test_builds_embeddable_metadata_and_atomic_report(self) -> None:
        metadata = build_png_metadata(
            parameters={"prompt": "test", "seed": 7},
            checkpoint_sha256="a" * 64,
            runtime={"torch": "test"},
            timing={"generation_ms": 1.0},
            memory={"peak_allocated_bytes": 2},
            run_index=1,
            pixels_sha256="b" * 64,
            completion={"status": "base-only"},
        )
        self.assertEqual(metadata["parameters"], {"prompt": "test", "seed": 7})
        self.assertEqual(metadata["completion"], {"status": "base-only"})
        with tempfile.TemporaryDirectory() as temporary:
            report = Path(temporary) / "report.json"
            write_json_atomic(report, metadata)
            self.assertEqual(json.loads(report.read_text(encoding="utf-8")), metadata)
            self.assertFalse((Path(temporary) / ".report.json.tmp").exists())


if __name__ == "__main__":
    unittest.main()
