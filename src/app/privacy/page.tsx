import Link from "next/link";

export default function PrivacyPage() {
  return <main className="mx-auto max-w-3xl px-5 py-12">
    <Link href="/" className="text-sm text-brand">← 返回首页</Link>
    <h1 className="mt-8 text-3xl font-semibold">隐私政策</h1>
    <p className="mt-3 text-sm text-muted">更新时间：2026 年 6 月 14 日</p>
    <div className="mt-8 space-y-6 leading-7 text-muted">
      <section><h2 className="font-semibold text-foreground">当前 MVP 的数据存储</h2><p className="mt-2">当前内部开发版本将手机号、求职目标、提取后的简历文本、回答和复盘记录保存在你的浏览器本地，不会主动上传至远程数据库。上传的 PDF 或 DOCX 原文件仅用于服务端内存解析，当前版本不会保存原文件。</p></section>
      <section><h2 className="font-semibold text-foreground">敏感信息提示</h2><p className="mt-2">请勿填写身份证号、银行卡号、账号密码等与面试准备无关的敏感信息。提交简历和经历前，请自行确认内容适合用于面试准备。</p></section>
      <section><h2 className="font-semibold text-foreground">AI 使用原则</h2><p className="mt-2">当你主动生成面试题或参考应答时，系统会向模型发送当前求职目标、该目标下的简历与岗位 JD 文本，以及完成任务所需的题目或回答上下文；不会发送手机号、验证码或其他求职目标的数据。岗位 JD 仅用于理解岗位要求，不能作为你的个人经历事实。系统不得虚构你的个人经历、职责、成果或数据。AI 参考答案只有在你确认并保存后才会成为个人最终答案。</p></section>
      <section><h2 className="font-semibold text-foreground">正式上线前</h2><p className="mt-2">接入正式登录、数据库和 AI 服务前，本政策将补充数据收集范围、用途、保存期限、第三方服务和用户权利等内容。</p></section>
    </div>
  </main>;
}
