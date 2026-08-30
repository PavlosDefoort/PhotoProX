import assert from "node:assert/strict";
import test from "node:test";
import { createWorkspaceDocument } from "../src/models/editor/EditorWorkspace";
import {
  createRecoverySnapshot,
  parseRecoverySnapshot,
  readRecoverySnapshots,
  removeRecoverySnapshot,
  writeRecoverySnapshot,
} from "../src/models/editor/RecoveryStore";

class MemoryStorage {
  values = new Map<string, string>();
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

test("recovery snapshot preserves editable project metadata", () => {
  const document = createWorkspaceDocument({ fileName: "portrait.zyn", sourceFileName: "portrait.png" });
  document.isDirty = true;
  const snapshot = createRecoverySnapshot(document, 1234);
  assert.equal(snapshot.documentId, document.id);
  assert.equal(snapshot.timestamp, 1234);
  assert.equal(snapshot.sourceFileName, "portrait.png");
  assert.equal(JSON.parse(snapshot.project).schemaVersion, 2);
});

test("corrupt snapshots are ignored and removed", () => {
  const storage = new MemoryStorage();
  storage.setItem("zynalo:recovery:bad", "not json");
  assert.deepEqual(readRecoverySnapshots(storage), []);
  assert.equal(storage.length, 0);
  assert.equal(parseRecoverySnapshot("{}"), null);
});

test("quota failures do not throw", () => {
  const document = createWorkspaceDocument();
  const result = writeRecoverySnapshot({ setItem() { throw new DOMException("full", "QuotaExceededError"); } }, createRecoverySnapshot(document));
  assert.equal(result.status, "quota-exceeded");
});

test("saved or discarded documents can clean up recovery", () => {
  const storage = new MemoryStorage();
  const document = createWorkspaceDocument();
  writeRecoverySnapshot(storage, createRecoverySnapshot(document));
  assert.equal(storage.length, 1);
  removeRecoverySnapshot(storage, document.id);
  assert.equal(storage.length, 0);
});
