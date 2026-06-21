"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AppData, InterviewReview, Question, Target } from "@/lib/types";

const emptyData: AppData = { targets: [], questions: [], reviews: [] };

type AppContextValue = {
  data: AppData;
  hydrated: boolean;
  storageError?: string;
  activeTarget?: Target;
  accountExists: (phone: string) => boolean;
  login: (phone: string, password: string) => Promise<boolean>;
  register: (phone: string, password: string) => Promise<boolean>;
  logout: () => void;
  addTarget: (target: Omit<Target, "id" | "createdAt">) => Target;
  updateTarget: (id: string, patch: Partial<Omit<Target, "id" | "createdAt">>) => Target | undefined;
  setActiveTarget: (id: string) => void;
  addQuestions: (questions: Question[]) => void;
  updateQuestion: (id: string, patch: Partial<Question>) => void;
  addReview: (review: InterviewReview) => void;
  updateReview: (id: string, patch: Partial<InterviewReview>) => void;
  replaceData: (data: AppData) => void;
  clearData: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);
const legacyStorageKey = "ai-interview-coach-data";
const storageKey = "ai-interview-coach-accounts";
const emptyAccountData: Omit<AppData, "phone"> = { targets: [], questions: [], reviews: [] };

type AccountData = Omit<AppData, "phone">;
type AccountRecord = {
  passwordSalt: string;
  passwordHash: string;
  data: AccountData;
};
type AccountStore = {
  currentPhone?: string;
  accounts: Record<string, AccountRecord>;
};

const emptyStore: AccountStore = { accounts: {} };

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<AccountStore>(emptyStore);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string>();
  const data = currentData(store);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          setStore(normalizeStore(JSON.parse(saved)));
        } else {
          const legacy = localStorage.getItem(legacyStorageKey);
          if (legacy) {
            setStore(migrateLegacyData(JSON.parse(legacy) as AppData));
          }
        }
      } catch {
        setStorageError("无法读取浏览器本地数据。请检查浏览器存储权限后重试。");
      }
      setHydrated(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let errorFrame: number | undefined;
    try {
      localStorage.setItem(storageKey, JSON.stringify(store));
    } catch {
      errorFrame = requestAnimationFrame(() => {
        setStorageError("本次修改无法保存到浏览器本地。请勿关闭页面，并检查浏览器存储空间或权限。");
      });
    }
    return () => {
      if (errorFrame) cancelAnimationFrame(errorFrame);
    };
  }, [store, hydrated]);

  const value = useMemo<AppContextValue>(() => ({
    data,
    hydrated,
    storageError,
    activeTarget: data.phone ? data.targets.find((target) => target.id === data.activeTargetId) : undefined,
    accountExists: (phone) => Boolean(store.accounts[phone]?.passwordHash),
    login: async (phone, password) => {
      const account = store.accounts[phone];
      if (!account) return false;
      const passwordHash = await hashPassword(password, account.passwordSalt);
      if (passwordHash !== account.passwordHash) return false;
      setStore((current) => ({ ...current, currentPhone: phone }));
      return true;
    },
    register: async (phone, password) => {
      if (store.accounts[phone]?.passwordHash) return false;
      const passwordSalt = crypto.randomUUID();
      const passwordHash = await hashPassword(password, passwordSalt);
      setStore((current) => ({
        currentPhone: phone,
        accounts: {
          ...current.accounts,
          [phone]: { passwordSalt, passwordHash, data: current.accounts[phone]?.data ?? emptyAccountData },
        },
      }));
      return true;
    },
    logout: () => setStore((current) => ({ ...current, currentPhone: undefined })),
    addTarget: (target) => {
      const next = { ...target, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      updateCurrentAccount(setStore, (current) => ({ ...current, targets: [...current.targets, next], activeTargetId: next.id }));
      return next;
    },
    updateTarget: (id, patch) => {
      const currentTarget = data.targets.find((target) => target.id === id);
      if (!currentTarget) return undefined;
      const next = { ...currentTarget, ...patch };
      updateCurrentAccount(setStore, (current) => ({
        ...current,
        targets: current.targets.map((target) => target.id === id ? next : target),
      }));
      return next;
    },
    setActiveTarget: (id) => updateCurrentAccount(setStore, (current) => ({ ...current, activeTargetId: id })),
    addQuestions: (questions) => updateCurrentAccount(setStore, (current) => ({ ...current, questions: [...current.questions, ...questions] })),
    updateQuestion: (id, patch) => updateCurrentAccount(setStore, (current) => ({
      ...current,
      questions: current.questions.map((question) => question.id === id ? { ...question, ...patch } : question),
    })),
    addReview: (review) => updateCurrentAccount(setStore, (current) => ({ ...current, reviews: [...current.reviews, review] })),
    updateReview: (id, patch) => updateCurrentAccount(setStore, (current) => ({
      ...current,
      reviews: current.reviews.map((review) => review.id === id ? { ...review, ...patch } : review),
    })),
    replaceData: (nextData) => {
      updateCurrentAccount(setStore, () => stripPhone(nextData));
      setStorageError(undefined);
    },
    clearData: () => {
      updateCurrentAccount(setStore, () => emptyAccountData);
      setStorageError(undefined);
    },
  }), [data, hydrated, storageError, store.accounts]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}

function currentData(store: AccountStore): AppData {
  if (!store.currentPhone) return emptyData;
  const account = store.accounts[store.currentPhone];
  if (!account) return emptyData;
  return { phone: store.currentPhone, ...account.data };
}

function stripPhone(data: AppData): AccountData {
  return {
    targets: Array.isArray(data.targets) ? data.targets : [],
    activeTargetId: data.activeTargetId,
    questions: Array.isArray(data.questions) ? data.questions : [],
    reviews: Array.isArray(data.reviews) ? data.reviews : [],
  };
}

function updateCurrentAccount(
  setStore: React.Dispatch<React.SetStateAction<AccountStore>>,
  update: (data: AccountData) => AccountData,
) {
  setStore((current) => {
    const phone = current.currentPhone;
    if (!phone) return current;
    const account = current.accounts[phone];
    if (!account) return current;
    return {
      ...current,
      accounts: {
        ...current.accounts,
        [phone]: { ...account, data: update(account.data) },
      },
    };
  });
}

function normalizeStore(value: unknown): AccountStore {
  const candidate = value as Partial<AccountStore>;
  if (!candidate || typeof candidate !== "object" || !candidate.accounts || typeof candidate.accounts !== "object") return emptyStore;
  return {
    currentPhone: typeof candidate.currentPhone === "string" ? candidate.currentPhone : undefined,
    accounts: candidate.accounts as Record<string, AccountRecord>,
  };
}

function migrateLegacyData(data: AppData): AccountStore {
  if (!data.phone) return emptyStore;
  return {
    currentPhone: undefined,
    accounts: {
      [data.phone]: {
        passwordSalt: "",
        passwordHash: "",
        data: stripPhone(data),
      },
    },
  };
}

async function hashPassword(password: string, salt: string) {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
