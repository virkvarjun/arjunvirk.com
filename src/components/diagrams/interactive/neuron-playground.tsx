"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

type FeatureKey = "income" | "debt" | "age";

interface Feature {
  key: FeatureKey;
  label: string;
  x: number;
  w: number;
}

const SCALE = 26; // px per unit for bar length

export function NeuronPlayground() {
  const [features, setFeatures] = useState<Feature[]>([
    { key: "income", label: "income", x: 1.5, w: 1.2 },
    { key: "debt", label: "debt", x: 1.0, w: -0.8 },
    { key: "age", label: "age", x: 0.8, w: 0.3 },
  ]);
  const [bias, setBias] = useState<number>(0.5);

  const setField = (i: number, field: "x" | "w", value: number): void => {
    setFeatures((prev: Feature[]) =>
      prev.map((f: Feature, idx: number) =>
        idx === i ? { ...f, [field]: value } : f,
      ),
    );
  };

  const terms: number[] = features.map((f: Feature) => f.x * f.w);
  const z: number = terms.reduce((a: number, b: number) => a + b, bias);

  const baseX = 210; // zero baseline x in svg coords
  const rowH = 34;
  const top = 30;

  const barFor = (value: number): { x: number; width: number; fill: string } => {
    const len = value * SCALE;
    const width = Math.abs(len);
    const x = len >= 0 ? baseX : baseX - width;
    const fill = value >= 0 ? C.green : C.coral;
    return { x, width, fill };
  };

  const rows: { label: string; value: number; biasBar: boolean }[] = [
    ...features.map((f: Feature, i: number) => ({
      label: `${f.label}: w·x`,
      value: terms[i],
      biasBar: false,
    })),
    { label: "bias: b", value: bias, biasBar: true },
  ];

  const zBar = barFor(z);

  return (
    <div>
      <svg
        viewBox="0 0 420 230"
        className="h-auto w-full"
        role="img"
        aria-label="Neuron playground"
      >
        {/* zero baseline */}
        <line x1={baseX} y1={top - 6} x2={baseX} y2={top + rows.length * rowH + 26} stroke={C.line} strokeWidth={1} />
        <text x={baseX} y={top - 12} fontFamily={MONO} fontSize={9} fill={C.muted} textAnchor="middle">
          0
        </text>

        {rows.map((r, i: number) => {
          const y = top + i * rowH;
          const bar = r.biasBar
            ? { ...barFor(r.value), fill: C.blue }
            : barFor(r.value);
          return (
            <g key={r.label}>
              <text x={6} y={y + 14} fontFamily={MONO} fontSize={10} fill={C.ink}>
                {r.label}
              </text>
              <rect x={bar.x} y={y + 6} width={bar.width} height={12} fill={bar.fill} rx={1} />
              <text
                x={r.value >= 0 ? bar.x + bar.width + 4 : bar.x - 4}
                y={y + 16}
                fontFamily={MONO}
                fontSize={9}
                fill={C.muted}
                textAnchor={r.value >= 0 ? "start" : "end"}
              >
                {r.value.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* summed total z */}
        <line
          x1={6}
          y1={top + rows.length * rowH + 2}
          x2={414}
          y2={top + rows.length * rowH + 2}
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={6}
          y={top + rows.length * rowH + 20}
          fontFamily={MONO}
          fontSize={11}
          fill={C.ink}
        >
          z = {z.toFixed(2)}
        </text>
        <rect
          x={zBar.x}
          y={top + rows.length * rowH + 10}
          width={zBar.width}
          height={14}
          fill={z >= 0 ? C.green : C.coral}
          rx={1}
        />

        <text x={6} y={222} fontFamily={MONO} fontSize={9} fill={C.muted}>
          z = w·x + b  (no activation yet)
        </text>
      </svg>

      <div className="mt-3 flex flex-col gap-2 text-xs">
        {features.map((f: Feature, i: number) => (
          <div key={f.key} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-14 font-mono">{f.label} x</span>
              <input
                type="range"
                min={-2}
                max={2}
                step={0.1}
                value={f.x}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setField(i, "x", parseFloat(e.target.value))
                }
                className="w-28 accent-[var(--foreground)]"
              />
              <span className="font-mono tabular-nums w-10">{f.x.toFixed(1)}</span>
              <span className="w-14 font-mono">w</span>
              <input
                type="range"
                min={-2}
                max={2}
                step={0.1}
                value={f.w}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setField(i, "w", parseFloat(e.target.value))
                }
                className="w-28 accent-[var(--foreground)]"
              />
              <span className="font-mono tabular-nums w-10">{f.w.toFixed(1)}</span>
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="w-14 font-mono">bias b</span>
          <input
            type="range"
            min={-2}
            max={2}
            step={0.1}
            value={bias}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setBias(parseFloat(e.target.value))
            }
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums w-10">{bias.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}
