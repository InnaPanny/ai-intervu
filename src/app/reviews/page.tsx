"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageIntro } from "@/components/page-intro";
import { Dialog } from "@/components/dialog";
import { Field } from "@/components/login-dialog";
import { LoginDialog } from "@/components/login-dialog";
import { TargetDialog } from "@/components/target-dialog";
import { useApp } from "@/components/app-provider";
import { evaluateAnswer, inferQuestionIntent } from "@/lib/demo-ai";
import { localDate } from "@/lib/practice";
import type { InterviewReview, ReviewQuestion } from "@/lib/types";

export default function ReviewsPage() {
  const { data, activeTarget, addReview, updateReview, addQuestions, updateQuestion } = useApp();
  const [open, setOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const reviews = data.reviews
    .filter((review) => review.targetId === activeTarget?.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const selected = reviews.find((review) => review.id === selectedId);

  function classify(review: InterviewReview, item: ReviewQuestion, classification: ReviewQuestion["classification"]) {
    updateReview(review.id, { questions: review.questions.map((question) => question.id === item.id ? { ...question, classification } : question) });
    const intent = inferQuestionIntent(item.text);
    const existing = data.questions.find((question) => question.targetId === review.targetId && question.intent === intent);
    if (existing) {
      if (classification === "focus") updateQuestionForClassification(existing.id, {
        reviewOnly: false, inFocusPractice: true, focusCompleted: false, nextReviewDate: localDate(),
        status: existing.status === "hidden" ? "pending" : existing.status,
      });
      if (classification === "pending") updateQuestionForClassification(existing.id, {
        reviewOnly: false, inFocusPractice: false, status: existing.status === "hidden" ? "pending" : existing.status,
      });
      if (classification === "record") updateQuestionForClassification(existing.id, { reviewOnly: true, inFocusPractice: false });
      if (classification === "hidden") updateQuestionForClassification(existing.id, {
        reviewOnly: false, inFocusPractice: false, status: "hidden",
        hiddenFromStatus: existing.status === "hidden" ? existing.hiddenFromStatus : existing.status,
      });
    } else if (classification === "pending" || classification === "focus") {
      addQuestions([{
        id: crypto.randomUUID(), targetId: review.targetId, text: item.text, intent, category: "现实面试",
        reason: "该问题来自你的现实面试复盘", focus: "基于真实经历重新组织回答", core: false, status: "pending",
        inFocusPractice: classification === "focus", nextReviewDate: classification === "focus" ? localDate() : undefined,
        source: "review", createdAt: new Date().toISOString(),
      }]);
    }
  }

  function updateQuestionForClassification(id: string, patch: Parameters<typeof updateQuestion>[1]) {
    updateQuestion(id, patch);
  }

  function startReview() {
    if (!data.phone) return setLoginOpen(true);
    if (!activeTarget) return setTargetOpen(true);
    setOpen(true);
  }

  return <AppShell>
    <PageIntro eyebrow="面试复盘" title="记录现实面试，准备下一次回答" description="复盘默认按照面试日期由近及远排序，现实面试问题也会参与后续题目去重。" />
    <div className="flex justify-end"><button onClick={startReview} className="rounded-xl bg-brand px-4 py-2.5 text-sm text-white">记录面试复盘</button></div>
    <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="space-y-3">
        {reviews.map((review) => <button key={review.id} onClick={() => setSelectedId(review.id)}
          className={`w-full rounded-2xl border p-5 text-left ${selectedId === review.id ? "border-brand bg-brand-soft" : "border-border bg-surface"}`}>
          <div className="flex justify-between gap-3"><p className="font-semibold">{review.role}</p><span className="text-xs text-muted">{review.date}</span></div>
          <p className="mt-2 text-sm text-muted">{review.company || "未填写公司"} · {review.questions.length} 道问题</p>
          {review.status === "draft" && <span className="mt-3 inline-block rounded-full bg-background px-3 py-1 text-xs text-warning">待补充</span>}
        </button>)}
        {!reviews.length && <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">还没有面试复盘</p>}
      </div>
      <div>{selected ? <ReviewDetail review={selected} resume={activeTarget?.resume} jd={activeTarget?.jd} updateReview={updateReview} classify={classify} /> :
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">选择一场面试查看详情，或创建新的复盘。</div>}</div>
    </section>
    {activeTarget && <NewReviewDialog key={activeTarget.id} open={open} onClose={() => setOpen(false)} targetId={activeTarget.id} role={activeTarget.role} industry={activeTarget.industry} addReview={(review) => { addReview(review); setSelectedId(review.id); }} />}
    <LoginDialog
      open={loginOpen}
      onClose={() => setLoginOpen(false)}
      onSuccess={() => {
        if (data.activeTargetId) setOpen(true);
        else setTargetOpen(true);
      }}
    />
    <TargetDialog open={targetOpen} onClose={() => setTargetOpen(false)} onSuccess={() => setOpen(true)} />
  </AppShell>;
}

function NewReviewDialog({ open, onClose, targetId, role: initialRole, industry: initialIndustry, addReview }: {
  open: boolean; onClose: () => void; targetId: string; role: string; industry: string; addReview: (review: InterviewReview) => void;
}) {
  const [role, setRole] = useState(initialRole);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState(initialIndustry);
  return <Dialog open={open} onClose={onClose} title="记录面试复盘" description="只填写岗位和日期即可先保存草稿。">
    <div className="space-y-4"><Field label="应聘岗位（必填）" value={role} onChange={setRole} /><Field label="面试日期（必填）" value={date} onChange={setDate} type="date" /><Field label="应聘公司（选填）" value={company} onChange={setCompany} /><Field label="所属行业（选填）" value={industry} onChange={setIndustry} />
      <button disabled={!role || !date} onClick={() => { const review = { id: crypto.randomUUID(), targetId, role, date, company, industry, status: "draft", questions: [], createdAt: new Date().toISOString() } satisfies InterviewReview; addReview(review); onClose(); }} className="w-full rounded-xl bg-brand px-4 py-3 text-white disabled:opacity-40">保存草稿</button></div>
  </Dialog>;
}

function ReviewDetail({ review, resume, jd, updateReview, classify }: {
  review: InterviewReview; updateReview: (id: string, patch: Partial<InterviewReview>) => void;
  resume?: string; jd?: string;
  classify: (review: InterviewReview, item: ReviewQuestion, classification: ReviewQuestion["classification"]) => void;
}) {
  const [text, setText] = useState("");
  const [actualAnswer, setActualAnswer] = useState("");
  function add() {
    const item = { id: crypto.randomUUID(), text, actualAnswer, classification: "record" } satisfies ReviewQuestion;
    updateReview(review.id, { questions: [...review.questions, item] }); setText(""); setActualAnswer("");
  }
  function updateItem(itemId: string, patch: Partial<ReviewQuestion>) {
    updateReview(review.id, { questions: review.questions.map((question) => question.id === itemId ? { ...question, ...patch } : question) });
  }
  return <section className="rounded-2xl border border-border bg-surface p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="text-xl font-semibold">{review.role}</h2><p className="mt-2 text-sm text-muted">{review.date}{review.company ? ` · ${review.company}` : ""}</p></div>
      <span className={`rounded-full px-3 py-1 text-xs ${review.status === "completed" ? "bg-brand-soft text-success" : "bg-background text-warning"}`}>{review.status === "completed" ? "已完成" : "待补充"}</span>
    </div>
    <div className="mt-6 space-y-4">
      {review.questions.map((item, index) => <ReviewQuestionCard key={item.id} item={item} index={index}
        role={review.role} industry={review.industry} resume={resume} jd={jd} onUpdate={(patch) => updateItem(item.id, patch)}
        onClassify={(classification) => classify(review, item, classification)} />)}
    </div>
    <div className="mt-6 border-t border-border pt-6"><h3 className="font-semibold">添加面试问答</h3>
      <input value={text} onChange={(event) => setText(event.target.value)} placeholder="面试官提出的问题" className="mt-3 w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-brand" />
      <textarea value={actualAnswer} onChange={(event) => setActualAnswer(event.target.value)} placeholder="现实中的实际回答（选填）" rows={4} className="mt-3 w-full resize-none rounded-xl border border-border p-4 outline-none focus:border-brand" />
      <button disabled={!text.trim()} onClick={add} className="mt-3 rounded-xl bg-brand px-4 py-2 text-sm text-white disabled:opacity-40">添加问题并继续补充</button></div>
    <div className="mt-6 flex justify-end border-t border-border pt-6">
      <button disabled={!review.questions.length || review.status === "completed"} onClick={() => updateReview(review.id, { status: "completed" })}
        className="rounded-xl bg-brand px-4 py-2 text-sm text-white disabled:opacity-40">{review.status === "completed" ? "复盘已完成" : "完成复盘"}</button>
    </div>
  </section>;
}

function ReviewQuestionCard({ item, index, role, industry, resume, jd, onUpdate, onClassify }: {
  item: ReviewQuestion;
  index: number;
  role: string;
  industry?: string;
  resume?: string;
  jd?: string;
  onUpdate: (patch: Partial<ReviewQuestion>) => void;
  onClassify: (classification: ReviewQuestion["classification"]) => void;
}) {
  const [finalAnswer, setFinalAnswer] = useState(item.finalAnswer ?? item.referenceAnswer ?? "");
  const [saved, setSaved] = useState(Boolean(item.finalAnswer));
  const [generating, setGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState("");

  async function generateReference() {
    const intent = inferQuestionIntent(item.text);
    const context = { intent, category: "现实面试", focus: "针对现实面试问题准备更好的回答", text: item.text };
    const informationGaps = item.actualAnswer ? evaluateAnswer(item.actualAnswer, context).informationGaps : [];
    setGenerating(true);
    setGenerationMessage("");
    try {
      const response = await fetch("/api/ai/reference-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: item.text,
          answer: item.actualAnswer ?? "",
          role,
          industry,
          resume,
          jd,
          intent,
          category: "现实面试",
          focus: context.focus,
          informationGaps,
        }),
      });
      const generated = await response.json() as { referenceAnswer?: string; notice?: string; error?: string };
      if (!response.ok || !generated.referenceAnswer) throw new Error(generated.error ?? "生成参考应答失败。");
      onUpdate({ referenceAnswer: generated.referenceAnswer });
      setFinalAnswer(generated.referenceAnswer);
      setSaved(false);
      setGenerationMessage(generated.notice ?? "AI 参考应答已生成，请检查事实后再确认保存。");
    } catch (error) {
      setGenerationMessage(error instanceof Error ? error.message : "生成参考应答失败，请稍后重试。");
    } finally {
      setGenerating(false);
    }
  }

  return <article className="rounded-xl bg-background p-4">
    <p className="font-medium">{index + 1}. {item.text}</p>
    {item.actualAnswer && <p className="mt-3 text-sm leading-6 text-muted">实际回答：{item.actualAnswer}</p>}
    {item.referenceAnswer && <div className="mt-4">
      <p className="mb-2 text-sm font-medium">AI 参考应答与个人最终答案</p>
      <p className="mb-3 text-sm leading-6 text-muted">请检查事实并编辑，只有点击“确认并保存”后才会成为个人最终答案。</p>
      <textarea value={finalAnswer} onChange={(event) => { setFinalAnswer(event.target.value); setSaved(false); }} rows={6}
        className="w-full resize-none rounded-xl border border-border bg-surface p-3 text-sm leading-6 outline-none focus:border-brand" />
      <button disabled={!finalAnswer.trim()} onClick={() => { onUpdate({ finalAnswer }); setSaved(true); }}
        className="mt-3 rounded-lg bg-brand px-3 py-2 text-xs text-white disabled:opacity-40">{saved ? "个人最终答案已保存" : "确认并保存"}</button>
    </div>}
    {generationMessage && <p role="status" className="mt-4 rounded-lg bg-brand-soft px-3 py-2 text-xs leading-5 text-brand">{generationMessage}</p>}
    <div className="mt-4 flex flex-wrap gap-2">
      <button disabled={generating} onClick={generateReference}
        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs disabled:opacity-40">
        {generating ? "正在生成..." : item.referenceAnswer ? "重新生成 AI 参考应答" : "生成 AI 参考应答"}
      </button>
      {([["focus","加入重点练习"],["pending","加入待练题"],["record","仅保存记录"],["hidden","不再显示"]] as const).map(([value,label]) => <button key={value} onClick={() => onClassify(value)} className={`rounded-lg px-3 py-1.5 text-xs ${item.classification === value ? "bg-brand text-white" : "border border-border bg-surface"}`}>{label}</button>)}
    </div>
  </article>;
}
