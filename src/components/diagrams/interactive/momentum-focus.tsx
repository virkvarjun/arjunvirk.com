"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// loss(x,y) = 0.05*x^2 + 1.0*y^2  -> gradient (0.1*x, 2.0*y).
// The valley is gentle along x and steep along y, so plain SGD must take a
// tiny learning rate to avoid bouncing across the y-walls, which leaves it
// crawling along the floor. Momentum accumulates speed in the consistent x
// direction while averaging away the alternating y kicks.
const LR = 0.12;
const START: Pt = [-9, 3];
const MAX_STEPS = 60;

// World -> screen mapping. World x in [-11,11], y in [-4,4].
const CX = 220; // minimum at world (0,0)
const CY = 125;
const SX = 18; // px per world x unit
const SY = 26; // px per world y unit
const mapX = (x: number) => CX + x * SX;
const mapY = (y: number) => CY + y * SY;

type Pt = [number, number];

function grad([x, y]: Pt): Pt {
  return [0.1 * x, 2.0 * y];
}

// One SGD step: move opposite the gradient.
function sgdStep(p: Pt): Pt {
  const [gx, gy] = grad(p);
  return [p[0] - LR * gx, p[1] - LR * gy];
}

// One momentum step: v = beta*v + grad ; p = p - lr*v.
function momStep(p: Pt, v: Pt, beta: number): { p: Pt; v: Pt } {
  const [gx, gy] = grad(p);
  const nv: Pt = [beta * v[0] + gx, beta * v[1] + gy];
  return { p: [p[0] - LR * nv[0], p[1] - LR * nv[1]], v: nv };
}

type State = { sgd: Pt[]; mom: Pt[]; vel: Pt[] };
const INITIAL: State = { sgd: [START], mom: [START], vel: [[0, 0]] };

export function MomentumFocus() {
  const [beta, setBeta] = useState(0.85);
  const [st, setSt] = useState<State>(INITIAL);

  function step() {
    setSt((s) => {
      if (s.sgd.length >= MAX_STEPS) return s;
      const sLast = s.sgd[s.sgd.length - 1];
      const mLast = s.mom[s.mom.length - 1];
      const vLast = s.vel[s.vel.length - 1];
      const { p, v } = momStep(mLast, vLast, beta);
      return {
        sgd: [...s.sgd, sgdStep(sLast)],
        mom: [...s.mom, p],
        vel: [...s.vel, v],
      };
    });
  }

  function reset() {
    setSt(INITIAL);
  }

  const sgdPts = st.sgd;
  const momPts = st.mom;
  const v = st.vel[st.vel.length - 1];
  const cur = momPts[momPts.length - 1];
  const steps = sgdPts.length - 1;

  // Velocity arrow: anchored at the momentum ball, length scaled so the
  // accumulated x-speed is visible. step = -lr*v points downhill, so we draw
  // -v (the direction of motion) from the ball.
  const ax = mapX(cur[0]);
  const ay = mapY(cur[1]);
  const VSCALE = 9;
  const tipX = ax - v[0] * VSCALE;
  const tipY = ay - v[1] * VSCALE;
  const ang = Math.atan2(tipY - ay, tipX - ax);
  const hasVel = Math.hypot(tipX - ax, tipY - ay) > 1.5;
  const a1 = ang + Math.PI - 0.42;
  const a2 = ang + Math.PI + 0.42;
  const head = 7;

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  // Nested ellipse contours of constant loss, centered at the minimum.
  // For loss = L: 0.05*x^2 + y^2 = L -> rx = sqrt(L/0.05), ry = sqrt(L).
  const rings = [0.3, 1.2, 2.7, 5.0].map((L) => ({
    rx: Math.sqrt(L / 0.05) * SX,
    ry: Math.sqrt(L) * SY,
  }));

  return (
    <div>
      <svg
        viewBox="0 0 440 250"
        className="h-auto w-full"
        role="img"
        aria-label="Momentum on a ravine"
      >
        {rings.map((r, i) => (
          <ellipse
            key={i}
            cx={CX}
            cy={CY}
            rx={r.rx}
            ry={r.ry}
            fill="none"
            stroke={C.line}
            strokeWidth={1}
          />
        ))}
        <circle cx={CX} cy={CY} r={3} fill={C.ink} />
        <text x={CX + 7} y={CY + 3} fontSize={9} fill={C.muted} fontFamily={MONO}>
          min
        </text>

        {/* SGD trail (coral) */}
        {sgdPts.length > 1 && (
          <polyline
            points={sgdPts.map((p) => `${mapX(p[0])},${mapY(p[1])}`).join(" ")}
            fill="none"
            stroke={C.coral}
            strokeWidth={1.5}
          />
        )}
        {sgdPts.map((p, i) => (
          <circle
            key={`s${i}`}
            cx={mapX(p[0])}
            cy={mapY(p[1])}
            r={i === sgdPts.length - 1 ? 4.5 : 2}
            fill={C.coral}
          />
        ))}

        {/* Momentum trail (blue) */}
        {momPts.length > 1 && (
          <polyline
            points={momPts.map((p) => `${mapX(p[0])},${mapY(p[1])}`).join(" ")}
            fill="none"
            stroke={C.blue}
            strokeWidth={1.5}
          />
        )}
        {momPts.map((p, i) => (
          <circle
            key={`m${i}`}
            cx={mapX(p[0])}
            cy={mapY(p[1])}
            r={i === momPts.length - 1 ? 4.5 : 2}
            fill={C.blue}
          />
        ))}

        {/* Velocity arrow on the momentum ball */}
        {hasVel && (
          <g stroke={C.blue} fill={C.blue}>
            <line x1={ax} y1={ay} x2={tipX} y2={tipY} strokeWidth={2} />
            <polygon
              stroke="none"
              points={`${tipX},${tipY} ${tipX + head * Math.cos(a1)},${
                tipY + head * Math.sin(a1)
              } ${tipX + head * Math.cos(a2)},${tipY + head * Math.sin(a2)}`}
            />
          </g>
        )}

        {/* Start ring */}
        <circle
          cx={mapX(START[0])}
          cy={mapY(START[1])}
          r={7}
          fill="none"
          stroke={C.muted}
          strokeWidth={1}
          strokeDasharray="2 2"
        />

        {/* Velocity update panel */}
        <g>
          <rect
            x={300}
            y={12}
            width={130}
            height={48}
            rx={4}
            fill="var(--card)"
            stroke={C.line}
          />
          <text x={308} y={28} fontSize={9} fill={C.muted} fontFamily={MONO}>
            v = β·v_old + grad
          </text>
          <text x={308} y={42} fontSize={10} fill={C.blue} fontFamily={MONO}>
            {`vx = ${v[0].toFixed(2)}`}
          </text>
          <text x={308} y={55} fontSize={10} fill={C.blue} fontFamily={MONO}>
            {`vy = ${v[1].toFixed(2)}`}
          </text>
        </g>

        {/* Legend */}
        <g fontFamily={MONO} fontSize={10}>
          <circle cx={18} cy={20} r={4} fill={C.coral} />
          <text x={27} y={23} fill={C.muted}>
            SGD
          </text>
          <circle cx={18} cy={36} r={4} fill={C.blue} />
          <text x={27} y={39} fill={C.muted}>
            momentum
          </text>
        </g>

        <text
          x={428}
          y={242}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          {`step ${steps}`}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button type="button" className={btn} onClick={step}>
          Step
        </button>
        <button type="button" className={btn} onClick={reset}>
          Reset
        </button>
        <label className="flex items-center gap-2 font-mono">
          β
          <input
            type="range"
            min={0}
            max={0.99}
            step={0.01}
            value={beta}
            onChange={(e) => {
              setBeta(parseFloat(e.target.value));
              setSt(INITIAL);
            }}
            className="w-32 accent-[var(--foreground)]"
            aria-label="momentum coefficient beta"
          />
          <span className="font-mono tabular-nums w-10">{beta.toFixed(2)}</span>
        </label>
        <span className="font-mono" style={{ color: C.muted }}>
          {beta === 0
            ? "β=0, momentum ≡ SGD"
            : beta > 0.93
              ? "high β, overshoots from built-up speed"
              : "momentum glides along the floor"}
        </span>
      </div>
    </div>
  );
}
