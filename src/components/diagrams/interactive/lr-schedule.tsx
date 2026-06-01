"use client";

import { useState } from "react";
import { C, MONO, plotCurve } from "../frame";

// Panel geometry: training step t on x in [0,T], learning rate eta on y in
// [0, etaMax]. The schedule shapes eta(t) — bold early, gentle late.
const PX0 = 44;
const PX1 = 424;
const PY0 = 18;
const PY1 = 196;

type Schedule = "constant" | "step" | "exp" | "cosine" | "warmcos";

const SCHEDULES: { id: Schedule; label: string }[] = [
  { id: "constant", label: "constant" },
  { id: "step", label: "step" },
  { id: "exp", label: "exp" },
  { id: "cosine", label: "cosine" },
  { id: "warmcos", label: "warmup+cos" },
];

// eta(t) for the selected schedule. All knobs are passed explicitly so the
// closure handed to plotCurve stays pure and deterministic.
function etaAt(
  sched: Schedule,
  t: number,
  T: number,
  etaMax: number,
  etaMin: number,
  gamma: number,
  warmup: number,
): number {
  switch (sched) {
    case "constant":
      return etaMax;
    case "step": {
      // Drop by 0.5 every quarter of training.
      const drops = Math.floor(t / (T / 4));
      return etaMax * Math.pow(0.5, drops);
    }
    case "exp":
      return etaMax * Math.pow(gamma, t);
    case "cosine":
      return etaMin + 0.5 * (etaMax - etaMin) * (1 + Math.cos((Math.PI * t) / T));
    case "warmcos": {
      const w = Math.min(warmup, T);
      if (t < w) {
        // Linear ramp from ~0 up to etaMax over the warmup window.
        return w <= 0 ? etaMax : (etaMax * t) / w;
      }
      // Cosine descent from etaMax to etaMin over the remaining steps.
      const span = T - w;
      const frac = span <= 0 ? 1 : (t - w) / span;
      return etaMin + 0.5 * (etaMax - etaMin) * (1 + Math.cos(Math.PI * frac));
    }
  }
}

export function LrSchedule() {
  const [sched, setSched] = useState<Schedule>("warmcos");
  const [etaMax, setEtaMax] = useState(0.6);
  const [etaMin, setEtaMin] = useState(0.05);
  const [T, setT] = useState(300);
  const [warmup, setWarmup] = useState(40);
  const [gamma, setGamma] = useState(0.99);

  // y-axis tops out a touch above etaMax so the upper reference line is visible.
  const yTop = etaMax * 1.08 + 1e-6;
  const mapX = (t: number) => PX0 + (t / T) * (PX1 - PX0);
  const mapY = (eta: number) => PY1 - (eta / yTop) * (PY1 - PY0);

  const emin = Math.min(etaMin, etaMax);
  const curve = plotCurve(
    (t) => etaAt(sched, t, T, etaMax, emin, gamma, warmup),
    0,
    T,
    240,
    mapX,
    mapY,
  );

  const yMax = mapY(etaMax);
  const yMin = mapY(emin);
  const showMin = sched === "cosine" || sched === "warmcos";

  const btnBase =
    "rounded border border-[var(--border)] px-2 py-1 font-mono transition-colors";
  const sliderCls = "w-24 accent-[var(--foreground)]";

  return (
    <div>
      <svg
        viewBox="0 0 440 240"
        className="h-auto w-full"
        role="img"
        aria-label="Learning rate schedules"
      >
        {/* Plot frame */}
        <rect
          x={PX0}
          y={PY0}
          width={PX1 - PX0}
          height={PY1 - PY0}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />

        {/* Axis baselines */}
        <line x1={PX0} y1={PY1} x2={PX1} y2={PY1} stroke={C.line} strokeWidth={1} />
        <line x1={PX0} y1={PY0} x2={PX0} y2={PY1} stroke={C.line} strokeWidth={1} />

        {/* eta_max dashed reference */}
        <line
          x1={PX0}
          y1={yMax}
          x2={PX1}
          y2={yMax}
          stroke={C.muted}
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        <text
          x={PX0 - 6}
          y={yMax + 3}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          ηmax
        </text>

        {/* eta_min dashed reference (only meaningful for cosine variants) */}
        {showMin && Math.abs(yMin - yMax) > 4 && (
          <>
            <line
              x1={PX0}
              y1={yMin}
              x2={PX1}
              y2={yMin}
              stroke={C.muted}
              strokeWidth={1}
              strokeDasharray="4 3"
            />
            <text
              x={PX0 - 6}
              y={yMin + 3}
              fontSize={9}
              fill={C.muted}
              fontFamily={MONO}
              textAnchor="end"
            >
              ηmin
            </text>
          </>
        )}

        {/* Warmup marker for warmup+cosine */}
        {sched === "warmcos" && warmup > 0 && warmup < T && (
          <line
            x1={mapX(warmup)}
            y1={PY0}
            x2={mapX(warmup)}
            y2={PY1}
            stroke={C.grid}
            strokeWidth={1}
            strokeDasharray="2 3"
          />
        )}

        {/* The schedule curve */}
        <polyline
          points={curve}
          fill="none"
          stroke={C.blue}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Axis labels */}
        <text
          x={(PX0 + PX1) / 2}
          y={PY1 + 26}
          fontSize={10}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          step t
        </text>
        <text x={PX0} y={PY1 + 14} fontSize={9} fill={C.muted} fontFamily={MONO}>
          0
        </text>
        <text
          x={PX1}
          y={PY1 + 14}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          {`T=${T}`}
        </text>
        <text
          x={PX0 - 6}
          y={PY0 + 8}
          fontSize={10}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          η
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        {SCHEDULES.map((s) => {
          const active = s.id === sched;
          return (
            <button
              key={s.id}
              type="button"
              className={btnBase}
              style={{
                background: active ? C.ink : "var(--background)",
                color: active ? "var(--background)" : C.ink,
              }}
              onClick={() => setSched(s.id)}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        <label className="flex items-center gap-2 font-mono">
          ηmax
          <input
            type="range"
            min={0.1}
            max={1.0}
            step={0.05}
            value={etaMax}
            onChange={(e) => setEtaMax(parseFloat(e.target.value))}
            className={sliderCls}
            aria-label="eta max"
          />
          <span className="w-9 tabular-nums">{etaMax.toFixed(2)}</span>
        </label>

        <label className="flex items-center gap-2 font-mono">
          ηmin
          <input
            type="range"
            min={0}
            max={0.2}
            step={0.01}
            value={etaMin}
            onChange={(e) => setEtaMin(parseFloat(e.target.value))}
            className={sliderCls}
            aria-label="eta min"
          />
          <span className="w-9 tabular-nums">{etaMin.toFixed(2)}</span>
        </label>

        <label className="flex items-center gap-2 font-mono">
          T
          <input
            type="range"
            min={50}
            max={500}
            step={10}
            value={T}
            onChange={(e) => setT(parseInt(e.target.value, 10))}
            className={sliderCls}
            aria-label="total steps"
          />
          <span className="w-9 tabular-nums">{T}</span>
        </label>

        <label className="flex items-center gap-2 font-mono">
          warmup
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={warmup}
            onChange={(e) => setWarmup(parseInt(e.target.value, 10))}
            className={sliderCls}
            aria-label="warmup length"
          />
          <span className="w-9 tabular-nums">{warmup}</span>
        </label>

        <label className="flex items-center gap-2 font-mono">
          γ
          <input
            type="range"
            min={0.985}
            max={0.999}
            step={0.001}
            value={gamma}
            onChange={(e) => setGamma(parseFloat(e.target.value))}
            className={sliderCls}
            aria-label="exponential gamma"
          />
          <span className="w-12 tabular-nums">{gamma.toFixed(3)}</span>
        </label>
      </div>

      <p className="mt-3 text-xs text-[var(--muted)]">
        The step size is itself shaped over time — bold early, gentle late.
      </p>
    </div>
  );
}
