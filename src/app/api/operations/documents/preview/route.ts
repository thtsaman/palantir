import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DocumentExtractionError, extractDocument, MAX_DOCUMENT_BYTES } from "@/lib/documents/extract";
import { removeSourceDocument, storeSourceDocument } from "@/lib/documents/storage";

export const runtime = "nodejs";
const MAX_REQUEST_BYTES = MAX_DOCUMENT_BYTES + 1024 * 1024;

async function readBoundedBody(request: Request, limit: number): Promise<Buffer | null> {
  if (!request.body) return Buffer.alloc(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), total);
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) return NextResponse.json({ error: "Upload request exceeds the 16 MB request limit." }, { status: 413 });
  let storageRef: string | undefined;
  let uploadedFile: File | undefined;
  try {
    const body = await readBoundedBody(request, MAX_REQUEST_BYTES);
    if (!body) return NextResponse.json({ error: "Upload request exceeds the 16 MB request limit." }, { status: 413 });
    const replay = new Request(request.url, { method: "POST", headers: request.headers, body: new Uint8Array(body) });
    const form = await replay.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a PDF, DOCX, or TXT file." }, { status: 400 });
    uploadedFile = file;
    if (file.size > MAX_DOCUMENT_BYTES) throw new DocumentExtractionError("The document exceeds the 15 MB upload limit.");
    const originalFilename = file.name.replaceAll("\\", "/").split("/").pop()?.slice(0, 255) || "uploaded-document";
    const bytes = new Uint8Array(await file.arrayBuffer());
    const extracted = await extractDocument(originalFilename, bytes);
    storageRef = await storeSourceDocument(bytes, extracted.fileType);
    const source = await prisma.operationSourceDocument.create({ data: {
      originalFilename,
      fileType: extracted.fileType,
      fileSizeBytes: bytes.byteLength,
      storageRef,
      extractedText: extracted.text,
      status: "PREVIEW_READY",
      extractionError: null,
    }, select: { id: true, originalFilename: true, fileType: true, fileSizeBytes: true, uploadedAt: true, status: true } });
    return NextResponse.json({ source, extractedText: extracted.text }, { status: 201 });
  } catch (error) {
    if (storageRef) await removeSourceDocument(storageRef);
    if (error instanceof DocumentExtractionError) {
      const status = /15 MB|250 pages|1 MB|expands beyond/.test(error.message) ? 413 : 422;
      if (uploadedFile) {
        const originalFilename = uploadedFile.name.replaceAll("\\", "/").split("/").pop()?.slice(0, 255) || "uploaded-document";
        const extension = originalFilename.toLowerCase().split(".").pop();
        const fileType = extension === "pdf" ? "PDF" : extension === "docx" ? "DOCX" : extension === "txt" ? "TXT" : null;
        const failedSource = await prisma.operationSourceDocument.create({ data: {
          originalFilename, fileType, fileSizeBytes: uploadedFile.size, storageRef: null,
          extractedText: null, status: "FAILED", extractionError: error.message,
        }, select: { id: true, originalFilename: true, fileType: true, fileSizeBytes: true, uploadedAt: true, status: true, extractionError: true } }).catch(() => null);
        return NextResponse.json({ error: error.message, source: failedSource }, { status });
      }
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Could not process the uploaded document." }, { status: 500 });
  }
}
