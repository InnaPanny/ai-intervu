# Deployment Guide

This project supports two access layers:

1. Local development for contributors and reviewers.
2. A public deployment URL for users who should not need to download the code.

## Local Development

Run the project on your own computer:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

`localhost` always means the machine currently running the app. It is not a public URL and should not be used as the GitHub repository Website link.

If port `3000` is occupied, Next.js may use another port such as `3001`. Use the URL printed in the terminal.

## Public Deployment With Vercel

Vercel is the recommended first deployment target for the MVP because the app uses Next.js App Router.

1. Push the latest code to GitHub.
2. Open the Vercel import flow:
   - Use the README's "Deploy with Vercel" button, or
   - Import `https://github.com/InnaPanny/ai-intervu` from the Vercel dashboard.
3. Keep the detected framework as Next.js.
4. Keep the default commands unless Vercel asks for them explicitly:
   - Install command: `npm install`
   - Build command: `npm run build`
5. Add environment variables only on Vercel, never in source code.
6. Deploy the project.
7. Copy the generated production URL into:
   - The `Live Demo` section of `README.md`.
   - GitHub repository settings: About / Website.

Vercel will generate a URL similar to:

```text
https://your-project-name.vercel.app
```

## Environment Variables

The app can run without remote AI configuration. In that mode it falls back to local demo rules so the main product flow remains testable.

For DeepSeek-backed AI, configure these variables in Vercel:

```bash
AI_PROVIDER=deepseek
AI_API_KEY=your_deepseek_api_key
AI_API_BASE_URL=https://api.deepseek.com
AI_MODEL_FAST=deepseek-v4-flash
AI_MODEL_QUALITY=deepseek-v4-pro
```

Do not commit `.env.local`, API keys, phone numbers, resumes, answers, or other sensitive data.

## Cost Controls

For the first public MVP test:

- Start with no `AI_API_KEY` if you only need to verify the product flow.
- If enabling DeepSeek, use a small prepaid balance first.
- Keep model selection conservative: `deepseek-v4-flash` for fast generation/classification and `deepseek-v4-pro` only for deeper answer coaching.
- Add application-level usage limits before wider public sharing, such as per-user daily generation limits.

## China Mainland Access Note

Vercel is suitable for a fast MVP demo and global sharing, but access from China mainland networks may vary. If the product becomes China-market facing, follow `docs/ARCHITECTURE_DECISION_CHINA.md` and evaluate a China-hosted deployment path with proper filing, storage, SMS, and privacy compliance.
