"use client";

export function Dialog({ open, title, description, onClose, children }: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 md:items-center md:p-5">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-surface p-6 shadow-2xl md:max-w-lg md:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            {description && <p className="mt-2 text-sm leading-6 text-muted">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted">关闭</button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
