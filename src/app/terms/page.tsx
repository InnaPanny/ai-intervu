import Link from "next/link";

export default function TermsPage() {
  return <main className="mx-auto max-w-3xl px-5 py-12">
    <Link href="/" className="text-sm text-brand">← 返回首页</Link>
    <h1 className="mt-8 text-3xl font-semibold">用户协议</h1>
    <p className="mt-3 text-sm text-muted">更新时间：2026 年 6 月 14 日</p>
    <div className="mt-8 space-y-6 leading-7 text-muted">
      <section><h2 className="font-semibold text-foreground">服务定位</h2><p className="mt-2">本产品用于辅助用户准备、练习和复盘面试回答，不保证面试结果，也不提供唯一标准答案。</p></section>
      <section><h2 className="font-semibold text-foreground">用户责任</h2><p className="mt-2">用户应确认所提供经历和最终答案真实准确，并对使用这些内容产生的结果负责。</p></section>
      <section><h2 className="font-semibold text-foreground">AI 内容</h2><p className="mt-2">AI 输出仅作为回答结构和表达建议。用户应检查事实准确性，并通过“确认并保存”明确选择个人最终答案。</p></section>
      <section><h2 className="font-semibold text-foreground">内部开发版本</h2><p className="mt-2">当前版本用于内部开发验证，功能、数据结构和服务条款可能调整。正式上线前将提供完整协议。</p></section>
    </div>
  </main>;
}
