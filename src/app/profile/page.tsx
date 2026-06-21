"use client";

import { useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Dialog } from "@/components/dialog";
import { PageIntro } from "@/components/page-intro";
import { LoginDialog } from "@/components/login-dialog";
import { TargetDialog } from "@/components/target-dialog";
import { useApp } from "@/components/app-provider";
import type { AppData, Target } from "@/lib/types";

export default function ProfilePage() {
  const { data, activeTarget, setActiveTarget, replaceData, clearData, logout } = useApp();
  const [loginOpen, setLoginOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<Target>();
  const [confirmClear, setConfirmClear] = useState(false);
  const [dataMessage, setDataMessage] = useState("");
  const importInput = useRef<HTMLInputElement>(null);

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `interview-coach-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setDataMessage("数据备份已导出。请妥善保管，其中可能包含个人求职信息。");
  }

  async function importData(file?: File) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      if (!isAppData(parsed)) throw new Error("invalid");
      replaceData(parsed);
      setDataMessage("数据备份已恢复。");
    } catch {
      setDataMessage("无法恢复该文件。请选择由本产品导出的有效 JSON 备份。");
    } finally {
      if (importInput.current) importInput.current.value = "";
    }
  }

  return <AppShell>
    <PageIntro eyebrow="我的" title="管理账户与求职目标" description="不同求职目标的题目、答案和练习记录相互独立。" />
    <section className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm text-muted">当前账户</p><p className="mt-1 font-semibold">{data.phone ?? "尚未登录"}</p></div>
        {data.phone ? <button onClick={logout} className="rounded-xl border border-border px-4 py-2 text-sm">退出登录</button>
          : <button onClick={() => setLoginOpen(true)} className="rounded-xl bg-brand px-4 py-2 text-sm text-white">手机号登录</button>}
      </div>
    </section>
    <section>
      <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">求职目标</h2>
        <button onClick={() => {
          if (!data.phone) return setLoginOpen(true);
          setEditingTarget(undefined);
          setTargetOpen(true);
        }} className="rounded-xl bg-brand px-4 py-2 text-sm text-white">创建新目标</button></div>
      <div className="grid gap-4 md:grid-cols-2">
        {data.phone && data.targets.map((target) => <button key={target.id} onClick={() => {
          setActiveTarget(target.id);
          setEditingTarget(target);
          setTargetOpen(true);
        }}
          aria-label={`编辑求职目标：${target.role}`}
          className={`rounded-2xl border p-5 text-left ${activeTarget?.id === target.id ? "border-brand bg-brand-soft" : "border-border bg-surface"}`}>
          <p className="font-semibold">{target.role}</p><p className="mt-2 text-sm text-muted">{target.industry} · {target.experience}</p>
          <p className="mt-3 text-xs text-muted">{target.resume || target.jd ? "已补充资料" : "尚未补充简历与 JD"}</p>
        </button>)}
        {(!data.phone || !data.targets.length) && <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">{data.phone ? "尚未创建求职目标" : "登录后可查看和管理求职目标"}</p>}
      </div>
    </section>
    <section>
      <div className="mb-4">
        <h2 className="text-xl font-semibold">本地数据管理</h2>
        <p className="mt-2 text-sm leading-6 text-muted">当前 MVP 将数据保存在此浏览器中。建议定期导出备份，避免清理浏览器缓存后丢失。</p>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex flex-wrap gap-3">
          <button onClick={exportData} className="rounded-xl bg-brand px-4 py-2 text-sm text-white">导出数据备份</button>
          <button onClick={() => importInput.current?.click()} className="rounded-xl border border-border px-4 py-2 text-sm">从备份恢复</button>
          <button onClick={() => setConfirmClear(true)} className="rounded-xl border border-warning/30 px-4 py-2 text-sm text-warning">清空当前账户数据</button>
          <input ref={importInput} type="file" accept="application/json,.json" className="hidden" onChange={(event) => importData(event.target.files?.[0])} />
        </div>
        {dataMessage && <p className="mt-4 rounded-xl bg-background px-4 py-3 text-sm leading-6 text-muted">{dataMessage}</p>}
      </div>
    </section>
    <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    <TargetDialog open={targetOpen} target={editingTarget} onClose={() => {
      setTargetOpen(false);
      setEditingTarget(undefined);
    }} />
    <Dialog open={confirmClear} onClose={() => setConfirmClear(false)} title="确认清空当前账户数据？"
      description="这会删除当前手机号下的求职目标、题目、答案、重点练习和面试复盘，且无法撤销。建议先导出数据备份。">
      <div className="flex justify-end gap-3">
        <button onClick={() => setConfirmClear(false)} className="rounded-xl border border-border px-4 py-2 text-sm">取消</button>
        <button onClick={() => { clearData(); setConfirmClear(false); setDataMessage("当前账户数据已清空。"); }}
          className="rounded-xl bg-warning px-4 py-2 text-sm text-white">确认清空</button>
      </div>
    </Dialog>
  </AppShell>;
}

function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AppData>;
  return Array.isArray(candidate.targets) && Array.isArray(candidate.questions) && Array.isArray(candidate.reviews);
}
