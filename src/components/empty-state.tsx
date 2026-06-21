export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: string;
}) {
  return (
    <section className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">
        {description}
      </p>
      <button className="mt-5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">
        {action}
      </button>
    </section>
  );
}
