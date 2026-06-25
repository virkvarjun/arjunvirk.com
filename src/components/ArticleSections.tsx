import type { ChapterSection } from "@/lib/chapters";
import { BlockMath, MathText } from "@/components/Math";

/**
 * Renders an ordered list of `ChapterSection`s (the same shape used by the
 * writing chapters) into article prose: optional heading, paragraphs with
 * inline `$...$` math, display equations, bulleted lists, and definitions.
 * Shared by the literature-review pages.
 */
export default function ArticleSections({
  sections,
}: {
  sections: ChapterSection[];
}) {
  return (
    <div className="mt-10 space-y-7">
      {sections.map((section, i) => (
        <section key={i}>
          {section.heading && (
            <h2 className="text-base font-semibold tracking-tight mb-3">
              {section.heading}
            </h2>
          )}
          {section.paragraphs && section.paragraphs.length > 0 && (
            <div className="space-y-3">
              {section.paragraphs.map((p, j) => (
                <p
                  key={j}
                  className={`text-sm leading-relaxed ${section.italic ? "italic" : ""}`}
                >
                  <MathText>{p}</MathText>
                </p>
              ))}
            </div>
          )}
          {section.equations && section.equations.length > 0 && (
            <div className="mt-1">
              {section.equations.map((eq, j) => (
                <BlockMath key={j}>{eq}</BlockMath>
              ))}
            </div>
          )}
          {section.list && section.list.length > 0 && (
            <ul className="mt-3 space-y-2 pl-5 list-disc marker:text-[var(--muted)]">
              {section.list.map((item, j) => (
                <li key={j} className="text-sm leading-relaxed">
                  <MathText>{item}</MathText>
                </li>
              ))}
            </ul>
          )}
          {section.definitions && section.definitions.length > 0 && (
            <dl className="mt-4 space-y-4">
              {section.definitions.map((d) => (
                <div key={d.term}>
                  <dt className="text-sm font-semibold">{d.term}</dt>
                  <dd className="mt-0.5 text-sm text-[var(--muted)] leading-relaxed">
                    <MathText>{d.definition}</MathText>
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {section.code && (
            <pre className="mt-3 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-xs leading-relaxed">
              <code className="font-mono text-[var(--foreground)] whitespace-pre">
                {section.code.content}
              </code>
            </pre>
          )}
        </section>
      ))}
    </div>
  );
}
