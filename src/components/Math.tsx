import type { ReactNode } from "react";
import katex from "katex";

// KaTeX renders to a static HTML string, so these render fine in Server
// Components, no "use client" needed. The CSS is imported once in the root
// layout via "katex/dist/katex.min.css".

function render(expr: string, displayMode: boolean): string {
  return katex.renderToString(expr, {
    displayMode,
    throwOnError: false,
    strict: false,
  });
}

/** A single display (block) equation, centered on its own line. */
export function BlockMath({ children }: { children: string }) {
  return (
    <div
      className="my-4 overflow-x-auto text-[var(--foreground)]"
      dangerouslySetInnerHTML={{ __html: render(children, true) }}
    />
  );
}

/** A single inline equation, flowing within text. */
export function InlineMath({ children }: { children: string }) {
  return (
    <span dangerouslySetInnerHTML={{ __html: render(children, false) }} />
  );
}

/**
 * Renders a string that may contain inline math wrapped in single `$...$`
 * delimiters, e.g. "the loss is $\\frac{1}{2}(y-\\hat y)^2$ per example".
 * Text outside the delimiters is rendered as-is; the math parts go through
 * KaTeX. Use a literal "\$" to emit a real dollar sign.
 */
export function MathText({ children }: { children: string }) {
  const parts = splitMath(children);
  return (
    <>
      {parts.map((part, i) =>
        part.math ? (
          <InlineMath key={i}>{part.text}</InlineMath>
        ) : (
          <Emphasis key={i} text={part.text} />
        ),
      )}
    </>
  );
}

/**
 * Renders the Markdown emphasis used in the prose, `**bold**`, `*italic*`, and
 * `` `inline code` ``, within a span of non-math text. Inline code is matched
 * first (its contents are taken verbatim), then bold before italic so the
 * double-asterisk form wins over the single.
 */
function Emphasis({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  const re = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      nodes.push(
        <code
          key={key++}
          className="rounded bg-[var(--card)] px-1 py-0.5 font-mono text-[0.85em] text-[var(--foreground)]"
        >
          {m[1]}
        </code>,
      );
    } else if (m[2] !== undefined) {
      nodes.push(<strong key={key++}>{m[2]}</strong>);
    } else {
      nodes.push(<em key={key++}>{m[3]}</em>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

type Part = { text: string; math: boolean };

function splitMath(input: string): Part[] {
  const parts: Part[] = [];
  let buf = "";
  let inMath = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === "\\" && input[i + 1] === "$") {
      // Escaped dollar sign, emit a literal "$".
      buf += "$";
      i++;
      continue;
    }
    if (ch === "$") {
      parts.push({ text: buf, math: inMath });
      buf = "";
      inMath = !inMath;
      continue;
    }
    buf += ch;
  }
  parts.push({ text: buf, math: inMath });
  return parts.filter((p) => p.text.length > 0);
}
