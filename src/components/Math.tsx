import katex from "katex";

// KaTeX renders to a static HTML string, so these render fine in Server
// Components — no "use client" needed. The CSS is imported once in the root
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
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

type Part = { text: string; math: boolean };

function splitMath(input: string): Part[] {
  const parts: Part[] = [];
  let buf = "";
  let inMath = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === "\\" && input[i + 1] === "$") {
      // Escaped dollar sign — emit a literal "$".
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
