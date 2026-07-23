import type { MDXComponents } from "mdx/types";
import Check from "./Check";
import Figure from "./Figure";
import Pitfall from "./Pitfall";
import { Pseudocode, L } from "./Pseudocode";

/**
 * Element styling measured from the live ML Bible chapter pages:
 * body text is text-sm leading-relaxed, H2 sections are numbered and
 * text-base font-semibold tracking-tight, lists are disc with ~20px pad.
 */
export const mdxComponents: MDXComponents = {
  h2: (props) => (
    <h2
      className="text-base font-semibold tracking-tight mb-3 mt-10"
      {...props}
    />
  ),
  h3: (props) => (
    <h3 className="text-sm font-semibold tracking-tight mb-2 mt-7" {...props} />
  ),
  p: (props) => <p className="text-sm leading-relaxed my-3" {...props} />,
  ul: (props) => (
    <ul
      className="list-disc pl-5 my-3 space-y-1.5 text-sm leading-relaxed"
      {...props}
    />
  ),
  ol: (props) => (
    <ol
      className="list-decimal pl-5 my-3 space-y-1.5 text-sm leading-relaxed"
      {...props}
    />
  ),
  li: (props) => <li className="text-sm leading-relaxed" {...props} />,
  a: (props) => (
    <a
      className="text-[var(--muted)] underline-offset-2 hover:underline hover:text-[var(--foreground)] transition-colors"
      {...props}
    />
  ),
  strong: (props) => <strong className="font-bold" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="my-4 border-l-2 border-[var(--border)] pl-4 italic text-[var(--muted)] [&>p]:my-1.5"
      {...props}
    />
  ),
  hr: () => <hr className="my-10 border-[var(--border)]" />,
  table: (props) => (
    <div className="my-4 overflow-x-auto">
      <table className="prose-table" {...props} />
    </div>
  ),
  pre: (props) => <div className="my-4">{<pre {...props} />}</div>,
  code: (props: React.HTMLAttributes<HTMLElement>) => {
    // Block code (inside <pre>) is handled by rehype-pretty-code; inline
    // code gets the .code-inline treatment.
    const isBlock = "data-language" in props || "data-theme" in props;
    return isBlock ? (
      <code {...props} />
    ) : (
      <code className="code-inline" {...props} />
    );
  },
  // Book components available in every chapter without imports:
  Check,
  Figure,
  Pitfall,
  Pseudocode,
  L,
};
