"use client";

import { useMemo, useState } from "react";
import { Dialog } from "@/components/dialog";
import { useApp } from "@/components/app-provider";

export function LoginDialog({ open, onClose, onSuccess }: {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { accountExists, login, register } = useApp();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const phoneValid = /^1\d{10}$/.test(phone);
  const existingAccount = phoneValid && accountExists(phone);
  const passwordValid = password.length >= 8;
  const canSubmit = phoneValid && passwordValid && (existingAccount || password === confirmPassword) && !submitting;
  const title = existingAccount ? "手机号登录" : "设置登录密码";
  const description = useMemo(() => {
    if (!phoneValid) return "请输入手机号。新手机号将先设置登录密码，已注册手机号将使用密码登录。";
    if (existingAccount) return "请输入该手机号的登录密码。";
    return "为了保护您的简历及个人信息安全，请为当前手机号设置登录密码。";
  }, [existingAccount, phoneValid]);

  function closeDialog() {
    setPhone("");
    setPassword("");
    setConfirmPassword("");
    setMessage("");
    setSubmitting(false);
    onClose();
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setMessage("");
    const success = existingAccount
      ? await login(phone, password)
      : await register(phone, password);
    setSubmitting(false);
    if (!success) {
      setMessage(existingAccount ? "手机号或密码不正确，请重新输入。" : "该手机号已注册，请使用密码登录。");
      return;
    }
    closeDialog();
    onSuccess?.();
  }

  return (
    <Dialog open={open} onClose={closeDialog} title={title} description={description}>
      <div className="space-y-4">
        <Field label="手机号" value={phone} onChange={setPhone} placeholder="请输入 11 位手机号" />
        <Field label="登录密码" value={password} onChange={setPassword} placeholder="至少 8 位" type="password" />
        {!existingAccount && (
          <Field label="确认密码" value={confirmPassword} onChange={setConfirmPassword} placeholder="请再次输入登录密码" type="password" />
        )}
        {!passwordValid && password && <p className="text-sm text-danger">密码至少需要 8 位。</p>}
        {!existingAccount && confirmPassword && password !== confirmPassword && <p className="text-sm text-danger">两次输入的密码不一致。</p>}
        {message && <p className="text-sm text-danger">{message}</p>}
        <button
          disabled={!canSubmit}
          onClick={submit}
          className="w-full rounded-xl bg-brand px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "处理中..." : existingAccount ? "登录并继续" : "设置密码并登录"}
        </button>
      </div>
    </Dialog>
  );
}

export function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-brand" />
    </label>
  );
}
