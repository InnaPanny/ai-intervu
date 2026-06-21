"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageIntro } from "@/components/page-intro";
import { Dialog } from "@/components/dialog";
import { LoginDialog } from "@/components/login-dialog";
import { TargetDialog } from "@/components/target-dialog";
import { useApp } from "@/components/app-provider";
import { inferQuestionIntent } from "@/lib/demo-ai";
import type { Question, Target } from "@/lib/types";

export default function QuestionsPage() {
  const { data, activeTarget, addQuestions, updateQuestion } = useApp();
  const [loginOpen, setLoginOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const [tab, setTab] = useState<"pending" | "completed">("pending");
  const [confirmHide, setConfirmHide] = useState<Question>();
  const [generationMessage, setGenerationMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const questions = data.questions.filter((question) => question.targetId === activeTarget?.id && !question.reviewOnly && question.status === tab);
  const emptyDescription = !data.phone
    ? "请先登录，再创建求职目标开始准备。"
    : !activeTarget
      ? "请先创建求职目标，系统会根据目标岗位生成针对性的面试题。"
      : tab === "pending"
        ? "点击“生成一批新题”开始准备。"
        : "完成练习后，题目会出现在这里。";

  async function generateFor(target: Target) {
    setGenerating(true);
    setGenerationMessage("");
    const existing = new Set(data.questions.filter((question) => question.targetId === target.id).map((question) => question.intent));
    const existingQuestions = data.questions.filter((question) => question.targetId === target.id).map((question) => question.text);
    data.reviews
      .filter((review) => review.targetId === target.id)
      .flatMap((review) => review.questions)
      .forEach((question) => {
        existing.add(inferQuestionIntent(question.text));
        existingQuestions.push(question.text);
      });
    try {
      const response = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, existingIntents: [...existing], existingQuestions }),
      });
      const result = await response.json() as { questions?: Question[]; notice?: string; error?: string };
      if (!response.ok || !result.questions) throw new Error(result.error ?? "生成题目失败。");
      addQuestions(result.questions);
      setGenerationMessage(result.questions.length
        ? `${result.notice ?? `已生成 ${result.questions.length} 道新题。`} 原有待练题已保留。`
        : "暂时没有更多高质量新题。可补充简历或岗位 JD，之后再试。");
    } catch (error) {
      setGenerationMessage(error instanceof Error ? error.message : "生成题目失败，请稍后重试。");
    } finally {
      setGenerating(false);
    }
  }

  function generate() {
    if (!data.phone) return setLoginOpen(true);
    if (!activeTarget) return setTargetOpen(true);
    generateFor(activeTarget);
  }

  function hideQuestion(question: Question) {
    if (question.status === "hidden") return;
    updateQuestion(question.id, { status: "hidden", hiddenFromStatus: question.status });
  }

  return <AppShell>
    <PageIntro eyebrow="面试押题" title={activeTarget ? `${activeTarget.role} 面试题` : "生成具有针对性的面试题"}
      description="每批最多生成 15 道新题，其中最多 7 道核心题；历史题目会参与语义去重。" />
    {activeTarget && !activeTarget.resume && !activeTarget.jd && <div className="rounded-xl border border-brand/20 bg-brand-soft px-4 py-3 text-sm text-brand">上传简历或岗位 JD，可以生成更具有针对性的面试题。</div>}
    <section className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap gap-2">
        {([["pending","待练题"],["completed","已刷题"]] as const).map(([value,label]) =>
          <button key={value} onClick={() => setTab(value)} className={`rounded-xl px-4 py-2 text-sm ${tab === value ? "bg-foreground text-white" : "border border-border bg-surface"}`}>{label}</button>)}
      </div>
      <button disabled={generating} onClick={generate} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white disabled:opacity-70">
        {generating && <span aria-hidden="true" className="h-3 w-3 rounded-full border-2 border-white/35 border-t-white animate-spin" />}
        {generating ? "AI 正在生成" : activeTarget ? "生成一批新题" : "创建求职目标"}
      </button>
    </section>
    {generating && <QuestionGenerationLoading />}
    {generationMessage && <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">{generationMessage}</p>}
    <section className="space-y-4">
      {questions.map((question) => <article key={question.id} className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap gap-2"><span className="rounded-full bg-background px-3 py-1 text-xs text-muted">{question.category}</span>
          {question.core && <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand">核心必练</span>}</div>
        <h2 className="mt-4 text-lg font-semibold">{question.text}</h2><p className="mt-2 text-sm leading-6 text-muted">推荐原因：{question.reason}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={`/questions/${question.id}`} className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white">{question.status === "completed" ? "再次练习" : "开始练习"}</Link>
          <button onClick={() => question.core ? setConfirmHide(question) : hideQuestion(question)} className="rounded-xl border border-border px-4 py-2 text-sm">不再显示</button>
        </div>
      </article>)}
      {!questions.length && <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center"><p className="font-semibold">{tab === "pending" ? "还没有待练题" : "这里暂时没有题目"}</p><p className="mt-2 text-sm text-muted">{emptyDescription}</p></div>}
    </section>
    <LoginDialog
      open={loginOpen}
      onClose={() => setLoginOpen(false)}
      onSuccess={() => {
        const savedTarget = data.targets.find((target) => target.id === data.activeTargetId);
        if (savedTarget) generateFor(savedTarget);
        else setTargetOpen(true);
      }}
    />
    <TargetDialog open={targetOpen} onClose={() => setTargetOpen(false)} onSuccess={generateFor} />
    <Dialog open={Boolean(confirmHide)} onClose={() => setConfirmHide(undefined)} title="确认不再显示核心题？"
      description="这是当前岗位的高频核心题。隐藏后不会再次生成，可在“我的”中恢复。">
      <div className="flex justify-end gap-3">
        <button onClick={() => setConfirmHide(undefined)} className="rounded-xl border border-border px-4 py-2 text-sm">继续保留</button>
        <button onClick={() => {
          if (confirmHide) hideQuestion(confirmHide);
          setConfirmHide(undefined);
        }} className="rounded-xl bg-brand px-4 py-2 text-sm text-white">确认不再显示</button>
      </div>
    </Dialog>
  </AppShell>;
}

function QuestionGenerationLoading() {
  const cards = ["岗位常见题", "经历深挖题", "能力验证题"];

  return (
    <div role="status" aria-live="polite" className="overflow-hidden rounded-2xl border border-brand/20 bg-brand-soft p-4 text-brand">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold">AI 正在整理本轮练习题</p>
          <p className="mt-1 text-sm leading-6 text-brand/75">正在匹配岗位重点、过滤重复题目，并挑出适合加入重点练习的候选题。</p>
        </div>
        <div className="question-thinking flex items-end gap-2" aria-hidden="true">
          {cards.map((card, index) => (
            <span key={card} className="question-thinking-card" style={{ animationDelay: `${index * 120}ms` }}>
              <span className="question-thinking-spark" />
              {card}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
