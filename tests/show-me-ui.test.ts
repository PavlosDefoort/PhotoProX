import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";

test("main assistant sidebar no longer exposes a provider selector", () => {
  const source = readFileSync(
    join(process.cwd(), "src", "features", "show-me", "ShowMePanel.tsx"),
    "utf8",
  );

  assert.equal(source.includes("Planner provider"), false);
  assert.equal(source.includes("show-me-provider"), false);
});
