# AI 面试教练

面向求职者的响应式网页 MVP，帮助用户基于真实经历准备面试题、优化回答、进行重点练习，并记录现实面试复盘。

## 当前阶段

项目已完成可本地运行的响应式网页 MVP。当前使用浏览器本地存储；配置远程模型服务后可使用动态题目生成、回答辅导和参考应答，未配置或远程调用失败时仍可通过本地规则体验主流程。

- [MVP 产品需求文档](docs/MVP_PRD.md)
- [研发实施计划](docs/IMPLEMENTATION_PLAN.md)
- [产品讨论历史](docs/PRODUCT_DISCUSSION_HISTORY.md)
- [后端接入说明](docs/BACKEND_SETUP.md)
- [中国市场技术架构决策](docs/ARCHITECTURE_DECISION_CHINA.md)
- [安全与隐私开发基线](docs/SECURITY.md)
- [当前实施状态](docs/CURRENT_STATUS.md)
- [中国市场技术架构决策](docs/ARCHITECTURE_DECISION_CHINA.md)

## 本地运行

```bash
npm install
npm run dev
```

首次输入新手机号时需要设置登录密码；再次使用同一手机号时输入该密码登录。当前 MVP 的账号与业务数据仍保存在浏览器本地。

## 模型服务配置

复制 `.env.example` 为 `.env.local`，按自己的模型服务填写：

```bash
AI_PROVIDER=deepseek
AI_API_KEY=
AI_API_BASE_URL=https://api.deepseek.com
AI_MODEL_FAST=deepseek-v4-flash
AI_MODEL_QUALITY=deepseek-v4-pro
```

`AI_PROVIDER` 支持 `deepseek`、`openai`、`openai-compatible` 和 `custom`。其中 `openai-compatible` / `custom` 适合兼容 OpenAI Chat Completions 的模型网关，用户需要自行填写对应的 `AI_API_BASE_URL` 和模型名。

## 验证

```bash
npm test
npm run lint
npm run build
```
## 产品原则

- AI 不得虚构用户经历、职责、成果或数据。
- 不把面试回答简单判断为对或错，以维度评级和具体建议提供反馈。
- 降低首次使用门槛，仅在用户使用核心功能时要求补充必要的求职目标信息。
- 第一版优先完成响应式网页，暂不开发微信小程序、语音面试和付费功能。
