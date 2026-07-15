import { Fragment, type ReactNode } from "react";
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
  const toks = pairMarkers(tokenize(children));
  const out: ReactNode[] = [];
  let bold = false;
  let italic = false;
  let key = 0;
  for (const t of toks) {
    if (t.kind === "bold") {
      bold = !bold;
      continue;
    }
    if (t.kind === "italic") {
      italic = !italic;
      continue;
    }
    let node: ReactNode =
      t.kind === "math" ? (
        <InlineMath key={key}>{t.value}</InlineMath>
      ) : t.kind === "code" ? (
        <code
          key={key}
          className="rounded bg-[var(--card)] px-1 py-0.5 font-mono text-[0.85em] text-[var(--foreground)]"
        >
          {t.value}
        </code>
      ) : (
        t.value
      );
    if (italic) node = <em key={key}>{node}</em>;
    if (bold) node = <strong key={key}>{node}</strong>;
    out.push(<Fragment key={key++}>{node}</Fragment>);
  }
  return <>{out}</>;
}

/**
 * One token of prose. Emphasis markers are their own tokens rather than
 * regex-matched pairs, which is what lets `**bold with $math$ inside**`
 * work: the marker toggles a style that spans the math token, instead of
 * the math split severing the pair and leaving the asterisks to render
 * literally.
 */
type Tok =
  | { kind: "text"; value: string }
  | { kind: "math"; value: string }
  | { kind: "code"; value: string }
  | { kind: "bold" }
  | { kind: "italic" };

function tokenize(input: string): Tok[] {
  const toks: Tok[] = [];
  let buf = "";
  const flush = () => {
    if (buf) toks.push({ kind: "text", value: buf });
    buf = "";
  };
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    // Escaped dollar: emit a literal "$".
    if (c === "\\" && input[i + 1] === "$") {
      buf += "$";
      i += 2;
      continue;
    }
    // Inline math: consume to the next unescaped "$".
    if (c === "$") {
      const close = findClose(input, i + 1, "$");
      if (close === -1) {
        buf += c;
        i += 1;
        continue;
      }
      flush();
      toks.push({ kind: "math", value: input.slice(i + 1, close).replace(/\\\$/g, "$") });
      i = close + 1;
      continue;
    }
    // Inline code: contents taken verbatim.
    if (c === "`") {
      const close = input.indexOf("`", i + 1);
      if (close === -1) {
        buf += c;
        i += 1;
        continue;
      }
      flush();
      toks.push({ kind: "code", value: input.slice(i + 1, close) });
      i = close + 1;
      continue;
    }
    if (c === "*" && input[i + 1] === "*") {
      flush();
      toks.push({ kind: "bold" });
      i += 2;
      continue;
    }
    if (c === "*") {
      flush();
      toks.push({ kind: "italic" });
      i += 1;
      continue;
    }
    buf += c;
    i += 1;
  }
  flush();
  return toks;
}

function findClose(s: string, from: number, ch: string): number {
  for (let i = from; i < s.length; i++) {
    if (s[i] === "\\" && s[i + 1] === ch) {
      i++;
      continue;
    }
    if (s[i] === ch) return i;
  }
  return -1;
}

/**
 * Markers only style text when they come in pairs. An odd one out (a stray
 * asterisk, as in "A*") is demoted back to literal text rather than
 * italicizing the rest of the paragraph.
 */
function pairMarkers(toks: Tok[]): Tok[] {
  const demote = new Set<number>();
  for (const kind of ["bold", "italic"] as const) {
    const idx = toks.reduce<number[]>((a, t, i) => (t.kind === kind ? [...a, i] : a), []);
    if (idx.length % 2 === 1) demote.add(idx[idx.length - 1]);
  }
  return toks.map((t, i) =>
    demote.has(i) ? ({ kind: "text", value: t.kind === "bold" ? "**" : "*" } as Tok) : t,
  );
}

