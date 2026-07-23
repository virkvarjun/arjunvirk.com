/**
 * Sutton & Barto–style boxed pseudocode. Children are MDX flow content;
 * inline KaTeX math works inside. Use plain lines and manual indentation
 * via the <L> helper component.
 */
export function Pseudocode({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="my-5 rounded-md border border-[var(--border)] bg-[var(--card)]">
      <p className="border-b border-[var(--border)] px-4 py-2 text-sm font-semibold tracking-tight">
        {title}
      </p>
      <div className="px-4 py-3 text-sm leading-[1.75] [&_p]:my-0.5 overflow-x-auto">
        {children}
      </div>
    </div>
  );
}

/** One pseudocode line at a given indent level. */
export function L({
  i = 0,
  children,
}: {
  i?: number;
  children?: React.ReactNode;
}) {
  return (
    <p className="whitespace-nowrap" style={{ paddingLeft: `${i * 1.25}rem` }}>
      {children ?? " "}
    </p>
  );
}
