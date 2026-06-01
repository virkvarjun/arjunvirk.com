"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Hard-coded model: two classes, four words with per-class likelihoods.
const P_SPAM = 0.4;
const P_NOT = 0.6;

type Word = {
  key: string;
  spam: number; // P(word | spam)
  not: number; // P(word | not-spam)
};

const WORDS: Word[] = [
  { key: "free", spam: 0.8, not: 0.1 },
  { key: "money", spam: 0.6, not: 0.15 },
  { key: "meeting", spam: 0.05, not: 0.5 },
  { key: "lunch", spam: 0.05, not: 0.4 },
];

// Plot geometry within the 440x250 viewBox.
const PRIOR_X = 24;
const PRIOR_W = 120;
const LIKE_X = 196;
const STEP_X = 196;
const BAR_MAX = 150; // max pixel length for likelihood bars

const fmt = (v: number): string => {
  if (v === 0) return "0";
  if (v >= 0.001) return v.toFixed(3);
  return v.toExponential(2);
};

export function NaiveBayesSpam() {
  const [present, setPresent] = useState<Record<string, boolean>>({
    free: true,
    money: true,
    meeting: false,
    lunch: false,
  });

  const toggle = (k: string): void =>
    setPresent((p) => ({ ...p, [k]: !p[k] }));

  const activeWords = WORDS.filter((w) => present[w.key]);

  // Accumulate running products starting from the priors.
  const stepsSpam: number[] = [P_SPAM];
  const stepsNot: number[] = [P_NOT];
  for (const w of activeWords) {
    stepsSpam.push(stepsSpam[stepsSpam.length - 1] * w.spam);
    stepsNot.push(stepsNot[stepsNot.length - 1] * w.not);
  }
  const prodSpam = stepsSpam[stepsSpam.length - 1];
  const prodNot = stepsNot[stepsNot.length - 1];

  const total = prodSpam + prodNot;
  const postSpam = total > 0 ? prodSpam / total : 0.5;
  const postNot = total > 0 ? prodNot / total : 0.5;
  const spamWins = postSpam >= postNot;

  // Vertical layout for the step list (running products): first row sits just
  // under the "running product" header at y=166, then 14px per row. With the
  // prior plus up to four words that is 5 rows (180..236), inside the viewBox.
  const stepTop0 = 180;
  const stepRow = 14;

  return (
    <div>
      <svg
        viewBox="0 0 440 250"
        className="h-auto w-full"
        role="img"
        aria-label="Naive Bayes spam filter"
      >
        {/* ---- Priors ---- */}
        <text x={PRIOR_X} y={20} fontSize={11} fill={C.muted} fontFamily={MONO}>
          priors
        </text>
        <text x={PRIOR_X} y={38} fontSize={10} fill={C.coral} fontFamily={MONO}>
          spam {P_SPAM.toFixed(2)}
        </text>
        <rect x={PRIOR_X + 64} y={30} width={PRIOR_W - 64} height={9} fill={C.coralFill} />
        <rect
          x={PRIOR_X + 64}
          y={30}
          width={(PRIOR_W - 64) * P_SPAM}
          height={9}
          fill={C.coral}
        />
        <text x={PRIOR_X} y={54} fontSize={10} fill={C.green} fontFamily={MONO}>
          not  {P_NOT.toFixed(2)}
        </text>
        <rect x={PRIOR_X + 64} y={46} width={PRIOR_W - 64} height={9} fill={C.greenFill} />
        <rect
          x={PRIOR_X + 64}
          y={46}
          width={(PRIOR_W - 64) * P_NOT}
          height={9}
          fill={C.green}
        />

        {/* ---- Present-word likelihoods (paired bars) ---- */}
        <text x={LIKE_X} y={20} fontSize={11} fill={C.muted} fontFamily={MONO}>
          P(word | class)
        </text>
        {activeWords.length === 0 ? (
          <text x={LIKE_X} y={40} fontSize={10} fill={C.muted} fontFamily={MONO}>
            no words present — using priors
          </text>
        ) : (
          activeWords.map((w, i) => {
            const top = 30 + i * 30;
            return (
              <g key={w.key}>
                <text
                  x={LIKE_X}
                  y={top + 8}
                  fontSize={10}
                  fill={C.ink}
                  fontFamily={MONO}
                >
                  {w.key}
                </text>
                <rect
                  x={LIKE_X + 64}
                  y={top}
                  width={BAR_MAX * w.spam}
                  height={8}
                  fill={C.coral}
                />
                <text
                  x={LIKE_X + 68 + BAR_MAX * w.spam}
                  y={top + 7}
                  fontSize={8}
                  fill={C.coral}
                  fontFamily={MONO}
                >
                  {w.spam.toFixed(2)}
                </text>
                <rect
                  x={LIKE_X + 64}
                  y={top + 10}
                  width={BAR_MAX * w.not}
                  height={8}
                  fill={C.green}
                />
                <text
                  x={LIKE_X + 68 + BAR_MAX * w.not}
                  y={top + 17}
                  fontSize={8}
                  fill={C.green}
                  fontFamily={MONO}
                >
                  {w.not.toFixed(2)}
                </text>
              </g>
            );
          })
        )}

        {/* ---- Running products (step list) ---- */}
        <line x1={20} y1={150} x2={420} y2={150} stroke={C.line} strokeWidth={1} />
        <text x={STEP_X} y={166} fontSize={11} fill={C.muted} fontFamily={MONO}>
          running product
        </text>
        {stepsSpam.map((s, i) => {
          const label =
            i === 0 ? "prior" : `× ${activeWords[i - 1].key}`;
          const y = stepTop0 + i * stepRow;
          return (
            <g key={`step-${i}`}>
              <text
                x={STEP_X}
                y={y}
                fontSize={9}
                fill={C.muted}
                fontFamily={MONO}
              >
                {label.padEnd(11)}
              </text>
              <text
                x={STEP_X + 78}
                y={y}
                fontSize={9}
                fill={C.coral}
                fontFamily={MONO}
              >
                {fmt(s)}
              </text>
              <text
                x={STEP_X + 152}
                y={y}
                fontSize={9}
                fill={C.green}
                fontFamily={MONO}
              >
                {fmt(stepsNot[i])}
              </text>
            </g>
          );
        })}

        {/* ---- Final normalized posteriors ---- */}
        <text x={24} y={166} fontSize={11} fill={C.muted} fontFamily={MONO}>
          normalized
        </text>
        <text x={24} y={186} fontSize={10} fill={C.coral} fontFamily={MONO}>
          spam
        </text>
        <rect x={24} y={190} width={150} height={11} fill={C.coralFill} />
        <rect x={24} y={190} width={150 * postSpam} height={11} fill={C.coral} />
        <text x={178} y={199} fontSize={9} fill={C.coral} fontFamily={MONO}>
          {(postSpam * 100).toFixed(1)}%
        </text>
        <text x={24} y={214} fontSize={10} fill={C.green} fontFamily={MONO}>
          not
        </text>
        <rect x={24} y={218} width={150} height={11} fill={C.greenFill} />
        <rect x={24} y={218} width={150 * postNot} height={11} fill={C.green} />
        <text x={178} y={227} fontSize={9} fill={C.green} fontFamily={MONO}>
          {(postNot * 100).toFixed(1)}%
        </text>

        {/* ---- Winner ---- */}
        <text
          x={24}
          y={245}
          fontSize={13}
          fontWeight={700}
          fill={spamWins ? C.coral : C.green}
          fontFamily={MONO}
        >
          {spamWins ? "→ SPAM" : "→ NOT SPAM"}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        <span className="font-mono text-[var(--muted)]">words present:</span>
        {WORDS.map((w) => {
          const active = present[w.key];
          return (
            <button
              key={w.key}
              type="button"
              onClick={() => toggle(w.key)}
              className="rounded border border-[var(--border)] px-2.5 py-1 font-mono transition-colors"
              style={{
                background: active ? C.ink : "var(--background)",
                color: active ? "var(--background)" : C.ink,
              }}
            >
              {w.key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
