export const MAX_RESUME_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_RESUME_TEXT_LENGTH = 100_000;

export type ResumeFileType = "pdf" | "docx";

export function detectResumeFileType(fileName: string, bytes: Uint8Array): ResumeFileType | undefined {
  const extension = fileName.toLowerCase().split(".").pop();
  const isPdf = bytes.length >= 5
    && bytes[0] === 0x25
    && bytes[1] === 0x50
    && bytes[2] === 0x44
    && bytes[3] === 0x46
    && bytes[4] === 0x2d;
  const isZip = bytes.length >= 4
    && bytes[0] === 0x50
    && bytes[1] === 0x4b
    && ((bytes[2] === 0x03 && bytes[3] === 0x04) || (bytes[2] === 0x05 && bytes[3] === 0x06));

  if (extension === "pdf" && isPdf) return "pdf";
  if (extension === "docx" && isZip) return "docx";
  return undefined;
}

export function normalizeResumeText(text: string) {
  return text
    .replace(/\0/g, "")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_RESUME_TEXT_LENGTH);
}
