"use client";

import { useState } from "react";
import { C, MONO, plotCurve } from "../frame";

// Plot geometry: data range z in [-6,6], value range [-1.2,1.2] mapped into
// the SVG drawing box. Axes cross at the origin.
const VW = 420;
const VH = 250;
const PAD_L = 36;
const PAD_R = 14;
const PAD_T = 16;
const PAD_B = 30;
const Z_MIN = -6;
const Z_MAX = 6;
const Y_MIN = -1.2;
const Y_MAX = 1.2;

const mapX = (z: number) =>
  PAD_L + ((z - Z_MIN) / (Z_MAX - Z_MIN)) * (VW - PAD_L - PAD_R);
const mapY = (y: number) =>
  PAD_T + ((Y_MAX - y) / (Y_MAX - Y_MIN)) * (VH - PAD_T - PAD_B);

const clampY = (y: number) => Math.max(Y_MIN, Math.min(Y_MAX, y));

type Act = {
  key: string;
  label: string;
  f: (z: number) => number;
  d: (z: number) => number;
};

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const geluRaw = (z: number) =>
  0.5 * z * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (z + 0.044715 * z ** 3)));

const ACTS: Act[] = [
  {
    key: "sigmoid",
    label: "sigmoid",
    f: sigmoid,
    d: (z) => {
      const s = sigmoid(z);
      return s * (1 - s);
    },
  },
  {
    key: "tanh",
    label: "tanh",
    f: (z) => Math.tanh(z),
    d: (z) => {
      const t = Math.tanh(z);
      return 1 - t * t;
    },
  },
  {
    key: "relu",
    label: "relu",
    f: (z) => Math.max(0, z),
    d: (z) => (z > 0 ? 1 : 0),
  },
  {
    key: "leaky",
    label: "leaky relu",
    f: (z) => (z > 0 ? z : 0.01 * z),
    d: (z) => (z > 0 ? 1 : 0.01),
  },
  {
    key: "gelu",
    label: "gelu",
    f: geluRaw,
    d: (z) => {
      const h = 1e-3;
      return (geluRaw(z + h) - geluRaw(z - h)) / (2 * h);
    },
  },
];

export function ActivationExplorer() {
  const [actKey, setActKey] = useState("sigmoid");
  const [z0, setZ0] = useState(0);

  const act = ACTS.find((a) => a.key === actKey) ?? ACTS[0];
  const fz = act.f(z0);
  const dz = act.d(z0);

  const curve = plotCurve(act.f, Z_MIN, Z_MAX, 240, mapX, (y) =>
    mapY(clampY(y)),
  );
  const deriv = plotCurve(act.d, Z_MIN, Z_MAX, 240, mapX, (y) =>
    mapY(clampY(y)),
  );

  // Light gridlines at integer z and at a few y levels.
  const zGrid = [-6, -4, -2, 2, 4, 6];
  const yGrid = [-1, -0.5, 0.5, 1];

  const showVanish =
    (act.key === "sigmoid" || act.key === "tanh") && Math.abs(z0) > 3;

  return (
    <div>
      <svg
        viewBox="0 0 420 250"
        className="h-auto w-full"
        role="img"
        aria-label="Activation function explorer"
      >
        {/* gridlines */}
        {zGrid.map((z) => (
          <line
            key={`gz${z}`}
            x1={mapX(z)}
            y1={mapY(Y_MAX)}
            x2={mapX(z)}
            y2={mapY(Y_MIN)}
            stroke={C.grid}
            strokeWidth={1}
          />
        ))}
        {yGrid.map((y) => (
          <line
            key={`gy${y}`}
            x1={mapX(Z_MIN)}
            y1={mapY(y)}
            x2={mapX(Z_MAX)}
            y2={mapY(y)}
            stroke={C.grid}
            strokeWidth={1}
          />
        ))}

        {/* axes through the origin */}
        <line
          x1={mapX(Z_MIN)}
          y1={mapY(0)}
          x2={mapX(Z_MAX)}
          y2={mapY(0)}
          stroke={C.line}
          strokeWidth={1.2}
        />
        <line
          x1={mapX(0)}
          y1={mapY(Y_MAX)}
          x2={mapX(0)}
          y2={mapY(Y_MIN)}
          stroke={C.line}
          strokeWidth={1.2}
        />

        {/* axis ticks */}
        {zGrid.map((z) => (
          <text
            key={`tz${z}`}
            x={mapX(z)}
            y={mapY(0) + 12}
            fontSize={8}
            fill={C.muted}
            fontFamily={MONO}
            textAnchor="middle"
          >
            {z}
          </text>
        ))}
        {[-1, 1].map((y) => (
          <text
            key={`ty${y}`}
            x={mapX(0) - 6}
            y={mapY(y) + 3}
            fontSize={8}
            fill={C.muted}
            fontFamily={MONO}
            textAnchor="end"
          >
            {y}
          </text>
        ))}

        {/* vertical guide at z0 */}
        <line
          x1={mapX(z0)}
          y1={mapY(Y_MAX)}
          x2={mapX(z0)}
          y2={mapY(Y_MIN)}
          stroke={C.muted}
          strokeWidth={1}
          strokeDasharray="2 3"
        />

        {/* derivative (dashed coral) */}
        <polyline
          points={deriv}
          fill="none"
          stroke={C.coral}
          strokeWidth={1.6}
          strokeDasharray="5 4"
        />
        {/* activation (solid blue) */}
        <polyline points={curve} fill="none" stroke={C.blue} strokeWidth={1.8} />

        {/* dots at z0 */}
        <circle cx={mapX(z0)} cy={mapY(clampY(fz))} r={4} fill={C.blue} />
        <circle cx={mapX(z0)} cy={mapY(clampY(dz))} r={4} fill={C.coral} />

        {/* readouts */}
        <text x={PAD_L} y={PAD_T} fontSize={10} fill={C.blue} fontFamily={MONO}>
          {`f(z) = ${fz.toFixed(3)}`}
        </text>
        <text
          x={PAD_L + 130}
          y={PAD_T}
          fontSize={10}
          fill={C.coral}
          fontFamily={MONO}
        >
          {`slope f'(z) = ${dz.toFixed(3)}`}
        </text>
        <text
          x={VW - PAD_R}
          y={PAD_T}
          fontSize={10}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          {`z = ${z0.toFixed(2)}`}
        </text>

        {showVanish && (
          <text
            x={VW / 2}
            y={VH - 6}
            fontSize={9}
            fill={C.coral}
            fontFamily={MONO}
            textAnchor="middle"
          >
            slope ≈ 0 in the tails → vanishing gradient
          </text>
        )}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        {ACTS.map((a) => {
          const active = a.key === actKey;
          return (
            <button
              key={a.key}
              type="button"
              onClick={() => setActKey(a.key)}
              className="rounded border border-[var(--border)] px-2 py-1 font-mono transition-colors"
              style={{
                background: active ? C.ink : "var(--background)",
                color: active ? "var(--background)" : C.ink,
              }}
            >
              {a.label}
            </button>
          );
        })}
        <label className="flex items-center gap-2 font-mono">
          z
          <input
            type="range"
            min={-6}
            max={6}
            step={0.1}
            value={z0}
            onChange={(ev) => setZ0(parseFloat(ev.target.value))}
            className="w-32 accent-[var(--foreground)]"
            aria-label="input point z"
          />
          <span className="w-10 tabular-nums">{z0.toFixed(1)}</span>
        </label>
      </div>
    </div>
  );
}
