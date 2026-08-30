import assert from "node:assert/strict";
import test from "node:test";
import { detectSupportedImageType, ImportValidationError } from "../src/utils/FileValidation";

const file = (bytes: number[], name: string, type: string) => {
  const blob = new Blob([new Uint8Array(bytes)], { type }) as Blob & { name: string; lastModified: number };
  Object.defineProperties(blob, { name: { value: name }, lastModified: { value: 1 } });
  return blob as File;
};

test("detects PNG by signature instead of extension", async () => {
  const png = file([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0], "wrong.jpg", "image/png");
  assert.equal(await detectSupportedImageType(png), "png");
});

test("rejects unknown data instead of defaulting to JPEG", async () => {
  await assert.rejects(() => detectSupportedImageType(file(new Array(12).fill(0), "bad.jpg", "image/jpeg")), ImportValidationError);
});

test("rejects mismatched declared MIME type", async () => {
  const png = file([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0], "image.png", "image/jpeg");
  await assert.rejects(() => detectSupportedImageType(png), /do not match/);
});

test("rejects truncated JPEG", async () => {
  await assert.rejects(() => detectSupportedImageType(file([0xff,0xd8,0xff,0,0,0,0,0,0,0,0,0], "bad.jpg", "image/jpeg")), /truncated/);
});
