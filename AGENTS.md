# AI 开发协作规则

## 产品基线

- 开发前阅读 `docs/PRODUCT_DISCUSSION_HISTORY.md`、`docs/MVP_PRD.md` 与 `docs/IMPLEMENTATION_PLAN.md`。
- 第一版是响应式网页，不实现微信小程序、语音面试或付费能力。
- 面试回答不存在唯一标准答案，统一使用“重点练习”，不得使用“错题本”。

## 业务红线

- AI 不得虚构用户经历、职责、成果或数据。
- 信息不足时必须标记信息缺口，不得自行补全；MVP 不实现追问环节。
- AI 参考答案必须经用户点击“确认并保存”后，才能成为个人最终答案。
- AI 可以推荐题目分类，但不得自动替用户加入重点练习。

## 工程规则

- 使用 Next.js App Router、TypeScript 与 Tailwind CSS。
- 默认使用 Server Components，仅在需要交互时使用 Client Components。
- AI、数据库和第三方服务仅在服务端调用，并采用延迟初始化。
- 页面需要同时适配桌面端与移动端。
- 新功能必须覆盖关键业务状态与失败场景。

## 验证

完成修改后至少运行：

```bash
npm run lint
npm run build
```
