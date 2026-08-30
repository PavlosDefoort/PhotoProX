import { DocumentImageType } from "@/interfaces/editor/EditorWorkspace";

export class ImportValidationError extends Error {
  constructor(message: string) { super(message); this.name = "ImportValidationError"; }
}

const startsWith = (bytes: Uint8Array, signature: number[]) =>
  signature.every((value, index) => bytes[index] === value);
const ascii = (bytes: Uint8Array, offset: number, value: string) =>
  [...value].every((character, index) => bytes[offset + index] === character.charCodeAt(0));

export const detectSupportedImageType = async (file: File): Promise<DocumentImageType> => {
  if (file.size < 12) throw new ImportValidationError("The image is empty or truncated.");
  const bytes = new Uint8Array(await file.slice(0, Math.min(file.size, 32)).arrayBuffer());
  let detected: DocumentImageType | null = null;
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) detected = "png";
  else if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    const tail = new Uint8Array(await file.slice(Math.max(0, file.size - 2)).arrayBuffer());
    if (tail[0] !== 0xff || tail[1] !== 0xd9) throw new ImportValidationError("The JPEG file appears to be truncated.");
    detected = "jpeg";
  } else if (ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP")) detected = "webp";
  if (!detected) throw new ImportValidationError("Unsupported image format. Choose a valid PNG, JPEG, or WebP file.");

  const allowedMime = detected === "jpeg" ? ["", "image/jpeg", "image/jpg"] : ["", `image/${detected}`];
  if (!allowedMime.includes(file.type.toLowerCase())) {
    throw new ImportValidationError(`The file contents do not match the declared type (${file.type || "unknown"}).`);
  }
  return detected;
};
