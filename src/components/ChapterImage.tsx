export default function ChapterImage({
  label,
  caption,
}: {
  label: string;
  caption: string;
}) {
  return (
    <figure className="my-7">
      <div className="aspect-[16/9] w-full rounded-lg bg-[var(--card)] border border-[var(--border)] overflow-hidden">
        <svg viewBox="0 0 400 225" className="w-full h-full" aria-hidden="true">
          <defs>
            <pattern
              id="grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="#e5e5e3"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="400" height="225" fill="url(#grid)" />
          <circle
            cx="120"
            cy="90"
            r="44"
            stroke="#9ca3af"
            strokeWidth="1.25"
            fill="none"
            opacity="0.55"
          />
          <circle
            cx="280"
            cy="150"
            r="58"
            stroke="#9ca3af"
            strokeWidth="1.25"
            fill="none"
            opacity="0.55"
          />
          <line
            x1="120"
            y1="90"
            x2="280"
            y2="150"
            stroke="#9ca3af"
            strokeWidth="1"
            opacity="0.4"
          />
          <circle cx="120" cy="90" r="2.5" fill="#6b7280" />
          <circle cx="280" cy="150" r="2.5" fill="#6b7280" />
          <text
            x="200"
            y="119"
            textAnchor="middle"
            fontSize="11"
            fill="#6b7280"
            fontFamily="ui-monospace, monospace"
            letterSpacing="0.5"
          >
            {label}
          </text>
        </svg>
      </div>
      <figcaption className="mt-2 text-xs text-[var(--muted)]">
        {caption}
      </figcaption>
    </figure>
  );
}
