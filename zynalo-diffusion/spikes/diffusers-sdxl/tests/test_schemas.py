from __future__ import annotations

import json
import unittest
from pathlib import Path


class SchemaTests(unittest.TestCase):
    def test_json_schemas_parse_and_have_unique_ids(self) -> None:
        schema_root = Path(__file__).resolve().parents[1] / "schemas"
        schemas = [json.loads(path.read_text(encoding="utf-8")) for path in sorted(schema_root.glob("*.json"))]
        self.assertEqual(len(schemas), 2)
        self.assertEqual(len({schema["$id"] for schema in schemas}), 2)
        self.assertTrue(all(schema["$schema"].endswith("2020-12/schema") for schema in schemas))


if __name__ == "__main__":
    unittest.main()
