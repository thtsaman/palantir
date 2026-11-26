import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;
export const MAX_EXTRACTED_CHARACTERS = 1_000_000;
export type SupportedDocumentType = "PDF" | "DOCX" | "TXT";

export class DocumentExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentExtractionError";
  }
}

function getDocxEntries(bytes: Uint8Array): string[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const min = Math.max(0, bytes.length - 65_557);
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= min; offset--) {
    if (view.getUint32(offset, true) === 0x06054b50) { eocd = offset; break; }
  }
  if (eocd < 0) throw new DocumentExtractionError("Malformed DOCX archive.");
  const entries = view.getUint16(eocd + 10, true);
  const centralSize = view.getUint32(eocd + 12, true);
  let offset = view.getUint32(eocd + 16, true);
  if (entries === 0xffff || centralSize === 0xffffffff || offset === 0xffffffff || entries > 1000 || offset + centralSize > bytes.length) {
    throw new DocumentExtractionError("DOCX archive uses unsupported ZIP64 or has invalid directory bounds.");
  }
  const names: string[] = [];
  let expandedBytes = 0;
  for (let i = 0; i < entries; i++) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) throw new DocumentExtractionError("Malformed DOCX archive directory.");
    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const compressed = view.getUint32(offset + 20, true);
    const expanded = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    if (flags & 1 || ![0, 8].includes(method)) throw new DocumentExtractionError("Encrypted or unsupported DOCX ZIP entry.");
    expandedBytes += expanded;
    if (expandedBytes > 50 * 1024 * 1024 || (compressed > 0 && expanded / compressed > 200)) throw new DocumentExtractionError("DOCX expands beyond the permitted archive limits.");
    const nameBytes = bytes.subarray(offset + 46, offset + 46 + nameLength);
    names.push(new TextDecoder("utf-8", { fatal: true }).decode(nameBytes));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  if (!names.includes("[Content_Types].xml") || !names.includes("word/document.xml")) throw new DocumentExtractionError("ZIP file is not a valid DOCX document.");
  if (names.includes("word/vbaProject.bin")) throw new DocumentExtractionError("Macro-enabled documents are not supported.");
  return names;
}

function detectType(filename: string, bytes: Uint8Array): SupportedDocumentType {
  const lowerName = filename.toLowerCase();
  const header = new TextDecoder("ascii").decode(bytes.subarray(0, Math.min(1024, bytes.length)));
  if (header.startsWith("%PDF-") && lowerName.endsWith(".pdf")) return "PDF";
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && [0x03, 0x05, 0x07].includes(bytes[2]!) && [0x04, 0x06, 0x08].includes(bytes[3]!) && lowerName.endsWith(".docx")) {
    getDocxEntries(bytes);
    return "DOCX";
  }
  if (lowerName.endsWith(".txt")) {
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (!text.includes("\0") && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) return "TXT";
    } catch { /* fall through to unsupported type */ }
  }
  throw new DocumentExtractionError("File content does not match a supported PDF, DOCX, or UTF-8 TXT document.");
}

export async function extractDocument(filename: string, bytes: Uint8Array): Promise<{ fileType: SupportedDocumentType; text: string }> {
  if (bytes.byteLength === 0) throw new DocumentExtractionError("The uploaded document is empty.");
  if (bytes.byteLength > MAX_DOCUMENT_BYTES) throw new DocumentExtractionError("The document exceeds the 15 MB upload limit.");
  let fileType: SupportedDocumentType;
  try { fileType = detectType(filename, bytes); }
  catch (error) {
    if (error instanceof DocumentExtractionError) throw error;
    throw new DocumentExtractionError("Document signature or internal structure is malformed.");
  }
  let text: string;
  if (fileType === "TXT") {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "");
  } else if (fileType === "DOCX") {
    try {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      text = result.value;
    } catch {
      throw new DocumentExtractionError("DOCX package could not be read; the document may be malformed.");
    }
  } else {
    const parser = new PDFParse({ data: bytes });
    try {
      const info = await parser.getInfo();
      if (info.total > 250) throw new DocumentExtractionError("PDF documents over 250 pages are not supported.");
      text = (await parser.getText()).text;
    } catch (error) {
      if (error instanceof DocumentExtractionError) throw error;
      throw new DocumentExtractionError("PDF could not be read. It may be malformed, encrypted, or scanned without a text layer.");
    } finally {
      await parser.destroy();
    }
  }
  text = text.replace(/\r\n?/g, "\n").replace(/[\t ]+\n/g, "\n").trim();
  if (!text || text.replace(/\s/g, "").length < 20) throw new DocumentExtractionError("No readable report text was found. Scanned PDFs without a text layer are unsupported; OCR is not enabled.");
  if (text.length > MAX_EXTRACTED_CHARACTERS) throw new DocumentExtractionError("Extracted content exceeds the 1 MB text limit.");
  return { fileType, text };
}
