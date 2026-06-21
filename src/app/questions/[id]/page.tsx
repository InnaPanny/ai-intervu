"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/components/app-provider";
import { evaluateAnswer } from "@/lib/demo-ai";
import type { AnswerEvaluation } from "@/lib/ai/answer-evaluation";
import { focusPracticePatch, localDate } from "@/lib/practice";
import type { Question } from "@/lib/types";

export default function QuestionPracticePage() {
  const { id } = useParams<{ id: string }>();
  const { data, activeTarget, updateQuestion } = useApp();
  const question = data.questions.find((item) => item.id === id && item.targetId === activeTarget?.id && !item.reviewOnly);

  if (!question || !activeTarget) return <AppShell><p className="text-muted">{data.phone ? "题目不存在，或不属于当前求职目标。" : "登录后可查看和练习题目。"}</p></AppShell>;

  return <PracticeContent key={question.id} question={question} role={activeTarget.role} industry={activeTarget.industry}
    resume={activeTarget.resume} jd={activeTarget.jd} updateQuestion={updateQuestion} />;
}

function PracticeContent({ question, role, industry, resume, jd, updateQuestion }: {
  question: Question;
  role: string;
  industry: string;
  resume?: string;
  jd?: string;
  updateQuestion: (id: string, patch: Partial<Question>) => void;
}) {
  const [answer, setAnswer] = useState(question.draftAnswer ?? question.answer ?? "");
  const [showOutline, setShowOutline] = useState(false);
  const [result, setResult] = useState<AnswerEvaluation | undefined>(
    question.answer ? evaluateAnswer(question.answer, question) : undefined,
  );
  const [finalAnswer, setFinalAnswer] = useState(question.finalAnswer ?? "");
  const [saved, setSaved] = useState(Boolean(question.finalAnswer));
  const [draftSaved, setDraftSaved] = useState(Boolean(question.draftAnswer || question.answer));
  const [generatingReference, setGeneratingReference] = useState(false);
  const [referenceMessage, setReferenceMessage] = useState("");
  const [coaching, setCoaching] = useState(false);
  const [coachingMessage, setCoachingMessage] = useState("");

  async function submit() {
    if (!answer.trim()) return;
    setCoaching(true);
    setCoachingMessage("");
    setDraftSaved(true);
    updateQuestion(question.id, { draftAnswer: answer });
    try {
      const response = await fetch("/api/ai/evaluate-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.text,
          answer,
          intent: question.intent,
          category: question.category,
          focus: question.focus,
        }),
      });
      const next = await response.json() as AnswerEvaluation & { notice?: string; error?: string };
      if (!response.ok || !next.rating) throw new Error(next.error ?? "AI 辅导失败，请稍后重试。");
      const usedHint = Boolean(question.hintUsed || (question.trainingMode && question.trainingMode !== "独立作答"));
      setResult(next);
      setFinalAnswer(question.finalAnswer ?? "");
      setReferenceMessage("");
      setSaved(false);
      setCoachingMessage(next.notice ?? "AI 辅导已完成。");
      updateQuestion(question.id, {
        answer, draftAnswer: answer, status: "completed", rating: next.rating, outline: next.outline,
        keywords: next.keywords, improvement: next.improvement, dimensions: next.dimensions,
        informationGaps: next.informationGaps,
        lastPracticeUsedHint: usedHint, hintUsed: false, ...focusPracticePatch(question, next.rating, usedHint),
      });
    } catch (error) {
      setCoachingMessage(error instanceof Error ? error.message : "AI 辅导失败，你的回答草稿已保存，请稍后重试。");
    } finally {
      setCoaching(false);
    }
  }

  function showHelp() {
    setShowOutline(true);
    updateQuestion(question.id, { hintUsed: true });
  }

  function saveDraft() {
    updateQuestion(question.id, { draftAnswer: answer });
    setDraftSaved(true);
  }

  async function generateReference() {
    if (!answer.trim() || !result) return;
    setGeneratingReference(true);
    setReferenceMessage("");
    try {
      const response = await fetch("/api/ai/reference-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.text,
          answer,
          role,
          industry,
          resume,
          jd,
          intent: question.intent,
          category: question.category,
          focus: question.focus,
          informationGaps: result.informationGaps,
        }),
      });
      const generated = await response.json() as { referenceAnswer?: string; notice?: string; error?: string };
      if (!response.ok || !generated.referenceAnswer) throw new Error(generated.error ?? "生成参考应答失败。");
      setFinalAnswer(generated.referenceAnswer);
      setReferenceMessage(generated.notice ?? "参考应答已生成，请检查事实并编辑后再确认保存。");
      setSaved(false);
    } catch (error) {
      setReferenceMessage(error instanceof Error ? error.message : "生成参考应答失败，请稍后重试。");
    } finally {
      setGeneratingReference(false);
    }
  }

  return <AppShell>
    <Link href="/questions" className="text-sm text-brand">← 返回题库</Link>
    <section className="rounded-3xl bg-foreground p-6 text-white md:p-8">
      <div className="flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-1 text-xs">{question.category}</span>{question.core && <span className="rounded-full bg-white/10 px-3 py-1 text-xs">核心必练</span>}</div>
      <h1 className="mt-5 text-2xl font-semibold leading-9 md:text-3xl">{question.text}</h1>
      <p className="mt-4 text-sm leading-6 text-white/65">考察重点：{question.focus}</p>
    </section>
    {question.inFocusPractice && <TrainingModePanel question={question} />}
    <section className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setShowOutline(false)} className="rounded-xl bg-brand px-4 py-2 text-sm text-white">开始作答</button>
        <button onClick={showHelp} className="rounded-xl border border-border px-4 py-2 text-sm">帮我梳理回答思路</button>
        <button onClick={showHelp} className="rounded-xl border border-border px-4 py-2 text-sm">查看回答结构</button>
      </div>
      {showOutline && <div className="mt-5 rounded-xl bg-brand-soft p-4 text-sm leading-7 text-brand"><strong>回答结构提示：</strong> 先说明真实背景与目标，再说明你的具体行动和判断依据，最后总结结果与经验。使用提示会记录为本次练习获得过帮助。</div>}
      <label className="mt-5 block"><span className="mb-2 block text-sm font-medium">你的回答</span>
        <textarea value={answer} onChange={(event) => { setAnswer(event.target.value); setDraftSaved(false); }} onBlur={saveDraft} rows={8} placeholder="请基于真实经历作答。你可以随时停止，已经完成的内容会被保存。"
          className="w-full resize-none rounded-xl border border-border p-4 leading-7 outline-none focus:border-brand" /></label>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button disabled={!answer.trim() || coaching} onClick={submit} className="rounded-xl bg-brand px-5 py-3 font-medium text-white disabled:opacity-40">{coaching ? "AI 正在分析..." : "提交并获得 AI 辅导"}</button>
        <button disabled={!answer.trim() || draftSaved} onClick={saveDraft} className="rounded-xl border border-border px-5 py-3 text-sm disabled:opacity-40">{draftSaved ? "草稿已保存" : "保存回答草稿"}</button>
      </div>
      {coachingMessage && <p role="status" className="mt-4 rounded-xl bg-brand-soft px-4 py-3 text-sm leading-6 text-brand">{coachingMessage}</p>}
    </section>
    {result && <section className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
      <div className="space-y-5">
        <ResultCard title="维度评级">
          <p className={`text-xl font-semibold ${ratingClass(result.rating)}`}>{result.rating}</p>
          <p className="mt-3 text-sm leading-6 text-muted">{result.improvement}</p>
          <div className="mt-5 space-y-4">{result.dimensions.map((item) => <div key={item.dimension} className="border-t border-border pt-4">
            <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{item.dimension}</p><span className={`text-xs font-medium ${ratingClass(item.rating)}`}>{item.rating}</span></div>
            <p className="mt-2 text-sm leading-6 text-muted">{item.feedback}</p>
          </div>)}</div>
        </ResultCard>
        <ResultCard title="信息缺口">
          {result.informationGaps.length ? result.informationGaps.map((gap) => <p key={gap} className="mt-2 text-sm leading-6 text-muted">- {gap}</p>) : <p className="text-sm text-success">当前回答没有明显信息缺口。</p>}
        </ResultCard>
        <ResultCard title="回答结构">{result.outline.map((item, index) => <p key={item} className="mt-2 text-sm">{index + 1}. {item}</p>)}</ResultCard>
        <ResultCard title="关键词提纲"><div className="flex flex-wrap gap-2">{result.keywords.map((word) => <span key={word} className="rounded-full bg-background px-3 py-1 text-xs">{word}</span>)}</div></ResultCard>
      </div>
      <ResultCard title="AI 参考应答与个人最终答案">
        <p className="mb-3 text-sm leading-6 text-muted">远程 AI 会结合题型、当前回答和已上传简历生成新的可口述参考应答，岗位 JD 用于理解岗位要求。经历类题目只使用回答与简历中可确认的个人事实。</p>
        <button disabled={generatingReference || !answer.trim()} onClick={generateReference}
          className="mb-4 rounded-xl border border-brand px-4 py-2 text-sm font-medium text-brand disabled:opacity-40">
          {generatingReference ? "正在生成参考应答..." : finalAnswer ? "重新生成 AI 参考应答" : "生成 AI 参考应答"}
        </button>
        {referenceMessage && <p role="status" className="mb-4 rounded-xl bg-brand-soft px-4 py-3 text-sm leading-6 text-brand">{referenceMessage}</p>}
        <textarea value={finalAnswer} onChange={(event) => { setFinalAnswer(event.target.value); setSaved(false); }} rows={12}
          placeholder="点击“生成 AI 参考应答”，或直接在这里整理自己的最终答案。"
          className="w-full resize-none rounded-xl border border-border p-4 leading-7 outline-none focus:border-brand" />
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            disabled={!finalAnswer.trim()}
            onClick={() => { updateQuestion(question.id, { finalAnswer }); setSaved(true); }}
            className="rounded-xl bg-brand px-4 py-2 text-sm text-white disabled:opacity-40"
          >
            {saved ? "已保存" : "确认并保存"}
          </button>
          <button onClick={() => updateQuestion(question.id, question.inFocusPractice
            ? { inFocusPractice: false }
            : { inFocusPractice: true, focusCompleted: false, nextReviewDate: localDate(), mastery: question.mastery ?? "未练习" })}
            className="rounded-xl border border-border px-4 py-2 text-sm">{question.inFocusPractice ? "移出重点练习" : "加入重点练习"}</button>
          <button onClick={() => updateQuestion(question.id, { helpful: true })} className="rounded-xl border border-border px-4 py-2 text-sm">有帮助</button>
          <button onClick={() => updateQuestion(question.id, { helpful: false })} className="rounded-xl border border-border px-4 py-2 text-sm">没帮助</button>
        </div>
        {saved && <p className="mt-3 text-sm font-medium text-success">个人最终答案已保存，刷新或重新进入本题仍可查看。</p>}
      </ResultCard>
    </section>}
  </AppShell>;
}

function ResultCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <article className="rounded-2xl border border-border bg-surface p-5"><h2 className="mb-4 font-semibold">{title}</h2>{children}</article>;
}

function ratingClass(rating: Question["rating"]) {
  if (rating === "表现优秀" || rating === "基本达标") return "text-success";
  return "text-warning";
}

function TrainingModePanel({ question }: { question: Question }) {
  const mode = question.trainingMode ?? "独立作答";
  if (mode === "关键词回忆") {
    return <section className="rounded-2xl border border-brand/20 bg-brand-soft p-5">
      <p className="text-sm font-medium text-brand">关键词回忆</p>
      <div className="mt-3 flex flex-wrap gap-2">{(question.keywords ?? ["背景", "行动", "个人贡献", "结果", "复盘"]).map((keyword) => <span key={keyword} className="rounded-full bg-surface px-3 py-1 text-xs text-brand">{keyword}</span>)}</div>
      <p className="mt-3 text-sm leading-6 text-brand">请先根据关键词回忆完整答案。使用关键词会记录为本次获得过提示。</p>
    </section>;
  }
  if (mode === "回答结构填空") {
    return <section className="rounded-2xl border border-brand/20 bg-brand-soft p-5">
      <p className="text-sm font-medium text-brand">回答结构填空</p>
      <div className="mt-3 grid gap-2 md:grid-cols-3">{(question.outline ?? ["背景与目标", "具体行动", "结果与复盘"]).map((item) => <div key={item} className="rounded-xl bg-surface p-3 text-sm text-brand">{item}：________</div>)}</div>
      <p className="mt-3 text-sm leading-6 text-brand">按结构补充真实内容。使用结构会记录为本次获得过提示。</p>
    </section>;
  }
  return <section className="rounded-2xl border border-border bg-surface px-5 py-4 text-sm text-muted">本次为独立作答，不展示关键词或回答结构。</section>;
}
