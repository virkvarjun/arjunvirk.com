"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Plot region in SVG space.
const X0 = 36;
const X1 = 404;
const Y0 = 36;
const Y1 = 196;

// Domain in math space.
const XMIN = -6;
const XMAX = 6;

const START_X = -4;

function loss(x: number) {
  return 0.5 * x * x;
}
// grad of loss is just x.

// Map math x in [-6,6] to svg x.
function mapX(x: number) {
  return X0 + ((x - XMIN) / (XMAX - XMIN)) * (X1 - X0);
}
// Map loss value to svg y. Loss range is [0, 18]; invert so bowl bottom is low.
const LMAX = 0.5 * XMAX * XMAX;
function mapY(l: number) {
  return Y1 - (l / LMAX) * (Y1 - Y0);
}

function curvePoints() {
  const pts: string[] = [];
  const n = 80;
  for (let i = 0; i <= n; i++) {
    const x = XMIN + ((XMAX - XMIN) * i) / n;
    pts.push(`${mapX(x).toFixed(2)},${mapY(loss(x)).toFixed(2)}`);
  }
  return pts.join(" ");
}

const CURVE = curvePoints();

// A short tangent segment at math point xc with slope = grad = xc.
function tangentSeg(xc: number, halfDX: number) {
  const slope = xc; // dL/dx
  const xa = xc - halfDX;
  const xb = xc + halfDX;
  // In svg, dY/dx scales by -(Y1-Y0)/LMAX.
  const ya = loss(xc) + slope * (xa - xc);
  const yb = loss(xc) + slope * (xb - xc);
  return {
    x1: mapX(xa),
    y1: mapY(ya),
    x2: mapX(xb),
    y2: mapY(yb),
  };
}

export function NesterovLookahead() {
  const [x, setX] = useState(START_X);
  const [v, setV] = useState(0);
  const [eta, setEta] = useState(0.3);
  const [beta, setBeta] = useState(0.8);
  const [stepped, setStepped] = useState(false);
  const [showPlain, setShowPlain] = useState(false);

  // Derived look-ahead geometry for the CURRENT state (preview / last step).
  const xLook = x - eta * beta * v;
  const grad = xLook; // loss'(x_look)
  const vNew = beta * v + grad;
  const xNew = x - eta * vNew;

  function step() {
    setX(xNew);
    setV(vNew);
    setStepped(true);
  }
  function reset() {
    setX(START_X);
    setV(0);
    setStepped(false);
  }

  const ballX = mapX(x);
  const ballY = mapY(loss(x));
  const ghostX = mapX(xLook);
  const ghostY = mapY(loss(xLook));
  const newX = mapX(xNew);
  const newY = mapY(loss(xNew));

  const lookTan = tangentSeg(xLook, 1.4);
  const plainTan = tangentSeg(x, 1.4);

  // Arrowhead direction: gradient points uphill (sign of grad along x).
  const gdir = grad >= 0 ? 1 : -1;

  return (
    <div>
      <svg
        viewBox="0 0 440 240"
        className="h-auto w-full"
        role="img"
        aria-label="Nesterov look-ahead"
      >
        {/* baseline + curve */}
        <line x1={X0} y1={Y1} x2={X1} y2={Y1} stroke={C.grid} strokeWidth={1} />
        <line x1={mapX(0)} y1={Y0} x2={mapX(0)} y2={Y1} stroke={C.grid} strokeWidth={1} />
        <polyline points={CURVE} fill="none" stroke={C.line} strokeWidth={2} />

        {/* momentum jump from x to look-ahead (sub-step 1) */}
        {v !== 0 && (
          <line
            x1={ballX}
            y1={ballY}
            x2={ghostX}
            y2={ghostY}
            stroke={C.violet}
            strokeWidth={1.6}
            strokeDasharray="3 3"
          />
        )}

        {/* ghost ball at look-ahead (sub-step 1) */}
        <circle cx={ghostX} cy={ghostY} r={6} fill="var(--card)" stroke={C.violet} strokeWidth={1.6} />
        <text x={ghostX} y={ghostY - 12} fontSize={10} fill={C.violet} fontFamily={MONO} textAnchor="middle">
          look-ahead
        </text>

        {/* gradient/tangent at the look-ahead point (sub-step 2) */}
        <line
          x1={lookTan.x1}
          y1={lookTan.y1}
          x2={lookTan.x2}
          y2={lookTan.y2}
          stroke={C.coral}
          strokeWidth={2}
        />
        {(() => {
          // arrow along the downhill direction at look-ahead to suggest force
          const ax = ghostX;
          const ay = ghostY;
          const tx = ax - gdir * 26;
          const ang = Math.atan2(0, -gdir);
          const a1 = ang + Math.PI - 0.4;
          const a2 = ang + Math.PI + 0.4;
          const head = 6;
          return (
            <g stroke={C.coral} fill={C.coral}>
              <line x1={ax} y1={ay} x2={tx} y2={ay} strokeWidth={2} />
              <polygon
                stroke="none"
                points={`${tx},${ay} ${tx + head * Math.cos(a1)},${ay + head * Math.sin(a1)} ${tx + head * Math.cos(a2)},${ay + head * Math.sin(a2)}`}
              />
            </g>
          );
        })()}
        <text x={ghostX} y={ghostY + 20} fontSize={10} fill={C.coral} fontFamily={MONO} textAnchor="middle">
          gradient here
        </text>

        {/* plain-momentum contrast: gradient measured AT current point */}
        {showPlain && (
          <>
            <line
              x1={plainTan.x1}
              y1={plainTan.y1}
              x2={plainTan.x2}
              y2={plainTan.y2}
              stroke={C.blue}
              strokeWidth={1.6}
              strokeDasharray="2 2"
            />
            <text x={ballX} y={ballY + 24} fontSize={9} fill={C.blue} fontFamily={MONO} textAnchor="middle">
              plain: grad at x
            </text>
          </>
        )}

        {/* corrected final step (sub-step 3): move from x to xNew */}
        {stepped && (
          <line
            x1={ballX}
            y1={ballY}
            x2={newX}
            y2={newY}
            stroke={C.green}
            strokeWidth={2}
          />
        )}
        {stepped && (
          <text x={(ballX + newX) / 2} y={Math.min(ballY, newY) - 10} fontSize={10} fill={C.green} fontFamily={MONO} textAnchor="middle">
            corrected step
          </text>
        )}

        {/* current ball */}
        <circle cx={ballX} cy={ballY} r={7} fill={C.ink} />

        {/* readouts */}
        <text x={X0} y={222} fontSize={10} fill={C.muted} fontFamily={MONO}>
          {`x=${x.toFixed(2)}  v=${v.toFixed(2)}  x_look=${xLook.toFixed(2)}  grad=${grad.toFixed(2)}`}
        </text>
        <text x={X0} y={236} fontSize={10} fill={C.muted} fontFamily={MONO}>
          {`v_new=${vNew.toFixed(2)}  x_new=${xNew.toFixed(2)}  loss=${loss(x).toFixed(2)}`}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={step}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Step
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Reset
        </button>
        <label className="flex items-center gap-2 font-mono text-[var(--muted)]">
          eta {eta.toFixed(2)}
          <input
            type="range"
            min={0.05}
            max={0.6}
            step={0.05}
            value={eta}
            onChange={(e) => setEta(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
        </label>
        <label className="flex items-center gap-2 font-mono text-[var(--muted)]">
          beta {beta.toFixed(2)}
          <input
            type="range"
            min={0}
            max={0.95}
            step={0.05}
            value={beta}
            onChange={(e) => setBeta(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
        </label>
        <label className="flex items-center gap-2 font-mono text-[var(--muted)]">
          <input
            type="checkbox"
            checked={showPlain}
            onChange={(e) => setShowPlain(e.target.checked)}
            className="accent-[var(--foreground)]"
          />
          show plain momentum
        </label>
      </div>
    </div>
  );
}
