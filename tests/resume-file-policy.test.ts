import assert from "node:assert/strict";
import test from "node:test";
import { detectResumeFileType, MAX_RESUME_FILE_BYTES, normalizeResumeText } from "../src/lib/resume/file-policy.ts";

test("只接受扩展名与文件签名同时匹配的 PDF", () => {
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);

  assert.equal(detectResumeFileType("resume.pdf", pdf), "pdf");
  assert.equal(detectResumeFileType("resume.docx", pdf), undefined);
});

test("只接受扩展名与 ZIP 签名同时匹配的 DOCX", () => {
  const docx = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00]);

  assert.equal(detectResumeFileType("resume.docx", docx), "docx");
  assert.equal(detectResumeFileType("resume.pdf", docx), undefined);
  assert.equal(detectResumeFileType("resume.doc", docx), undefined);
});

test("拒绝伪装扩展名和不支持的旧版 DOC", () => {
  const executable = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);

  assert.equal(detectResumeFileType("resume.pdf", executable), undefined);
  assert.equal(detectResumeFileType("resume.doc", executable), undefined);
});

test("提取文本移除空字符并限制最大长度", () => {
  const text = normalizeResumeText(`姓名\0   经历\n\n\n${"A".repeat(120_000)}`);

  assert.ok(!text.includes("\0"));
  assert.ok(!text.includes("\n\n\n"));
  assert.equal(text.length, 100_000);
});

test("首版简历文件大小限制为 5MB", () => {
  assert.equal(MAX_RESUME_FILE_BYTES, 5 * 1024 * 1024);
});
