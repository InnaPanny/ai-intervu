import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const SCAN_TARGETS = [
  ".env.example",
  ".github",
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  "docs",
  "package.json",
  "src",
  "tests",
];

const SECRET_PATTERNS = [
  {
    label: "DeepSeek-style API key",
    pattern: /sk-[A-Za-z0-9_-]{20,}/,
  },
  {
    label: "server secret assigned a non-placeholder value",
    pattern: /(?:AI_API_KEY|TENCENT_CLOUD_SECRET_ID|TENCENT_CLOUD_SECRET_KEY|DATABASE_URL)[ \t]*=[ \t]*(?:"[^"\r\n]+"|'[^'\r\n]+'|[^\s#"'`]+)/i,
  },
  {
    label: "secret exposed through NEXT_PUBLIC",
    pattern: /NEXT_PUBLIC_[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD)\s*=/,
  },
];

test("仓库中不包含真实密钥或浏览器公开密钥", async () => {
  const files = await collectFiles(SCAN_TARGETS);
  const failures: string[] = [];

  for (const file of files) {
    const content = await readFile(file, "utf8");
    for (const { label, pattern } of SECRET_PATTERNS) {
      if (pattern.test(content)) {
        failures.push(`${path.relative(ROOT, file)}: ${label}`);
      }
    }
  }

  assert.deepEqual(
    failures,
    [],
    `发现疑似密钥配置（为防止泄露，不展示命中内容）：\n${failures.join("\n")}`,
  );
});

async function collectFiles(targets: string[]) {
  const files: string[] = [];

  for (const target of targets) {
    const absolutePath = path.join(ROOT, target);
    const entries = await readdir(absolutePath, { withFileTypes: true }).catch(() => undefined);

    if (!entries) {
      files.push(absolutePath);
      continue;
    }

    for (const entry of entries) {
      const childPath = path.join(absolutePath, entry.name);
      if (entry.isDirectory()) {
        files.push(...await collectFiles([path.relative(ROOT, childPath)]));
      } else if (entry.isFile()) {
        files.push(childPath);
      }
    }
  }

  return files;
}
