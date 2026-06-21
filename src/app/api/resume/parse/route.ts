import { NextResponse } from "next/server";
import { detectResumeFileType, MAX_RESUME_FILE_BYTES } from "@/lib/resume/file-policy";
import { extractResumeText } from "@/lib/resume/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_RESUME_FILE_BYTES + 256 * 1024) {
      return errorResponse("文件大小必须在 5MB 以内。", 413);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return errorResponse("请选择 PDF 或 DOCX 简历文件。", 400);
    }
    if (!file.size || file.size > MAX_RESUME_FILE_BYTES) {
      return errorResponse("文件大小必须在 5MB 以内。", 413);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = detectResumeFileType(file.name, bytes);
    if (!type) {
      return errorResponse("文件格式无效。首版仅支持有效的 PDF 和 DOCX 文件。", 415);
    }

    const text = await extractResumeText(bytes, type);
    if (!text) {
      return errorResponse("未能从文件中提取文本。请重新上传，或直接粘贴简历内容。", 422);
    }

    return NextResponse.json({
      text,
      type,
      truncated: text.length >= 100_000,
    });
  } catch {
    // Do not log filenames, extracted resume text, or parser errors that may contain personal data.
    return errorResponse("简历解析失败。请重新上传，或直接粘贴简历内容。", 422);
  }
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
