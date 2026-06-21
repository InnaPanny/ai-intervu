"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { LoginDialog } from "@/components/login-dialog";
import { TargetDialog } from "@/components/target-dialog";
import { useApp } from "@/components/app-provider";

const navigation = [
  { href: "/", label: "首页" },
  { href: "/questions", label: "面试押题" },
  { href: "/practice", label: "重点练习" },
  { href: "/reviews", label: "面试复盘" },
  { href: "/profile", label: "我的" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data, activeTarget, storageError } = useApp();
  const [showLogin, setShowLogin] = useState(false);
  const [showTarget, setShowTarget] = useState(false);

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden pb-24 md:pb-0">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex w-full min-w-0 max-w-6xl items-center justify-between gap-3 px-5 py-3">
          <Link href="/" className="shrink-0 font-semibold tracking-tight">
            面试准备助手
          </Link>
          <nav className="hidden gap-1 md:flex">
            {navigation.map((item) => (
              <NavLink key={item.href} {...item} active={pathname === item.href} />
            ))}
          </nav>
          <button
            onClick={() => data.phone ? setShowTarget(true) : setShowLogin(true)}
            className="max-w-36 shrink truncate rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white md:max-w-44"
          >
            {data.phone ? activeTarget?.role ?? "创建求职目标" : "登录"}
          </button>
        </div>
      </header>
      <main className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-8 px-5 py-8">
        {storageError && <div role="alert" className="rounded-xl border border-warning/30 bg-surface px-4 py-3 text-sm leading-6 text-warning">{storageError}</div>}
        {children}
      </main>
      <footer className="mx-auto mb-20 flex w-full min-w-0 max-w-6xl flex-col items-start justify-between gap-4 border-t border-border px-5 py-6 text-xs text-muted md:mb-0 md:flex-row md:items-center">
        <p>面试准备助手 · MVP</p>
        <div className="flex gap-4"><Link href="/privacy">隐私政策</Link><Link href="/terms">用户协议</Link></div>
      </footer>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid w-full min-w-0 grid-cols-5 border-t border-border bg-surface px-1 py-2 md:hidden">
        {navigation.map((item) => (
          <NavLink key={item.href} {...item} active={pathname === item.href} mobile />
        ))}
      </nav>
      <LoginDialog
        open={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={() => {
          if (!data.activeTargetId) setShowTarget(true);
        }}
      />
      <TargetDialog open={showTarget} onClose={() => setShowTarget(false)} />
    </div>
  );
}

function NavLink({ href, label, active, mobile = false }: {
  href: string; label: string; active: boolean; mobile?: boolean;
}) {
  return (
    <Link
      href={href}
      className={mobile
        ? `rounded-lg px-1 py-2 text-center text-xs ${active ? "bg-brand-soft text-brand" : "text-muted"}`
        : `rounded-lg px-3 py-2 text-sm ${active ? "bg-brand-soft font-medium text-brand" : "text-muted hover:bg-background hover:text-foreground"}`}
    >
      {label}
    </Link>
  );
}
