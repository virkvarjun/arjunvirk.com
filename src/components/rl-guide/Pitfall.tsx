/**
 * "Common pitfalls / what breaks" callout box.
 */
export default function Pitfall({
  title = "Common pitfalls",
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="my-5 rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-3">
      <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)] mb-1.5">
        {title}
      </p>
      <div className="text-sm leading-relaxed [&>p]:my-1.5 [&>ul]:my-1.5">
        {children}
      </div>
    </div>
  );
}
