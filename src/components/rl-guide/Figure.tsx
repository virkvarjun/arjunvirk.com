/**
 * Figure wrapper: centers its children (usually an inline SVG diagram)
 * and renders a small muted caption, e.g. "Fig 3.1, The agent–environment loop".
 */
export default function Figure({
  caption,
  children,
}: {
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="my-6">
      <div className="flex justify-center overflow-x-auto">{children}</div>
      <figcaption className="mt-2 text-center text-xs text-[var(--muted)] leading-relaxed">
        {caption}
      </figcaption>
    </figure>
  );
}
