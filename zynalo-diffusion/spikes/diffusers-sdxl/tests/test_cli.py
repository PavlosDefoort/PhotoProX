from __future__ import annotations

import contextlib
import io
import json
import unittest

from zynalo_sdxl_spike.cli import main


class CliTests(unittest.TestCase):
    def test_validation_failure_is_emitted_as_jsonl(self) -> None:
        stdout = io.StringIO()
        stderr = io.StringIO()
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            exit_code = main(
                [
                    "--checkpoint",
                    "missing.safetensors",
                    "--prompt",
                    "test",
                    "--output",
                    "result.png",
                ]
            )
        self.assertEqual(exit_code, 1)
        record = json.loads(stdout.getvalue())
        self.assertEqual(record["event"], "error")
        self.assertEqual(record["stage"], "failed")
        self.assertIn("does not exist", record["message"])
        self.assertIn("ConfigurationError", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
