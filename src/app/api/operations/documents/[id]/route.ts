import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { removeSourceDocument } from "@/lib/documents/storage";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const source = await prisma.operationSourceDocument.findUnique({ where: { id }, select: { id: true, originalFilename: true, fileType: true, fileSizeBytes: true, uploadedAt: true, status: true, extractedText: true, extractionError: true } });
  if (!source) return NextResponse.json({ error: "Source document was not found." }, { status: 404 });
  if (source.status === "LINKED") return NextResponse.json({ error: "This source document is already linked to a saved operation." }, { status: 409 });
  return NextResponse.json({ source, ...(source.extractedText ? { extractedText: source.extractedText } : {}) });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const source = await prisma.operationSourceDocument.findUnique({ where: { id }, select: { id: true, status: true, operationId: true, storageRef: true } });
  if (!source) return NextResponse.json({ error: "Document preview was not found." }, { status: 404 });
  if (!["PREVIEW_READY", "FAILED"].includes(source.status) || source.operationId) return NextResponse.json({ error: "Linked source documents cannot be discarded." }, { status: 409 });
  const deleted = await prisma.operationSourceDocument.deleteMany({ where: { id, status: source.status, operationId: null } });
  if (deleted.count !== 1) return NextResponse.json({ error: "Document preview has already changed." }, { status: 409 });
  if (source.storageRef) await removeSourceDocument(source.storageRef);
  return NextResponse.json({ deleted: true });
}
