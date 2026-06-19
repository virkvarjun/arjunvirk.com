"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { C, MONO } from "../frame";

// Elliptical loss bowl centered at (CX, CY). Curvature differs per axis, so
// the two coordinates converge at different rates, which is what makes a
// too-large learning rate oscillate and then diverge.
const CX = 250;
const CY = 122;
const KX = 0.5;
const KY = 1.0;
const RINGS: [number, number][] = [
  [44, 31],
  [84, 59],
  [124, 87],
  [164, 115],
];
const START: [number, number] = [102, 40];
const MAX_STEPS = 80;

type Pt = [number, number];

function grad(px: number, py: number): Pt {
  return [(px - CX) * KX, (py - CY) * KY];
}

function nextPoint(p: Pt, eta: number): Pt {
  const [gx, gy] = grad(p[0], p[1]);
  return [p[0] - eta * gx, p[1] - eta * gy];
}

function offCanvas(p: Pt): boolean {
  return p[0] < -40 || p[0] > 440 || p[1] < -40 || p[1] > 280;
}

export function GradientDescentInteractive() {
  const [eta, setEta] = useState(0.35);
  const [start, setStart] = useState<Pt>(START);
  const [path, setPathState] = useState<Pt[]>([START]);
  const [running, setRunning] = useState(false);

  // Mirror the path in a ref so the animation interval always reads the
  // latest value without re-subscribing on every step.
  const pathRef = useRef<Pt[]>([START]);
  function setPath(p: Pt[]) {
    pathRef.current = p;
    setPathState(p);
  }

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const prev = pathRef.current;
      const last = prev[prev.length - 1];
      const [gx, gy] = grad(last[0], last[1]);
      if (Math.hypot(gx, gy) < 0.8) {
        setRunning(false);
        return;
      }
      const np = [...prev, nextPoint(last, eta)];
      setPath(np);
      if (np.length >= MAX_STEPS || offCanvas(np[np.length - 1])) {
        setRunning(false);
      }
    }, 140);
    return () => clearInterval(id);
  }, [running, eta]);

  function restart(from: Pt, e = eta) {
    setRunning(false);
    setStart(from);
    setEta(e);
    setPath([from]);
  }

  function stepOnce() {
    const prev = pathRef.current;
    if (prev.length >= MAX_STEPS) return;
    setPath([...prev, nextPoint(prev[prev.length - 1], eta)]);
  }

  function moveStart(ev: MouseEvent<SVGSVGElement>) {
    const rect = ev.currentTarget.getBoundingClientRect();
    const x = Math.round(((ev.clientX - rect.left) / rect.width) * 400);
    const y = Math.round(((ev.clientY - rect.top) / rect.height) * 240);
    restart([x, y]);
  }

  const diverging = path.length > 2 && path.some(offCanvas);
  const cur = path[path.length - 1];
  const loss = ((cur[0] - CX) ** 2 * KX + (cur[1] - CY) ** 2 * KY) / 1000;
  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  return (
    <div>
      <svg
        viewBox="0 0 400 240"
        className="h-auto w-full cursor-crosshair"
        onClick={moveStart}
        role="img"
        aria-label="Interactive gradient descent on a loss surface"
      >
        {RINGS.map(([rx, ry], i) => (
          <ellipse key={i} cx={CX} cy={CY} rx={rx} ry={ry} fill="none" stroke={C.line} strokeWidth={1} />
        ))}
        <circle cx={CX} cy={CY} r={3} fill={C.ink} />
        <text x={CX + 8} y={CY + 3} fontSize={10} fill={C.muted} fontFamily={MONO}>
          minimum
        </text>
        {path.length > 1 && (
          <polyline
            points={path.map((p) => `${p[0]},${p[1]}`).join(" ")}
            fill="none"
            stroke={C.coral}
            strokeWidth={1.6}
          />
        )}
        {path.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={i === path.length - 1 ? 4 : 2.4} fill={C.coral} />
        ))}
        <circle cx={start[0]} cy={start[1]} r={6} fill="none" stroke={C.coral} strokeWidth={1.2} />
        <text x={12} y={228} fontSize={9} fill={C.muted} fontFamily={MONO}>
          click anywhere to move the start point
        </text>
        <text x={388} y={20} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="end">
          {`step ${path.length - 1}`}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2 font-mono">
          η
          <input
            type="range"
            min={0.05}
            max={2.3}
            step={0.05}
            value={eta}
            onChange={(ev) => restart(start, parseFloat(ev.target.value))}
            className="w-32 accent-[var(--foreground)]"
            aria-label="learning rate"
          />
          <span className="w-8 tabular-nums">{eta.toFixed(2)}</span>
        </label>
        <button type="button" className={btn} onClick={stepOnce}>
          Step
        </button>
        <button type="button" className={btn} onClick={() => setRunning((r) => !r)}>
          {running ? "Pause" : "Run"}
        </button>
        <button type="button" className={btn} onClick={() => restart(start)}>
          Reset
        </button>
        <span className="font-mono" style={{ color: diverging ? C.coral : C.muted }}>
          {diverging ? "diverging, lower η" : `loss ≈ ${loss.toFixed(2)}`}
        </span>
      </div>
    </div>
  );
}
