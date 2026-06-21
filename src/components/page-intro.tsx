export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="min-w-0">
      <p className="text-sm font-medium text-brand">{eyebrow}</p>
      <h1 className="mt-2 break-all text-3xl font-semibold tracking-tight md:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl break-words leading-7 text-muted">{description}</p>
    </section>
  );
}
