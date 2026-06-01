"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// The roofline model: arithmetic intensity (ops/byte, X) vs achievable
// performance (FLOPs, Y). Performance is capped by two ceilings —
// a sloped memory-bandwidth roof and a flat peak-compute roof — meeting
// at the ridge point. achievable(I) = min(peakCompute, peakBandwidth * I).
interface Op {
  name: string;
  intensity: number; // ops/byte (base intensity, before fusion)
}

const OPS: Record<"matmul" | "elementwise", Op> = {
  matmul: { name: "big matmul", intensity: 30 },
  elementwise: { name: "element-wise op", intensity: 1 },
};

// Plot geometry inside the 440x260 viewBox.
const PX0 = 52; // left of plot
const PX1 = 408; // right of plot
const PY0 = 26; // top of plot
const PY1 = 196; // bottom of plot (X axis)
const I_MAX = 40; // X range: 0..40 ops/byte

export function RooflineInteractive() {
  const [op, setOp] = useState<"matmul" | "elementwise">("elementwise");
  const [fuse, setFuse] = useState(1); // 1..30, raises element-wise intensity
  const [peakCompute, setPeakCompute] = useState(120); // GFLOP/s
  const [peakBandwidth, setPeakBandwidth] = useState(10); // GFLOP/s per (op/byte)

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";
  const activeStyle = { background: C.ink, color: "var(--background)" } as const;

  // Y range scales with the compute ceiling.
  const P_MAX = peakCompute * 1.1;
  const mapX = (i: number) => PX0 + (i / I_MAX) * (PX1 - PX0);
  const mapY = (p: number) => PY1 - (p / P_MAX) * (PY1 - PY0);

  // Ridge point: where the sloped roof meets the flat ceiling.
  const ridgeI = peakCompute / peakBandwidth;
  const ridgeOnPlot = ridgeI <= I_MAX;

  // Effective intensity of the selected op (fusion only moves element-wise).
  const opIntensity =
    op === "elementwise"
      ? Math.min(I_MAX, OPS.elementwise.intensity * fuse)
      : OPS.matmul.intensity;
  const achievable = Math.min(peakCompute, peakBandwidth * opIntensity);
  const memoryBound = opIntensity < ridgeI;

  // Roofline polyline: origin -> ridge -> right edge.
  const slopeEndI = Math.min(ridgeI, I_MAX);
  const roofPts = [
    `${mapX(0)},${mapY(0)}`,
    `${mapX(slopeEndI)},${mapY(peakBandwidth * slopeEndI)}`,
    ...(ridgeOnPlot ? [`${mapX(I_MAX)},${mapY(peakCompute)}`] : []),
  ].join(" ");

  const px = mapX(opIntensity);
  const py = mapY(achievable);

  // Axis gridline positions.
  const xTicks = [0, 10, 20, 30, 40];
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * peakCompute);

  return (
    <div>
      <svg
        viewBox="0 0 440 260"
        className="h-auto w-full"
        role="img"
        aria-label="The roofline model"
      >
        {/* gridlines */}
        {xTicks.map((t) => (
          <line
            key={`gx${t}`}
            x1={mapX(t)}
            y1={PY0}
            x2={mapX(t)}
            y2={PY1}
            stroke={C.grid}
            strokeWidth={1}
          />
        ))}
        {yTicks.map((t) => (
          <line
            key={`gy${t}`}
            x1={PX0}
            y1={mapY(t)}
            x2={PX1}
            y2={mapY(t)}
            stroke={C.grid}
            strokeWidth={1}
          />
        ))}

        {/* axes */}
        <line x1={PX0} y1={PY0} x2={PX0} y2={PY1} stroke={C.line} strokeWidth={1.5} />
        <line x1={PX0} y1={PY1} x2={PX1} y2={PY1} stroke={C.line} strokeWidth={1.5} />

        {/* x tick labels */}
        {xTicks.map((t) => (
          <text
            key={`xl${t}`}
            x={mapX(t)}
            y={PY1 + 13}
            fontSize={9}
            fill={C.muted}
            fontFamily={MONO}
            textAnchor="middle"
          >
            {t}
          </text>
        ))}
        {/* y tick labels */}
        {yTicks.map((t) => (
          <text
            key={`yl${t}`}
            x={PX0 - 6}
            y={mapY(t) + 3}
            fontSize={9}
            fill={C.muted}
            fontFamily={MONO}
            textAnchor="end"
          >
            {Math.round(t)}
          </text>
        ))}

        {/* axis titles */}
        <text
          x={(PX0 + PX1) / 2}
          y={PY1 + 26}
          fontSize={10}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
        >
          arithmetic intensity (ops/byte)
        </text>
        <text
          x={14}
          y={(PY0 + PY1) / 2}
          fontSize={10}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
          transform={`rotate(-90 14 ${(PY0 + PY1) / 2})`}
        >
          performance (FLOP/s)
        </text>

        {/* the roofline */}
        <polyline points={roofPts} fill="none" stroke={C.ink} strokeWidth={2} />

        {/* segment labels */}
        <text
          x={mapX(slopeEndI / 2)}
          y={mapY(peakBandwidth * (slopeEndI / 2)) - 6}
          fontSize={10}
          fill={C.coral}
          fontFamily={MONO}
          textAnchor="middle"
        >
          memory-bound
        </text>
        {ridgeOnPlot && (
          <text
            x={mapX((ridgeI + I_MAX) / 2)}
            y={mapY(peakCompute) - 6}
            fontSize={10}
            fill={C.blue}
            fontFamily={MONO}
            textAnchor="middle"
          >
            compute-bound
          </text>
        )}

        {/* ridge point */}
        {ridgeOnPlot && (
          <>
            <circle cx={mapX(ridgeI)} cy={mapY(peakCompute)} r={3.5} fill={C.violet} />
            <text
              x={mapX(ridgeI)}
              y={mapY(peakCompute) + 16}
              fontSize={9}
              fill={C.violet}
              fontFamily={MONO}
              textAnchor="middle"
            >
              ridge I={ridgeI.toFixed(1)}
            </text>
          </>
        )}

        {/* selected op: drop lines + point */}
        <line x1={px} y1={py} x2={px} y2={PY1} stroke={C.green} strokeWidth={1} strokeDasharray="3 2" />
        <line x1={px} y1={py} x2={PX0} y2={py} stroke={C.green} strokeWidth={1} strokeDasharray="3 2" />
        <circle cx={px} cy={py} r={5} fill={C.green} />
      </svg>

      {/* readout */}
      <div className="mt-2 font-mono text-xs text-[var(--foreground)]">
        I = {opIntensity.toFixed(1)} ops/byte &rarr;{" "}
        <span style={{ color: memoryBound ? C.coral : C.blue }}>
          {memoryBound ? "memory-bound" : "compute-bound"}
        </span>{" "}
        &middot; achievable = {achievable.toFixed(1)} FLOP/s
      </div>
      {op === "elementwise" && (
        <div className="mt-1 text-xs text-[var(--muted)]">
          operator fusion raises intensity &rarr; moves toward compute-bound.
        </div>
      )}

      {/* controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={btn}
            style={op === "matmul" ? activeStyle : undefined}
            onClick={() => setOp("matmul")}
          >
            big matmul
          </button>
          <button
            type="button"
            className={btn}
            style={op === "elementwise" ? activeStyle : undefined}
            onClick={() => setOp("elementwise")}
          >
            element-wise op
          </button>
        </div>

        <label className="flex items-center gap-2">
          <span>fuse ops</span>
          <input
            type="range"
            min={1}
            max={30}
            step={1}
            value={fuse}
            disabled={op !== "elementwise"}
            onChange={(e) => setFuse(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums w-14">x{fuse}</span>
        </label>

        <label className="flex items-center gap-2">
          <span>peak FLOPs</span>
          <input
            type="range"
            min={40}
            max={300}
            step={10}
            value={peakCompute}
            onChange={(e) => setPeakCompute(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums w-14">{peakCompute}</span>
        </label>

        <label className="flex items-center gap-2">
          <span>peak BW</span>
          <input
            type="range"
            min={2}
            max={40}
            step={1}
            value={peakBandwidth}
            onChange={(e) => setPeakBandwidth(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums w-14">{peakBandwidth}</span>
        </label>
      </div>
    </div>
  );
}
