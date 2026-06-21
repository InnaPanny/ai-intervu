# 后端接入说明

## 当前模式

当前可视化 MVP 默认使用：

- 浏览器本地存储保存用户数据。
- 本地规则模拟题目生成与回答评价。
- 新手机号先设置登录密码；已注册手机号使用密码登录。

因此不配置任何外部服务也可以体验核心产品流程。当前账号与业务数据仍保存在浏览器本地；正式公开服务需要接入服务端认证和数据库。单题页主动生成 AI 参考应答时，若未配置或无法连接远程 AI，会使用只整理用户原回答的本地安全版本。

## 数据库与认证

中国市场正式方案采用：

- TencentDB for PostgreSQL：用户与业务数据。
- 腾讯云 COS：用户主动上传的简历文件。
- 腾讯云 SMS：中国大陆手机号验证码。
- Next.js 服务端：统一权限校验与数据访问。

环境变量模板见 `.env.example`。正式接入前需要创建腾讯云资源，并将数据库、COS 和 SMS 配置填写到 `.env.local`。

现有 `supabase/migrations/001_initial_schema.sql` 仅作为早期数据模型原型参考，其中 `auth.users` 和行级权限策略属于 Supabase，不可直接作为腾讯云生产迁移执行。

正式数据库接入时：

1. 基于原型迁移整理 TencentDB PostgreSQL 生产迁移。
2. 在服务端实现认证、授权和数据访问层。
3. 禁止浏览器直接连接数据库或使用腾讯云密钥。
4. 将 `AppProvider` 的本地存储读写逐步替换为服务端 API。

## AI 服务

服务端 AI 边界位于：

- `src/lib/ai/server.ts`
- `src/app/api/ai/status/route.ts`

远程 AI 默认采用 DeepSeek 官方 API，也支持用户自行配置兼容 OpenAI Chat Completions 的模型服务。服务端按任务选择模型：

- `fast`：批量生成题目、语义去重、分类和简单初评。
- `quality`：深度回答辅导和参考答案。

环境变量：

```bash
AI_PROVIDER=deepseek
AI_API_KEY=
AI_API_BASE_URL=https://api.deepseek.com
AI_MODEL_FAST=deepseek-v4-flash
AI_MODEL_QUALITY=deepseek-v4-pro
```

`AI_PROVIDER` 支持：

- `deepseek`：默认推荐配置，会向请求体加入 DeepSeek 支持的 `thinking: { type: "disabled" }`。
- `openai`：OpenAI 官方或等价的 Chat Completions 服务。
- `openai-compatible`：兼容 OpenAI Chat Completions 的第三方模型网关。
- `custom`：自定义兼容服务，需自行填写 API 地址与模型名。

当前统一适配层要求模型服务支持 `/chat/completions`、`messages`、Bearer Token 鉴权和 JSON 对象输出。

未配置时，`GET /api/ai/status` 返回 `local-demo`，产品继续使用本地模拟能力。

单题 AI 参考应答入口：

- `POST /api/ai/reference-answer`
- 发送当前题目、题型、用户本次回答、当前求职目标的简历与岗位 JD、目标岗位与行业及信息缺口。
- 不发送手机号、验证码或其他求职目标的数据。
- 简历可作为已确认个人事实来源；岗位 JD 只用于理解岗位要求，不能证明用户拥有某项经历。
- 方法和认知类题目允许模型补充通用专业框架；经历类题目禁止新增用户回答和简历中均未提供的个人事实或业绩数字。
- 已配置远程 AI 时，调用失败或输出与原回答过于相似会明确提示失败，不会将原回答伪装成 AI 生成内容。

单题 AI 辅导入口：

- `POST /api/ai/evaluate-answer`
- 返回按题型区分的维度评级、信息缺口、回答结构、关键词和改进建议；MVP 不返回追问。
- 服务端严格校验结构化结果，不接受总分或未定义评级；结构偶发偏差时最多自动修复一次。
- 用户提交时先保存回答草稿，远程 AI 失败不会丢失用户内容。

题目生成入口：

- `POST /api/ai/generate-questions`
- 用户主动生成时发送当前求职目标、该目标下的简历与 JD 文本，以及用于去重的题目意图和文本摘要。
- 不发送手机号、验证码或其他求职目标的数据。
- 返回最多 15 道新题和最多 7 道核心题；远程失败或输出无效时使用本地规则回退。

AI 正式接入后，必须继续遵守：

- 不得虚构用户经历、职责、成果或数据。
- 信息不足时必须标记缺口，不得自行补全；MVP 不进行追问。
- 只使用结构化 JSON 输出。
- AI 参考答案必须由用户确认后才能成为个人最终答案。
- 不将用户手机号发送给 AI 模型。

完整架构决策见 `docs/ARCHITECTURE_DECISION_CHINA.md`。

## 简历解析

- 首版支持 PDF 和 DOCX，最大 5MB。
- 入口：`POST /api/resume/parse`。
- 当前只在服务端内存中提取文本，不保存原文件。
- 接口不会记录文件名、简历文本或解析器详细错误。
- 正式上线前需要增加认证、限流、恶意文件扫描，并将需保留的文件存入私有 COS。

安全基线见 `docs/SECURITY.md`。
