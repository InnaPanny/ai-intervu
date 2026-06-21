"use client";

import { useRef, useState } from "react";
import { Dialog } from "@/components/dialog";
import { Field } from "@/components/login-dialog";
import { useApp } from "@/components/app-provider";
import type { Target } from "@/lib/types";

export function TargetDialog({ open, onClose, onSuccess, target }: {
  open: boolean;
  onClose: () => void;
  onSuccess?: (target: Target) => void;
  target?: Target;
}) {
  if (!open) return null;
  return <TargetDialogForm onClose={onClose} onSuccess={onSuccess} target={target} />;
}

function TargetDialogForm({ onClose, onSuccess, target }: {
  onClose: () => void;
  onSuccess?: (target: Target) => void;
  target?: Target;
}) {
  const { addTarget, updateTarget } = useApp();
  const [industry, setIndustry] = useState(target?.industry ?? "");
  const [role, setRole] = useState(target?.role ?? "");
  const [experience, setExperience] = useState(target?.experience ?? "");
  const [resume, setResume] = useState(target?.resume ?? "");
  const [jd, setJd] = useState(target?.jd ?? "");
  const [resumeMessage, setResumeMessage] = useState("");
  const [parsingResume, setParsingResume] = useState(false);
  const resumeInput = useRef<HTMLInputElement>(null);

  async function parseResume(file?: File) {
    if (!file) return;
    setParsingResume(true);
    setResumeMessage("");
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/resume/parse", { method: "POST", body: formData });
      const result = await response.json() as { text?: string; error?: string; truncated?: boolean };
      if (!response.ok || !result.text) throw new Error(result.error ?? "简历解析失败。");
      setResume(result.text);
      setResumeMessage(result.truncated ? "已提取简历文本，内容较长，已按安全上限截取。" : "已提取简历文本。原文件不会由当前 MVP 保存。");
    } catch (error) {
      setResumeMessage(error instanceof Error ? error.message : "简历解析失败，请直接粘贴文本。");
    } finally {
      setParsingResume(false);
      if (resumeInput.current) resumeInput.current.value = "";
    }
  }

  return (
    <Dialog open onClose={onClose} title={target ? "编辑求职目标" : "创建求职目标"}
      description="行业、岗位和工作年限用于生成具有针对性的面试题。">
      <div className="space-y-4">
        <Field label="目标行业（必填）" value={industry} onChange={setIndustry} placeholder="例如：互联网" />
        <Field label="目标岗位（必填）" value={role} onChange={setRole} placeholder="例如：产品经理" />
        <Field label="工作年限或求职阶段（必填）" value={experience} onChange={setExperience} placeholder="例如：3 年 / 应届生" />
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">简历内容（选填）</span>
            <button type="button" disabled={parsingResume} onClick={() => resumeInput.current?.click()}
              className="rounded-lg border border-border px-3 py-1.5 text-xs disabled:opacity-40">{parsingResume ? "正在安全解析..." : "上传 PDF / DOCX"}</button>
          </div>
          <input ref={resumeInput} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden" onChange={(event) => parseResume(event.target.files?.[0])} />
          <textarea value={resume} onChange={(event) => setResume(event.target.value)} placeholder="可上传文件，也可以直接粘贴简历文本" rows={5}
            className="w-full resize-none rounded-xl border border-border px-4 py-3 outline-none focus:border-brand" />
          <p className="mt-2 text-xs leading-5 text-muted">仅支持 PDF、DOCX，最大 5MB。当前 MVP 只提取文本，不保存原文件。请勿上传与面试准备无关的敏感信息。</p>
          {resumeMessage && <p role="status" className="mt-2 text-xs leading-5 text-brand">{resumeMessage}</p>}
        </div>
        <TextField label="岗位 JD（选填）" value={jd} onChange={setJd} placeholder="可以稍后补充" />
        <button
          disabled={!industry.trim() || !role.trim() || !experience.trim()}
          onClick={() => {
            const values = {
              industry: industry.trim(),
              role: role.trim(),
              experience: experience.trim(),
              resume: resume.trim(),
              jd: jd.trim(),
            };
            const savedTarget = target
              ? updateTarget(target.id, values)
              : addTarget(values);
            if (!savedTarget) return;
            setIndustry(""); setRole(""); setExperience(""); setResume(""); setJd(""); setResumeMessage("");
            onClose();
            onSuccess?.(savedTarget);
          }}
          className="w-full rounded-xl bg-brand px-4 py-3 font-medium text-white disabled:opacity-40"
        >
          {target ? "保存修改" : "创建并使用"}
        </button>
      </div>
    </Dialog>
  );
}

function TextField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (value: string) => void; placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={3}
        className="w-full resize-none rounded-xl border border-border px-4 py-3 outline-none focus:border-brand" />
    </label>
  );
}
