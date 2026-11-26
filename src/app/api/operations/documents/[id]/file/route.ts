import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readSourceDocument } from "@/lib/documents/storage";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const source = await prisma.operationSourceDocument.findUnique({ where: { id }, select: { originalFilename: true, fileType: true, storageRef: true } });
  if (!source?.storageRef || !source.fileType) return NextResponse.json({ error: "Original source file is unavailable." }, { status: 404 });
  try {
    const bytes = await readSourceDocument(source.storageRef);
    const contentType = source.fileType === "PDF" ? "application/pdf" : source.fileType === "DOCX" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "text/plain; charset=utf-8";
    const safeFilename = source.originalFilename.replace(/[\r\n"\\]/g, "_");
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": contentType, "Content-Disposition": `inline; filename="${safeFilename}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "Original source file could not be opened." }, { status: 404 });
  }
}
