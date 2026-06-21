import "server-only";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { normalizeResumeText, type ResumeFileType } from "@/lib/resume/file-policy";

export async function extractResumeText(bytes: Uint8Array, type: ResumeFileType) {
  const buffer = Buffer.from(bytes);

  if (type === "docx") {
    // extractRawText does not accept options and Mammoth defaults external file access to false.
    const result = await mammoth.extractRawText({ buffer });
    return normalizeResumeText(result.value);
  }

  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return normalizeResumeText(result.text);
  } finally {
    await parser.destroy();
  }
}
