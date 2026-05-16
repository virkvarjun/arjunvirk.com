import { work } from "@/lib/data";
import { ArrowUpRight } from "lucide-react";

export default function WorkSection() {
  return (
    <div className="space-y-6">
      {work.map((item, i) => (
        <div key={i} className="group flex gap-6">
          <div className="w-28 shrink-0 text-xs text-[var(--muted)] pt-0.5">
            {item.period}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{item.role}</p>
                <p className="text-sm text-[var(--muted)]">{item.company}</p>
              </div>
              {item.link && (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mt-0.5"
                >
                  <ArrowUpRight size={15} />
                </a>
              )}
            </div>
            <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">
              {item.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
