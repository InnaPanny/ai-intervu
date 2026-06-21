"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageIntro } from "@/components/page-intro";
import { useApp } from "@/components/app-provider";
import { localDate } from "@/lib/practice";

export default function Home() {
  const { data, activeTarget, hydrated } = useApp();
  const targetQuestions = data.questions.filter((question) => question.targetId === activeTarget?.id);
  const focus = targetQuestions.filter((question) => question.inFocusPractice && (!question.nextReviewDate || question.nextReviewDate <= localDate()));
  const pending = targetQuestions.filter((question) => question.status === "pending" && question.core);
  const drafts = data.reviews.filter((review) => review.targetId === activeTarget?.id && review.status === "draft").length;

  return (
    <AppShell>
      <PageIntro eyebrow="首页" title={activeTarget ? `准备 ${activeTarget.role} 面试` : "今天，从一道更真实的回答开始"}
        description={activeTarget ? `${activeTarget.industry} · ${activeTarget.experience}。系统会基于真实信息帮助你准备。` : "登录并创建求职目标后，即可生成具有针对性的面试题。"} />
      {!hydrated ? <p className="text-muted">正在读取本地数据...</p> : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <DashboardCard title="今日待复习" value={`${focus.length} 道`} detail="重点练习会在这里提醒" href="/practice" />
            <DashboardCard title="当前求职目标" value={activeTarget?.role ?? "尚未创建"} detail={activeTarget ? `${activeTarget.industry} · ${activeTarget.experience}` : "点击右上角创建目标"} href="/profile" />
            <DashboardCard title="待练核心题" value={`${pending.length} 道`} detail="优先完成岗位核心问题" href="/questions" />
          </section>
          <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
            <div className="rounded-2xl border border-border bg-surface p-6">
              <p className="text-sm font-medium text-brand">建议下一步</p>
              <h2 className="mt-2 text-xl font-semibold">{activeTarget ? pending.length ? "继续练习核心题" : "生成一批面试题" : data.phone ? "创建你的第一个求职目标" : "登录或设置密码"}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">核心流程会保存到浏览器本地，刷新页面后仍可继续。</p>
              <Link href={activeTarget ? "/questions" : "/profile"} className="mt-5 inline-block rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white">开始准备</Link>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-6">
              <p className="text-sm text-muted">待补充面试复盘</p>
              <p className="mt-3 text-3xl font-semibold">{drafts}</p>
              <Link href="/reviews" className="mt-5 inline-block text-sm font-medium text-brand">查看面试复盘 →</Link>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}

function DashboardCard({ title, value, detail, href }: { title: string; value: string; detail: string; href: string }) {
  return <Link href={href} className="rounded-2xl border border-border bg-surface p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md">
    <p className="text-sm text-muted">{title}</p><p className="mt-3 text-2xl font-semibold">{value}</p><p className="mt-2 text-sm text-muted">{detail}</p>
  </Link>;
}
