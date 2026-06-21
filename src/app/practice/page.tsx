"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageIntro } from "@/components/page-intro";
import { useApp } from "@/components/app-provider";
import { localDate } from "@/lib/practice";
import type { TrainingMode } from "@/lib/types";

const modes: TrainingMode[] = ["关键词回忆", "独立作答", "回答结构填空"];

export default function PracticePage() {
  const { data, activeTarget, updateQuestion } = useApp();
  const [tab, setTab] = useState<"today" | "all" | "completed">("today");
  const targetQuestions = data.questions.filter((question) => question.targetId === activeTarget?.id);
  const today = localDate();
  const questions = targetQuestions.filter((question) => {
    if (tab === "completed") return question.focusCompleted;
    if (!question.inFocusPractice) return false;
    return tab === "all" || !question.nextReviewDate || question.nextReviewDate <= today;
  });

  return <AppShell>
    <PageIntro eyebrow="重点练习" title="把需要提升的回答练得更稳" description="连续两次间隔复习表现优秀后，系统会自动完成强化；历史练习记录始终保留。" />
    <section className="flex flex-wrap gap-2">
      {([["today", "今日复习"], ["all", "全部重点练习"], ["completed", "已完成强化"]] as const).map(([value, label]) =>
        <button key={value} onClick={() => setTab(value)} className={`rounded-xl px-4 py-2 text-sm ${tab === value ? "bg-foreground text-white" : "border border-border bg-surface"}`}>{label}</button>)}
    </section>
    <section className="grid gap-4">
      {questions.map((question) => <article key={question.id} className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-brand-soft px-3 py-1 text-xs text-brand">{question.mastery ?? "未练习"}</span>
              {question.focusCompleted && <span className="rounded-full bg-background px-3 py-1 text-xs text-success">已完成强化</span>}
            </div>
            <h2 className="mt-4 text-lg font-semibold">{question.text}</h2>
            <p className="mt-2 text-sm text-muted">建议提升项：{question.improvement ?? "完成一次练习后生成"}</p>
          </div>
          <div className="text-right text-sm text-muted">
            <p>已复习 {question.reviewCount ?? 0} 次</p>
            {!question.focusCompleted && <p className="mt-1">下次复习：{question.nextReviewDate ?? "今天"}</p>}
            <p className="mt-1">间隔优秀 {question.intervalExcellentStreak ?? 0} / 2 次</p>
          </div>
        </div>
        {!question.focusCompleted && <>
          <div className="mt-5">
            <p className="mb-2 text-sm font-medium">本次训练方式</p>
            <div className="flex flex-wrap gap-2">{modes.map((mode) => <button key={mode} onClick={() => updateQuestion(question.id, { trainingMode: mode, hintUsed: mode !== "独立作答" })}
              className={`rounded-xl px-3 py-2 text-sm ${question.trainingMode === mode || (!question.trainingMode && mode === "独立作答") ? "bg-brand-soft text-brand" : "border border-border"}`}>{mode}</button>)}</div>
            <p className="mt-3 text-sm leading-6 text-muted">{modeDescription(question.trainingMode ?? "独立作答")}</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/questions/${question.id}`} className="rounded-xl bg-brand px-4 py-2 text-sm text-white">{tab === "today" ? "开始今日复习" : "开始强化练习"}</Link>
            <button onClick={() => updateQuestion(question.id, { inFocusPractice: false })} className="rounded-xl border border-border px-4 py-2 text-sm">移出重点练习</button>
          </div>
        </>}
      </article>)}
      {!questions.length && <EmptyState tab={tab} />}
    </section>
  </AppShell>;
}

function modeDescription(mode: TrainingMode) {
  if (mode === "关键词回忆") return "先根据关键词回忆完整答案，再进入题目检查遗漏。";
  if (mode === "回答结构填空") return "按背景、行动、结果和复盘逐段补充真实内容。";
  return "不查看提示，独立完成回答，用于判断真实掌握程度。";
}

function EmptyState({ tab }: { tab: "today" | "all" | "completed" }) {
  const title = tab === "today" ? "今天没有待复习题目" : tab === "completed" ? "还没有完成强化的题目" : "暂时没有重点练习";
  return <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
    <p className="font-semibold">{title}</p>
    <p className="mt-2 text-sm text-muted">完成题目后，可以根据自己的判断加入重点练习。</p>
    <Link href="/questions" className="mt-5 inline-block rounded-xl bg-brand px-4 py-2 text-sm text-white">前往面试押题</Link>
  </div>;
}
