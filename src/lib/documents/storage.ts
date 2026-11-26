import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { SupportedDocumentType } from "./extract";

const EXTENSION: Record<SupportedDocumentType, string> = { PDF: ".pdf", DOCX: ".docx", TXT: ".txt" };

function storageRoot() {
  const configured = process.env.OPERATION_DOCUMENT_STORAGE_DIR;
  return path.resolve(/*turbopackIgnore: true*/ configured || path.join(process.cwd(), "private-storage", "operation-documents"));
}

export async function storeSourceDocument(bytes: Uint8Array, type: SupportedDocumentType) {
  const id = randomUUID();
  const storageRef = `${id}${EXTENSION[type]}`;
  const root = storageRoot();
  await mkdir(root, { recursive: true });
  const fullPath = path.resolve(/*turbopackIgnore: true*/ root, storageRef);
  if (path.dirname(fullPath) !== root) throw new Error("Invalid storage key");
  await writeFile(fullPath, bytes, { flag: "wx", mode: 0o600 });
  return storageRef;
}

export async function readSourceDocument(storageRef: string) {
  if (!/^[0-9a-f-]{36}\.(pdf|docx|txt)$/.test(storageRef)) throw new Error("Invalid storage key");
  return readFile(/*turbopackIgnore: true*/ path.join(storageRoot(), storageRef));
}

export async function removeSourceDocument(storageRef: string) {
  if (!/^[0-9a-f-]{36}\.(pdf|docx|txt)$/.test(storageRef)) return;
  await unlink(/*turbopackIgnore: true*/ path.join(storageRoot(), storageRef)).catch(() => undefined);
}
