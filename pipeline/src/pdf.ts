import manualPdf from "../manuals/S9550-AB-MMA-010_RevA_EDG_Maintenance.pdf";
import { extractText, getDocumentProxy } from "unpdf";

export function bundledManual(): Uint8Array {
  const bytes = manualPdf instanceof ArrayBuffer ? new Uint8Array(manualPdf) : new Uint8Array(manualPdf);
  return bytes;
}

export type ParsedManual = {
  pageCount: number;
  text: string;
};

export async function parseManualPdf(bytes: Uint8Array): Promise<ParsedManual> {
  if (bytes.byteLength < 5) {
    throw new Error("The PDF is empty.");
  }
  const header = new TextDecoder().decode(bytes.subarray(0, 5));
  if (header !== "%PDF-") {
    throw new Error("The file is not a PDF.");
  }
  const document = await getDocumentProxy(bytes);
  const extracted = await extractText(document, { mergePages: false });
  const pages = extracted.text.map((page) => page.trim()).filter((page) => page.length > 0);
  if (extracted.totalPages < 1 || pages.length < 1) {
    throw new Error("pdf.js parsed no text pages.");
  }
  const text = pages
    .map((page, index) => `--- pdf.js page ${index + 1} of ${extracted.totalPages} ---\n${page}`)
    .join("\n\n");
  if (!text.includes("PROC-EDG-001")) {
    throw new Error("pdf.js text does not include PROC-EDG-001.");
  }
  return { pageCount: extracted.totalPages, text };
}
