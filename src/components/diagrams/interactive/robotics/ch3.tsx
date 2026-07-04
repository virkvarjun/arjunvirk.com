"use client";

import { useReducer, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  R,
  MONO,
  Btn,
  Slider,
  Tabs,
  Stage,
  useRafLoop,
  usePrefersReducedMotion,
  useStageVisibility,
  svgArrow,
  svgPoint,
  approach,
  clamp,
} from "./shared";

const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
// Ease an angle (degrees) toward a target along the shortest arc.
const approachAngle = (cur: number, target: number, rate: number, dt: number) => {
  const d = ((target - cur + 540) % 360) - 180;
  const k = 1 - Math.pow(1 - rate, dt * 60);
  return cur + k * d;
};

// The arm lives in a world where the base is at ORIGIN and 1 world-unit maps to
// PPU screen pixels. y points up in world space, down in screen space.
const ORIGIN = { x: 210, y: 250 };
const PPU = 42; // pixels per world unit (L1=3,L2=2 -> reach 5 -> 210px)
const wx = (u: number) => ORIGIN.x + u * PPU;
const wy = (u: number) => ORIGIN.y - u * PPU;

// ===========================================================================
// Fig 3.1 · Forward kinematics on a 2-link arm  (slider-driven diagram)
// Two angle sliders + link-length toggles drive a 2-link arm; a live readout
// evaluates L1 cosθ1 + L2 cos(θ1+θ2) term by term to the hand's (x, y). A faint
// trace draws the arc the hand sweeps.
// ===========================================================================

export function RbForwardKinematics() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [t1, setT1] = useState(30); // deg target
  const [t2, setT2] = useState(45); // deg target
  const [L1, setL1] = useState(3);
  const [L2, setL2] = useState(2);
  const [disp, setDisp] = useState({ a: 30, b: 45 });

  useRafLoop(
    (dt) => {
      setDisp((s) => ({
        a: approachAngle(s.a, t1, 0.22, dt),
        b: approachAngle(s.b, t2, 0.22, dt),
      }));
    },
    { playing: inView && !reduced },
  );

  const a = reduced ? t1 : disp.a;
  const b = reduced ? t2 : disp.b;
  const th1 = rad(a);
  const th12 = rad(a + b);

  const ex = L1 * Math.cos(th1);
  const ey = L1 * Math.sin(th1);
  const hx = ex + L2 * Math.cos(th12);
  const hy = ey + L2 * Math.sin(th12);

  const Ex = wx(ex);
  const Ey = wy(ey);
  const Hx = wx(hx);
  const Hy = wy(hy);

  // Faint trace: sweep θ1 across its full range at the current θ2 to draw the arc.
  const trace: string = Array.from({ length: 49 }, (_, i) => {
    const ta = rad((i / 48) * 170);
    const px = L1 * Math.cos(ta) + L2 * Math.cos(ta + rad(a + b - a));
    const py = L1 * Math.sin(ta) + L2 * Math.sin(ta + rad(b));
    return `${i === 0 ? "M" : "L"} ${wx(px).toFixed(1)} ${wy(py).toFixed(1)}`;
  }).join(" ");

  const t1c = L1 * Math.cos(th1);
  const t2c = L2 * Math.cos(th12);
  const t1s = L1 * Math.sin(th1);
  const t2s = L2 * Math.sin(th12);

  return (
    <Stage
      innerRef={ref}
      title="Fig 3.1 · Forward kinematics on a 2-link arm"
      ariaLabel={`Two link arm at joint angles ${Math.round(a)} and ${Math.round(b)} degrees; hand at x ${hx.toFixed(2)}, y ${hy.toFixed(2)}`}
      controls={
        <>
          <Slider label="θ₁" min={0} max={170} value={t1} onChange={setT1} fmt={(v) => `${v}°`} />
          <Slider label="θ₂" min={-150} max={150} value={t2} onChange={setT2} fmt={(v) => `${v}°`} />
          <Btn onClick={() => setL1(L1 === 3 ? 2 : 3)}>L₁ = {L1}</Btn>
          <Btn onClick={() => setL2(L2 === 2 ? 3 : 2)}>L₂ = {L2}</Btn>
          <Btn
            onClick={() => {
              setT1(30);
              setT2(45);
              setL1(3);
              setL2(2);
            }}
          >
            ↺ reset
          </Btn>
        </>
      }
    >
      {/* reference axes */}
      <line x1={ORIGIN.x} y1={wy(-1)} x2={ORIGIN.x} y2={wy(5.2)} stroke={R.line} strokeWidth={1.2} strokeDasharray="4 6" />
      <line x1={wx(-1)} y1={ORIGIN.y} x2={wx(5.2)} y2={ORIGIN.y} stroke={R.line} strokeWidth={1.2} strokeDasharray="4 6" />
      <text x={wx(5.2) + 4} y={ORIGIN.y + 4} fontFamily={MONO} fontSize={12} fill={R.world}>x</text>
      <text x={ORIGIN.x - 4} y={wy(5.2) - 6} fontFamily={MONO} fontSize={12} fill={R.world} textAnchor="middle">y</text>

      {/* swept trace */}
      {!reduced && <path d={trace} fill="none" stroke={R.signal} strokeWidth={1.5} opacity={0.28} />}

      {/* the arm */}
      <line x1={ORIGIN.x} y1={ORIGIN.y} x2={Ex} y2={Ey} stroke={R.signal} strokeWidth={10} strokeLinecap="round" />
      <line x1={Ex} y1={Ey} x2={Hx} y2={Hy} stroke={R.signal} strokeWidth={10} strokeLinecap="round" />
      <circle cx={ORIGIN.x} cy={ORIGIN.y} r={9} fill={R.ink} />
      <circle cx={Ex} cy={Ey} r={7} fill={R.ink} />
      <circle cx={Hx} cy={Hy} r={9} fill={R.signal} stroke="var(--background)" strokeWidth={2} />

      {/* readout panel — fixed top-right lane, never overlaps the arm */}
      <line x1={470} y1={40} x2={470} y2={392} stroke={R.line} strokeWidth={1.5} strokeDasharray="4 6" />
      <text x={490} y={70} fontFamily={MONO} fontSize={14} fill={R.world}>hand position</text>
      <text x={490} y={108} fontFamily={MONO} fontSize={13} fill={R.plan}>x = L₁cosθ₁ + L₂cos(θ₁+θ₂)</text>
      <text x={490} y={132} fontFamily={MONO} fontSize={13} fill={R.plan}>
        {`  = ${t1c.toFixed(2)} + ${t2c.toFixed(2)}`}
      </text>
      <text x={490} y={156} fontFamily={MONO} fontSize={15} fill={R.ink} fontWeight={600}>
        {`  = ${hx.toFixed(2)}`}
      </text>
      <text x={490} y={206} fontFamily={MONO} fontSize={13} fill={R.plan}>y = L₁sinθ₁ + L₂sin(θ₁+θ₂)</text>
      <text x={490} y={230} fontFamily={MONO} fontSize={13} fill={R.plan}>
        {`  = ${t1s.toFixed(2)} + ${t2s.toFixed(2)}`}
      </text>
      <text x={490} y={254} fontFamily={MONO} fontSize={15} fill={R.ink} fontWeight={600}>
        {`  = ${hy.toFixed(2)}`}
      </text>
      <text x={490} y={310} fontFamily={MONO} fontSize={14} fill={R.world}>hand =</text>
      <text x={560} y={310} fontFamily={MONO} fontSize={16} fill={R.signal} fontWeight={600}>
        {`(${hx.toFixed(2)}, ${hy.toFixed(2)})`}
      </text>

      {reduced && (
        <text x={40} y={418} fontFamily={MONO} fontSize={13} fill={R.world}>
          Reduced motion: arm shown at the slider pose; the terms still recompute.
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 3.2 · Building an arm from DH parameters  (slider-driven diagram)
// A 3-joint arm in a light 3D-ish projection beside a 3-row DH table (a, α, d,
// θ). Tabs pick which joint (row) you edit; four sliders drive that row and the
// arm rebuilds live. Green short arrows mark the joint axes.
// ===========================================================================

type DhRow = { a: number; alpha: number; d: number; theta: number };

// A tiny oblique projection: world (X, Y, Z) -> screen. Z tilts up-right.
const OB = { ox: 250, oy: 300, s: 30, zk: 0.5 };
const proj = (X: number, Y: number, Z: number): [number, number] => [
  OB.ox + (X + Z * OB.zk) * OB.s,
  OB.oy - (Y + Z * OB.zk * 0.6) * OB.s,
];

export function RbDhParameters() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const DEFAULTS: DhRow[] = [
    { a: 2.2, alpha: 0, d: 0, theta: 30 },
    { a: 2.0, alpha: 90, d: 0, theta: 35 },
    { a: 1.6, alpha: 0, d: 0.8, theta: 25 },
  ];
  const [rows, setRows] = useState<DhRow[]>(DEFAULTS);
  const [sel, setSel] = useState(0);
  const [disp, setDisp] = useState<DhRow[]>(DEFAULTS);
  const [pulse, setPulse] = useState(0);

  useRafLoop(
    (dt) => {
      setDisp((s) =>
        s.map((r, i) => ({
          a: approach(r.a, rows[i].a, 0.2, dt),
          alpha: approachAngle(r.alpha, rows[i].alpha, 0.2, dt),
          d: approach(r.d, rows[i].d, 0.2, dt),
          theta: approachAngle(r.theta, rows[i].theta, 0.2, dt),
        })),
      );
      setPulse((p) => Math.max(0, p - dt * 2));
    },
    { playing: inView && !reduced },
  );

  const cur = reduced ? rows : disp;
  const set = (patch: Partial<DhRow>) => {
    setRows((rs) => rs.map((r, i) => (i === sel ? { ...r, ...patch } : r)));
    setPulse(1);
  };

  // Walk the DH chain in 3D. Each row appends a rotation about the running axis
  // and a translation. Simplified DH: rotate θ about z, translate a along x,
  // rotate α about x, translate d along z.
  type Frame = { p: [number, number, number]; ux: [number, number, number]; uy: [number, number, number]; uz: [number, number, number] };
  const rot = (v: [number, number, number], k: [number, number, number], ang: number): [number, number, number] => {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const dot = v[0] * k[0] + v[1] * k[1] + v[2] * k[2];
    const cross: [number, number, number] = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]];
    return [
      v[0] * c + cross[0] * s + k[0] * dot * (1 - c),
      v[1] * c + cross[1] * s + k[1] * dot * (1 - c),
      v[2] * c + cross[2] * s + k[2] * dot * (1 - c),
    ];
  };
  let f: Frame = { p: [0, 0, 0], ux: [1, 0, 0], uy: [0, 1, 0], uz: [0, 0, 1] };
  const frames: Frame[] = [f];
  const jointPts: [number, number, number][] = [f.p];
  for (const r of cur) {
    const th = rad(r.theta);
    const al = rad(r.alpha);
    const ux = rot(f.ux, f.uz, th);
    const uy = rot(f.uy, f.uz, th);
    const uz = f.uz;
    const p1: [number, number, number] = [f.p[0] + ux[0] * r.a, f.p[1] + ux[1] * r.a, f.p[2] + ux[2] * r.a];
    const uz2 = rot(uz, ux, al);
    const uy2 = rot(uy, ux, al);
    const p2: [number, number, number] = [p1[0] + uz2[0] * r.d, p1[1] + uz2[1] * r.d, p1[2] + uz2[2] * r.d];
    f = { p: p2, ux, uy: uy2, uz: uz2 };
    frames.push(f);
    jointPts.push(p2);
  }

  const rowLabel = ["J1", "J2", "J3"];
  const cols: (keyof DhRow)[] = ["a", "alpha", "d", "theta"];
  const colLabel: Record<keyof DhRow, string> = { a: "a", alpha: "α", d: "d", theta: "θ" };
  const tblX = 470;
  const tblY = 70;
  const cw = 56;
  const rh = 40;

  return (
    <Stage
      innerRef={ref}
      title="Fig 3.2 · Building an arm from DH parameters"
      ariaLabel={`Three joint arm built from a DH table; editing joint ${sel + 1}`}
      controls={
        <>
          <Tabs
            options={[
              { id: "0", label: "J1" },
              { id: "1", label: "J2" },
              { id: "2", label: "J3" },
            ]}
            value={String(sel)}
            onChange={(v) => setSel(+v)}
          />
          <Slider label="a" min={0.5} max={3} step={0.1} value={rows[sel].a} onChange={(v) => set({ a: v })} fmt={(v) => v.toFixed(1)} />
          <Slider label="α" min={0} max={90} step={5} value={rows[sel].alpha} onChange={(v) => set({ alpha: v })} fmt={(v) => `${v}°`} />
          <Slider label="d" min={0} max={2} step={0.1} value={rows[sel].d} onChange={(v) => set({ d: v })} fmt={(v) => v.toFixed(1)} />
          <Slider label="θ" min={-60} max={90} step={5} value={rows[sel].theta} onChange={(v) => set({ theta: v })} fmt={(v) => `${v}°`} />
          <Btn onClick={() => setRows(DEFAULTS)}>↺ reset</Btn>
        </>
      }
    >
      {/* ground plane hint */}
      <line x1={proj(-1, 0, -1)[0]} y1={proj(-1, 0, -1)[1]} x2={proj(4, 0, -1)[0]} y2={proj(4, 0, -1)[1]} stroke={R.line} strokeWidth={1} opacity={0.5} />
      <line x1={proj(-1, 0, -1)[0]} y1={proj(-1, 0, -1)[1]} x2={proj(-1, 0, 2)[0]} y2={proj(-1, 0, 2)[1]} stroke={R.line} strokeWidth={1} opacity={0.5} />

      {/* links */}
      {jointPts.slice(0, -1).map((p, i) => {
        const q = jointPts[i + 1];
        const [x1, y1] = proj(...p);
        const [x2, y2] = proj(...q);
        const active = i === sel;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={active ? R.signal : R.world}
            strokeWidth={active ? 11 : 8}
            strokeLinecap="round"
          />
        );
      })}
      {/* joint hubs + axis arrows (green) */}
      {frames.map((fr, i) => {
        const [jx, jy] = proj(...fr.p);
        const axEnd: [number, number, number] = [fr.p[0] + fr.uz[0] * 0.9, fr.p[1] + fr.uz[1] * 0.9, fr.p[2] + fr.uz[2] * 0.9];
        const [ax, ay] = proj(...axEnd);
        return (
          <g key={i}>
            {i < frames.length - 1 && svgArrow(jx, jy, ax, ay, R.goal, 2, 7)}
            <circle cx={jx} cy={jy} r={i === sel || i === sel + 1 ? 7 : 5} fill={R.ink} />
          </g>
        );
      })}
      <text x={proj(0, 0, 0)[0]} y={proj(0, 0, 0)[1] + 22} fontFamily={MONO} fontSize={12} fill={R.world} textAnchor="middle">base</text>
      <text x={OB.ox - 130} y={40} fontFamily={MONO} fontSize={12} fill={R.goal}>→ green = joint axes</text>

      {/* DH table */}
      <text x={tblX} y={tblY - 14} fontFamily={MONO} fontSize={14} fill={R.world}>DH table</text>
      {/* header */}
      <text x={tblX} y={tblY + 16} fontFamily={MONO} fontSize={13} fill={R.world}></text>
      {cols.map((c, ci) => (
        <text key={c} x={tblX + 44 + ci * cw + cw / 2} y={tblY + 16} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>
          {colLabel[c]}
        </text>
      ))}
      {rows.map((r, ri) => {
        const ry = tblY + 30 + ri * rh;
        const isSel = ri === sel;
        return (
          <g key={ri}>
            {isSel && <rect x={tblX - 6} y={ry - 4} width={44 + cols.length * cw + 6} height={rh - 6} rx={5} fill={R.fillBlue} opacity={0.5} />}
            <text x={tblX} y={ry + 18} fontFamily={MONO} fontSize={13} fill={isSel ? R.signal : R.world} fontWeight={isSel ? 600 : 400}>
              {rowLabel[ri]}
            </text>
            {cols.map((c, ci) => {
              const val = c === "alpha" || c === "theta" ? `${Math.round(r[c])}°` : r[c].toFixed(1);
              const variable = c === "theta"; // revolute: θ is the free one
              const cellSel = isSel && pulse > 0;
              return (
                <text
                  key={c}
                  x={tblX + 44 + ci * cw + cw / 2}
                  y={ry + 18}
                  textAnchor="middle"
                  fontFamily={MONO}
                  fontSize={13}
                  fontWeight={variable ? 600 : 400}
                  fill={cellSel ? R.error : variable ? R.plan : R.ink}
                >
                  {val}
                </text>
              );
            })}
          </g>
        );
      })}
      <text x={tblX} y={tblY + 30 + rows.length * rh + 22} fontFamily={MONO} fontSize={12} fill={R.plan}>
        amber θ = the free joint variable
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 3.3 · Reachable vs dexterous workspace  (draggable field)
// The 2-link arm with an outer reachable annulus and an inner dexterous core; a
// draggable probe reports reachable / dexterous / unreachable. Sliders reshape
// both regions live.
// ===========================================================================

export function RbWorkspace() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [L1, setL1] = useState(3);
  const [L2, setL2] = useState(2);
  const [showReach, setShowReach] = useState(true);
  const [showDex, setShowDex] = useState(true);
  const [probe, setProbe] = useState({ x: 2.4, y: 1.8 }); // world units
  const [drag, setDrag] = useState(false);
  const [disp, setDisp] = useState({ a: 30, b: 55 });

  const outer = L1 + L2;
  const inner = Math.abs(L1 - L2);
  // Dexterous core: hand can face any direction only where it can fold fully;
  // that region is the disk of radius (outer - 2*min(L1,L2))..? Use a robust
  // proxy: dexterous radius = |outer - 2*L2| style -> here inner-to-(outer-2*L2).
  const dexOuter = Math.max(0, outer - 2 * Math.min(L1, L2));

  const pr = Math.hypot(probe.x, probe.y);
  const status = pr > outer || pr < inner ? "unreachable" : pr <= dexOuter && pr >= inner ? "dexterous" : "reachable";

  // Target angles so the arm reaches the probe when reachable.
  const targetAngles = () => {
    const r = clamp(pr, inner + 0.02, outer - 0.02);
    const c2 = clamp((r * r - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1);
    const a2 = Math.acos(c2);
    const a1 = Math.atan2(probe.y, probe.x) - Math.atan2(L2 * Math.sin(a2), L1 + L2 * Math.cos(a2));
    return { a: deg(a1), b: deg(a2) };
  };

  useRafLoop(
    (dt) => {
      const tgt = status === "unreachable" ? { a: deg(Math.atan2(probe.y, probe.x)), b: 0 } : targetAngles();
      setDisp((s) => ({ a: approachAngle(s.a, tgt.a, 0.2, dt), b: approachAngle(s.b, tgt.b, 0.2, dt) }));
    },
    { playing: inView && !reduced },
  );

  const tgt = status === "unreachable" ? { a: deg(Math.atan2(probe.y, probe.x)), b: 0 } : targetAngles();
  const cur = reduced ? tgt : disp;
  const th1 = rad(cur.a);
  const ex = L1 * Math.cos(th1);
  const ey = L1 * Math.sin(th1);
  const hx = ex + L2 * Math.cos(th1 + rad(cur.b));
  const hy = ey + L2 * Math.sin(th1 + rad(cur.b));

  const onMove = (e: ReactPointerEvent<SVGElement>) => {
    if (!drag) return;
    const [px, py] = svgPoint(e);
    setProbe({ x: clamp((px - ORIGIN.x) / PPU, -6, 6), y: clamp((ORIGIN.y - py) / PPU, -3, 6) });
  };

  const outOfReach = status === "unreachable";

  return (
    <Stage
      innerRef={ref}
      title="Fig 3.3 · Reachable vs dexterous workspace"
      ariaLabel={`Probe at radius ${pr.toFixed(2)}: ${status}`}
      svgProps={{ onPointerMove: onMove, onPointerUp: () => setDrag(false), onPointerLeave: () => setDrag(false) }}
      controls={
        <>
          <Btn onClick={() => setShowReach((v) => !v)} active={showReach}>
            {showReach ? "✓ reachable" : "reachable"}
          </Btn>
          <Btn onClick={() => setShowDex((v) => !v)} active={showDex}>
            {showDex ? "✓ dexterous" : "dexterous"}
          </Btn>
          <Slider label="L₁" min={1} max={4} step={0.5} value={L1} onChange={setL1} fmt={(v) => v.toFixed(1)} />
          <Slider label="L₂" min={1} max={4} step={0.5} value={L2} onChange={setL2} fmt={(v) => v.toFixed(1)} />
          <span className="font-mono text-[13px] text-[var(--muted)]">drag the probe</span>
        </>
      }
    >
      {/* reachable annulus */}
      {showReach && (
        <>
          <circle cx={ORIGIN.x} cy={ORIGIN.y} r={outer * PPU} fill={R.world} opacity={0.16} />
          <circle cx={ORIGIN.x} cy={ORIGIN.y} r={inner * PPU} fill="var(--background)" />
          <circle cx={ORIGIN.x} cy={ORIGIN.y} r={outer * PPU} fill="none" stroke={R.world} strokeWidth={2} strokeDasharray="5 5" />
          {inner > 0.02 && <circle cx={ORIGIN.x} cy={ORIGIN.y} r={inner * PPU} fill="none" stroke={R.world} strokeWidth={1.5} strokeDasharray="4 5" />}
        </>
      )}
      {/* dexterous core */}
      {showDex && dexOuter > inner + 0.02 && (
        <>
          <circle cx={ORIGIN.x} cy={ORIGIN.y} r={dexOuter * PPU} fill={R.fillGreen} opacity={0.5} />
          {inner > 0.02 && <circle cx={ORIGIN.x} cy={ORIGIN.y} r={inner * PPU} fill="var(--background)" />}
          <circle cx={ORIGIN.x} cy={ORIGIN.y} r={dexOuter * PPU} fill="none" stroke={R.goal} strokeWidth={2} />
        </>
      )}

      {/* the arm */}
      <line x1={ORIGIN.x} y1={ORIGIN.y} x2={wx(ex)} y2={wy(ey)} stroke={outOfReach ? R.error : R.world} strokeWidth={9} strokeLinecap="round" />
      <line x1={wx(ex)} y1={wy(ey)} x2={wx(hx)} y2={wy(hy)} stroke={outOfReach ? R.error : R.world} strokeWidth={9} strokeLinecap="round" />
      <circle cx={ORIGIN.x} cy={ORIGIN.y} r={8} fill={R.ink} />
      <circle cx={wx(ex)} cy={wy(ey)} r={6} fill={R.ink} />

      {/* probe */}
      <circle
        cx={wx(probe.x)}
        cy={wy(probe.y)}
        r={12}
        fill={outOfReach ? R.fillRed : R.fillAmber}
        stroke={outOfReach ? R.error : R.plan}
        strokeWidth={3}
        style={{ cursor: "grab" }}
        onPointerDown={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
      />

      {/* readout — fixed top-left */}
      <text x={40} y={44} fontFamily={MONO} fontSize={14} fill={R.world}>probe status</text>
      <text
        x={40}
        y={68}
        fontFamily={MONO}
        fontSize={17}
        fontWeight={600}
        fill={status === "unreachable" ? R.error : status === "dexterous" ? R.goal : R.ink}
      >
        {status}
      </text>
      {/* legend — fixed bottom lane */}
      <circle cx={44} cy={408} r={6} fill={R.world} opacity={0.5} />
      <text x={56} y={412} fontFamily={MONO} fontSize={12} fill={R.world}>reachable ring</text>
      <circle cx={230} cy={408} r={6} fill={R.goal} />
      <text x={242} y={412} fontFamily={MONO} fontSize={12} fill={R.world}>dexterous core</text>
    </Stage>
  );
}

// ===========================================================================
// Fig 3.4 · Inverse kinematics with elbow-up and elbow-down  (draggable field)
// Drag a target; both IK solutions render (solid active + ghost alternate). At
// the outer ring they collapse to one; outside, both go red and freeze.
// ===========================================================================

export function RbInverseKinematics() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const L1 = 3;
  const L2 = 2;
  const outer = L1 + L2;
  const inner = Math.abs(L1 - L2);
  const [prefer, setPrefer] = useState<"down" | "up">("down");
  const [target, setTarget] = useState({ x: 3.12, y: 3.43 });
  const [drag, setDrag] = useState(false);
  // eased display for both branches: a=θ1down, b=θ2down (θ2up = -θ2down)
  const [disp, setDisp] = useState({ a: 30, b: 45 });

  const pr = Math.hypot(target.x, target.y);
  const reachable = pr <= outer && pr >= inner;

  const solve = () => {
    const r = clamp(pr, inner + 0.001, outer);
    const c2 = clamp((r * r - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1);
    const a2 = Math.acos(c2); // elbow-down positive
    const a1 = Math.atan2(target.y, target.x) - Math.atan2(L2 * Math.sin(a2), L1 + L2 * Math.cos(a2));
    return { a: deg(a1), b: deg(a2) };
  };

  useRafLoop(
    (dt) => {
      const s = solve();
      setDisp((d) => ({ a: approachAngle(d.a, s.a, 0.22, dt), b: approach(d.b, s.b, 0.22, dt) }));
    },
    { playing: inView && !reduced },
  );

  const s = solve();
  const cur = reduced ? s : disp;

  // Build both arms. Down branch uses +θ2 at θ1; up branch mirrors.
  const armPts = (a1deg: number, a2deg: number) => {
    const th1 = rad(a1deg);
    const ex = L1 * Math.cos(th1);
    const ey = L1 * Math.sin(th1);
    const hx = ex + L2 * Math.cos(th1 + rad(a2deg));
    const hy = ey + L2 * Math.sin(th1 + rad(a2deg));
    return { E: [wx(ex), wy(ey)] as const, H: [wx(hx), wy(hy)] as const };
  };
  // elbow-down: θ1down = atan2 - atan2(...) with +a2 -> that's `cur.a` with +cur.b.
  // elbow-up: reflect a2 -> -a2, and θ1 shifts accordingly.
  const a2 = cur.b;
  const th1down = cur.a;
  const th1up = deg(Math.atan2(target.y, target.x) - Math.atan2(L2 * Math.sin(rad(-a2)), L1 + L2 * Math.cos(rad(-a2))));
  const down = armPts(th1down, a2);
  const up = armPts(th1up, -a2);

  const activeIsDown = prefer === "down";
  const active = activeIsDown ? down : up;
  const ghost = activeIsDown ? up : down;

  const onMove = (e: ReactPointerEvent<SVGElement>) => {
    if (!drag) return;
    const [px, py] = svgPoint(e);
    setTarget({ x: clamp((px - ORIGIN.x) / PPU, -6, 6), y: clamp((ORIGIN.y - py) / PPU, -3, 6) });
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 3.4 · Inverse kinematics: elbow-up & elbow-down"
      ariaLabel={`IK target at radius ${pr.toFixed(2)}; ${reachable ? "two solutions" : "unreachable"}`}
      svgProps={{ onPointerMove: onMove, onPointerUp: () => setDrag(false), onPointerLeave: () => setDrag(false) }}
      controls={
        <>
          <Tabs
            options={[
              { id: "down", label: "prefer elbow-down" },
              { id: "up", label: "prefer elbow-up" },
            ]}
            value={prefer}
            onChange={setPrefer}
          />
          <Btn onClick={() => setTarget({ x: 3.12, y: 3.43 })}>↺ reset</Btn>
          <span className="font-mono text-[13px] text-[var(--muted)]">drag the target</span>
        </>
      }
    >
      {/* workspace ring */}
      <circle cx={ORIGIN.x} cy={ORIGIN.y} r={outer * PPU} fill="none" stroke={R.line} strokeWidth={1.5} strokeDasharray="5 6" />
      <circle cx={ORIGIN.x} cy={ORIGIN.y} r={inner * PPU} fill="none" stroke={R.line} strokeWidth={1.2} strokeDasharray="4 6" />

      {/* ghost (alternate) solution — only when reachable */}
      {reachable && (
        <g opacity={0.4}>
          <line x1={ORIGIN.x} y1={ORIGIN.y} x2={ghost.E[0]} y2={ghost.E[1]} stroke={R.world} strokeWidth={8} strokeLinecap="round" />
          <line x1={ghost.E[0]} y1={ghost.E[1]} x2={ghost.H[0]} y2={ghost.H[1]} stroke={R.world} strokeWidth={8} strokeLinecap="round" />
          <circle cx={ghost.E[0]} cy={ghost.E[1]} r={6} fill={R.world} />
        </g>
      )}

      {/* active solution (or the frozen straight arm when unreachable) */}
      <line
        x1={ORIGIN.x}
        y1={ORIGIN.y}
        x2={active.E[0]}
        y2={active.E[1]}
        stroke={reachable ? R.signal : R.error}
        strokeWidth={10}
        strokeLinecap="round"
      />
      <line
        x1={active.E[0]}
        y1={active.E[1]}
        x2={active.H[0]}
        y2={active.H[1]}
        stroke={reachable ? R.signal : R.error}
        strokeWidth={10}
        strokeLinecap="round"
      />
      <circle cx={ORIGIN.x} cy={ORIGIN.y} r={9} fill={R.ink} />
      <circle cx={active.E[0]} cy={active.E[1]} r={7} fill={R.ink} />

      {/* target */}
      <circle
        cx={wx(target.x)}
        cy={wy(target.y)}
        r={12}
        fill={reachable ? R.fillGreen : R.fillRed}
        stroke={reachable ? R.goal : R.error}
        strokeWidth={3}
        style={{ cursor: "grab" }}
        onPointerDown={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
      />

      {/* readout — fixed top-left */}
      <text x={40} y={44} fontFamily={MONO} fontSize={14} fill={R.world}>solutions</text>
      <text x={40} y={68} fontFamily={MONO} fontSize={17} fontWeight={600} fill={reachable ? R.ink : R.error}>
        {reachable ? "2 (elbow-up / elbow-down)" : "0 — unreachable"}
      </text>
      {/* legend bottom */}
      <line x1={40} y1={408} x2={64} y2={408} stroke={R.signal} strokeWidth={6} strokeLinecap="round" />
      <text x={72} y={412} fontFamily={MONO} fontSize={12} fill={R.world}>active</text>
      <line x1={160} y1={408} x2={184} y2={408} stroke={R.world} strokeWidth={6} strokeLinecap="round" opacity={0.5} />
      <text x={192} y={412} fontFamily={MONO} fontSize={12} fill={R.world}>alternate elbow</text>
    </Stage>
  );
}

// ===========================================================================
// Fig 3.5 · The Jacobian as a velocity ellipse  (draggable field)
// Drag the hand (arm follows via IK); a manipulability ellipse at the hand
// stretches / rotates and collapses to a line at full stretch. A toggle shows
// the two Jacobian column arrows.
// ===========================================================================

export function RbJacobianEllipse() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const L1 = 3;
  const L2 = 2;
  const outer = L1 + L2;
  const inner = Math.abs(L1 - L2);
  const [showCols, setShowCols] = useState(true);
  const [target, setTarget] = useState({ x: 3.12, y: 3.43 });
  const [drag, setDrag] = useState(false);
  const [disp, setDisp] = useState({ a: 30, b: 45 });

  const pr = clamp(Math.hypot(target.x, target.y), inner + 0.05, outer - 0.02);
  const solve = () => {
    const c2 = clamp((pr * pr - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1);
    const a2 = Math.acos(c2);
    const a1 = Math.atan2(target.y, target.x) - Math.atan2(L2 * Math.sin(a2), L1 + L2 * Math.cos(a2));
    return { a: deg(a1), b: deg(a2) };
  };

  useRafLoop(
    (dt) => {
      const s = solve();
      setDisp((d) => ({ a: approachAngle(d.a, s.a, 0.22, dt), b: approach(d.b, s.b, 0.22, dt) }));
    },
    { playing: inView && !reduced },
  );

  const s = solve();
  const cur = reduced ? s : disp;
  const th1 = rad(cur.a);
  const th12 = rad(cur.a + cur.b);
  const ex = L1 * Math.cos(th1);
  const ey = L1 * Math.sin(th1);
  const hxu = ex + L2 * Math.cos(th12);
  const hyu = ey + L2 * Math.sin(th12);
  const Hx = wx(hxu);
  const Hy = wy(hyu);

  // Jacobian columns (world units): col1 = ∂hand/∂θ1, col2 = ∂hand/∂θ2.
  const s1 = Math.sin(th1);
  const c1 = Math.cos(th1);
  const s12 = Math.sin(th12);
  const c12 = Math.cos(th12);
  const J = [
    [-L1 * s1 - L2 * s12, -L2 * s12],
    [L1 * c1 + L2 * c12, L2 * c12],
  ];
  // Manipulability ellipse: J J^T eigen-decomposition (2x2 symmetric).
  const A = J[0][0] * J[0][0] + J[0][1] * J[0][1];
  const B = J[0][0] * J[1][0] + J[0][1] * J[1][1];
  const D = J[1][0] * J[1][0] + J[1][1] * J[1][1];
  const tr = A + D;
  const det = A * D - B * B;
  const disc = Math.sqrt(Math.max(0, (tr / 2) * (tr / 2) - det));
  const l1 = tr / 2 + disc;
  const l2 = tr / 2 - disc;
  const rMaj = Math.sqrt(Math.max(0, l1));
  const rMin = Math.sqrt(Math.max(0, l2));
  const phi = Math.abs(B) < 1e-9 && Math.abs(A - D) < 1e-9 ? 0 : 0.5 * Math.atan2(2 * B, A - D);
  const manip = Math.sqrt(Math.max(0, det)); // |det J|
  const near = rMin < 0.35; // near singular when minor axis collapses

  const ESC = 20; // px per (world/rad) velocity for the ellipse drawing
  const onMove = (e: ReactPointerEvent<SVGElement>) => {
    if (!drag) return;
    const [px, py] = svgPoint(e);
    setTarget({ x: clamp((px - ORIGIN.x) / PPU, -6, 6), y: clamp((ORIGIN.y - py) / PPU, -3, 6) });
  };

  // Column arrow endpoints (screen). y flips sign for screen.
  const colEnd = (ci: number) => [Hx + J[0][ci] * ESC, Hy - J[1][ci] * ESC] as const;
  const c1e = colEnd(0);
  const c2e = colEnd(1);

  return (
    <Stage
      innerRef={ref}
      title="Fig 3.5 · The Jacobian as a velocity ellipse"
      ariaLabel={`Manipulability ${manip.toFixed(2)}; ${near ? "near singular" : "well conditioned"}`}
      svgProps={{ onPointerMove: onMove, onPointerUp: () => setDrag(false), onPointerLeave: () => setDrag(false) }}
      controls={
        <>
          <Btn onClick={() => setShowCols((v) => !v)} active={showCols}>
            {showCols ? "✓ J columns" : "show J columns"}
          </Btn>
          <Btn onClick={() => setTarget({ x: 3.12, y: 3.43 })}>↺ reset</Btn>
          <span className="font-mono text-[13px] text-[var(--muted)]">drag the hand</span>
        </>
      }
    >
      <circle cx={ORIGIN.x} cy={ORIGIN.y} r={outer * PPU} fill="none" stroke={R.line} strokeWidth={1.2} strokeDasharray="5 6" />

      {/* the arm */}
      <line x1={ORIGIN.x} y1={ORIGIN.y} x2={wx(ex)} y2={wy(ey)} stroke={R.signal} strokeWidth={10} strokeLinecap="round" />
      <line x1={wx(ex)} y1={wy(ey)} x2={Hx} y2={Hy} stroke={R.signal} strokeWidth={10} strokeLinecap="round" />
      <circle cx={ORIGIN.x} cy={ORIGIN.y} r={9} fill={R.ink} />
      <circle cx={wx(ex)} cy={wy(ey)} r={7} fill={R.ink} />

      {/* manipulability ellipse (amber) — flips to red line near singular */}
      <g transform={`translate(${Hx} ${Hy}) rotate(${-deg(phi)})`}>
        <ellipse
          cx={0}
          cy={0}
          rx={Math.max(2, rMaj * ESC)}
          ry={Math.max(1, rMin * ESC)}
          fill={near ? R.fillRed : R.fillAmber}
          opacity={0.55}
          stroke={near ? R.error : R.plan}
          strokeWidth={2.5}
        />
      </g>

      {/* Jacobian column arrows (green) */}
      {showCols && (
        <>
          {svgArrow(Hx, Hy, c1e[0], c1e[1], R.goal, 2.5, 8)}
          {svgArrow(Hx, Hy, c2e[0], c2e[1], R.goal, 2.5, 8)}
          <text x={c1e[0]} y={c1e[1] - 6} fontFamily={MONO} fontSize={12} fill={R.goal} textAnchor="middle">∂/∂θ₁</text>
          <text x={c2e[0]} y={c2e[1] - 6} fontFamily={MONO} fontSize={12} fill={R.goal} textAnchor="middle">∂/∂θ₂</text>
        </>
      )}
      <circle cx={Hx} cy={Hy} r={7} fill={R.signal} stroke="var(--background)" strokeWidth={2} style={{ cursor: "grab" }} onPointerDown={(e) => {
        e.preventDefault();
        setDrag(true);
      }} />

      {/* readout — fixed top-left */}
      <text x={40} y={44} fontFamily={MONO} fontSize={14} fill={R.world}>manipulability |det J|</text>
      <text x={40} y={68} fontFamily={MONO} fontSize={17} fontWeight={600} fill={near ? R.error : R.ink}>
        {manip.toFixed(2)}
      </text>
      {near && (
        <text x={40} y={92} fontFamily={MONO} fontSize={14} fontWeight={600} fill={R.error}>
          rank lost — ellipse collapsed to a line
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 3.6 · Approaching a singularity  (slider-driven diagram)
// One slider sweeps θ2 from folded (90°) toward straight (0°). A manipulability
// bar drains and the demanded joint velocity (to move outward at 5 cm/s) climbs
// and spikes off the chart as the arm straightens.
// ===========================================================================

export function RbSingularity() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const L1 = 3;
  const L2 = 2;
  const [t2, setT2] = useState(90);
  const [command, setCommand] = useState(true);
  const [disp, setDisp] = useState(90);

  useRafLoop((dt) => setDisp((d) => approach(d, t2, 0.2, dt)), { playing: inView && !reduced });

  const b = reduced ? t2 : disp;
  // Keep the hand pointing up-ish: fix θ1 so the arm reaches out to the right.
  const th1 = rad(40);
  const th12 = th1 + rad(b);
  const ex = L1 * Math.cos(th1);
  const ey = L1 * Math.sin(th1);
  const hx = ex + L2 * Math.cos(th12);
  const hy = ey + L2 * Math.sin(th12);

  // Jacobian + manipulability at this pose.
  const s1 = Math.sin(th1);
  const c1 = Math.cos(th1);
  const s12 = Math.sin(th12);
  const c12 = Math.cos(th12);
  const J = [
    [-L1 * s1 - L2 * s12, -L2 * s12],
    [L1 * c1 + L2 * c12, L2 * c12],
  ];
  const detJ = Math.abs(J[0][0] * J[1][1] - J[0][1] * J[1][0]);
  const manipNorm = clamp(detJ / (L1 * L2), 0, 1); // 0..1 (max at θ2=90)

  // Outward unit direction (along the arm) and the joint velocity IK demands to
  // move the hand outward at 5 cm/s. qdot = J^{-1} xdot; magnitude ~ 1/|det|.
  const outDir = [Math.cos(Math.atan2(hy, hx)), Math.sin(Math.atan2(hy, hx))];
  const invScale = J[0][0] * J[1][1] - J[0][1] * J[1][0];
  let qmag = 0;
  if (command && Math.abs(invScale) > 1e-6) {
    const xd = outDir[0] * 0.05;
    const yd = outDir[1] * 0.05;
    const q1 = (J[1][1] * xd - J[0][1] * yd) / invScale;
    const q2 = (-J[1][0] * xd + J[0][0] * yd) / invScale;
    qmag = Math.hypot(q1, q2);
  }
  const qDegPerS = qmag * (180 / Math.PI);
  const exploding = qDegPerS > 400;

  const barX = 470;
  const barY = 120;
  const barW = 200;
  return (
    <Stage
      innerRef={ref}
      title="Fig 3.6 · Approaching a singularity"
      ariaLabel={`Elbow angle ${Math.round(b)} degrees; manipulability ${manipNorm.toFixed(2)}`}
      controls={
        <>
          <Slider label="θ₂" min={0} max={90} value={t2} onChange={setT2} fmt={(v) => `${v}°`} />
          <Btn onClick={() => setCommand((v) => !v)} active={command}>
            {command ? "✓ command 5 cm/s outward" : "command 5 cm/s outward"}
          </Btn>
          <Btn onClick={() => setT2(90)}>↺ reset</Btn>
        </>
      }
    >
      <line x1={ORIGIN.x} y1={wy(-1)} x2={ORIGIN.x} y2={wy(5.2)} stroke={R.line} strokeWidth={1} strokeDasharray="4 6" />
      <line x1={wx(-1)} y1={ORIGIN.y} x2={wx(5.2)} y2={ORIGIN.y} stroke={R.line} strokeWidth={1} strokeDasharray="4 6" />

      {/* the arm */}
      <line x1={ORIGIN.x} y1={ORIGIN.y} x2={wx(ex)} y2={wy(ey)} stroke={R.signal} strokeWidth={10} strokeLinecap="round" />
      <line x1={wx(ex)} y1={wy(ey)} x2={wx(hx)} y2={wy(hy)} stroke={R.signal} strokeWidth={10} strokeLinecap="round" />
      <circle cx={ORIGIN.x} cy={ORIGIN.y} r={9} fill={R.ink} />
      <circle cx={wx(ex)} cy={wy(ey)} r={7} fill={R.ink} />
      <circle cx={wx(hx)} cy={wy(hy)} r={8} fill={R.signal} stroke="var(--background)" strokeWidth={2} />

      {/* outward command arrow (the scarce direction) */}
      {command && (
        <g opacity={exploding ? 1 : 0.8}>
          {svgArrow(wx(hx), wy(hy), wx(hx) + outDir[0] * 46, wy(hy) - outDir[1] * 46, exploding ? R.error : R.plan, 2.5, 8)}
        </g>
      )}

      {/* right lane: manipulability bar + demanded joint velocity */}
      <line x1={450} y1={40} x2={450} y2={392} stroke={R.line} strokeWidth={1.5} strokeDasharray="4 6" />
      <text x={barX} y={barY - 16} fontFamily={MONO} fontSize={14} fill={R.world}>manipulability</text>
      <rect x={barX} y={barY} width={barW} height={16} rx={6} fill="#e7e7e4" />
      <rect x={barX} y={barY} width={barW * manipNorm} height={16} rx={6} fill={R.plan} />
      <text x={barX + barW + 8} y={barY + 13} fontFamily={MONO} fontSize={13} fill={R.ink}>{manipNorm.toFixed(2)}</text>

      <text x={barX} y={barY + 70} fontFamily={MONO} fontSize={14} fill={R.world}>joint velocity IK demands</text>
      <text
        x={barX}
        y={barY + 104}
        fontFamily={MONO}
        fontSize={exploding ? 22 : 18}
        fontWeight={600}
        fill={exploding ? R.error : R.ink}
      >
        {command ? (exploding ? "→ ∞  °/s" : `${Math.round(qDegPerS)} °/s`) : "— off"}
      </text>
      {exploding && (
        <text x={barX} y={barY + 132} fontFamily={MONO} fontSize={13} fontWeight={600} fill={R.error}>
          inverse blowing up at full stretch
        </text>
      )}
      <text x={barX} y={barY + 180} fontFamily={MONO} fontSize={12} fill={R.world}>θ₂ → 0 : links align, det J → 0</text>
    </Stage>
  );
}

// ===========================================================================
// Fig 3.7 · Sweeping the elbow through the null space  (draggable field)
// A redundant 3-link planar arm holds its fingertip on a fixed target. A
// null-space slider sweeps the internal posture (elbow arc) with the fingertip
// nailed. An obstacle toggle + auto button drives the elbow clear, tip fixed.
// ===========================================================================

const L3 = [2.2, 2.0, 1.6]; // three link lengths (world units)
const REACH3 = L3[0] + L3[1] + L3[2];

// Solve a 3-link planar arm to place the fingertip at (tx, ty) with a chosen
// "self-motion" parameter u in [0,1] that picks the internal posture. We pin the
// wrist point on a circle of radius (reach of last link) around the tip, sweeping
// its angle by u, then 2-link IK the first two links to that wrist.
function solve3(tx: number, ty: number, u: number, L: number[]): number[] | null {
  const tipR = Math.hypot(tx, ty);
  if (tipR > L[0] + L[1] + L[2] || tipR < 1e-3) return null;
  const tipAng = Math.atan2(ty, tx);
  // wrist lies at distance L[2] from tip; direction chosen by u (bounded arc).
  const spread = 1.5; // radians of self-motion range
  const wristDir = tipAng + Math.PI + (u - 0.5) * spread;
  const wx3 = tx + L[2] * Math.cos(wristDir);
  const wy3 = ty + L[2] * Math.sin(wristDir);
  const wr = Math.hypot(wx3, wy3);
  if (wr > L[0] + L[1] || wr < Math.abs(L[0] - L[1])) return null;
  const c2 = clamp((wr * wr - L[0] * L[0] - L[1] * L[1]) / (2 * L[0] * L[1]), -1, 1);
  const a2 = Math.acos(c2);
  const a1 = Math.atan2(wy3, wx3) - Math.atan2(L[1] * Math.sin(a2), L[0] + L[1] * Math.cos(a2));
  // third joint aims from wrist to tip.
  const shElbowAbs = a1 + a2;
  const a3 = Math.atan2(ty - wy3, tx - wx3) - shElbowAbs;
  return [a1, a2, a3];
}

export function RbNullSpace() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [u, setU] = useState(0.5);
  const [target, setTarget] = useState({ x: 3.2, y: 2.4 });
  const [obstacle, setObstacle] = useState(false);
  const [dragTip, setDragTip] = useState(false);
  const [dispU, setDispU] = useState(0.5);
  const [auto, toggleAuto] = useReducer((p) => !p, false);

  // Obstacle fixed position (world units).
  const OBST = { x: 2.6, y: 3.0, r: 0.55 };

  // When auto-avoiding, drive u toward the sample that maximizes elbow clearance.
  useRafLoop(
    (dt) => {
      let targetU = u;
      if (obstacle && auto) {
        let best = -Infinity;
        let bestU = u;
        for (let i = 0; i <= 24; i++) {
          const uu = i / 24;
          const sol = solve3(target.x, target.y, uu, L3);
          if (!sol) continue;
          const p = jointsOf(sol, L3);
          const elbow = p[2]; // wrist joint as "elbow" proxy
          const clear = Math.hypot(elbow[0] - OBST.x, elbow[1] - OBST.y);
          if (clear > best) {
            best = clear;
            bestU = uu;
          }
        }
        targetU = bestU;
      }
      setDispU((d) => approach(d, reduced ? u : targetU, 0.16, dt));
      if (obstacle && auto) setU(targetU);
    },
    { playing: inView && !reduced },
  );

  const curU = reduced ? u : dispU;
  const sol = solve3(target.x, target.y, curU, L3) ?? solve3(target.x, target.y, 0.5, L3) ?? [0.6, 0.8, -0.4];
  const pts = jointsOf(sol, L3);

  const onMove = (e: ReactPointerEvent<SVGElement>) => {
    if (!dragTip) return;
    const [px, py] = svgPoint(e);
    let nx = clamp((px - ORIGIN.x) / PPU, -5.5, 5.5);
    let ny = clamp((ORIGIN.y - py) / PPU, -1, 5.5);
    const r = Math.hypot(nx, ny);
    if (r > REACH3 - 0.1) {
      nx = (nx / r) * (REACH3 - 0.2);
      ny = (ny / r) * (REACH3 - 0.2);
    }
    setTarget({ x: nx, y: ny });
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 3.7 · Sweeping the elbow through the null space"
      ariaLabel={`Redundant 3-link arm holding a fixed fingertip; self-motion ${curU.toFixed(2)}`}
      svgProps={{ onPointerMove: onMove, onPointerUp: () => setDragTip(false), onPointerLeave: () => setDragTip(false) }}
      controls={
        <>
          <Slider label="null-space" min={0} max={1} step={0.01} value={u} onChange={(v) => setU(v)} fmt={(v) => v.toFixed(2)} />
          <Btn onClick={() => setObstacle((v) => !v)} active={obstacle}>
            {obstacle ? "✓ obstacle" : "drop obstacle"}
          </Btn>
          {obstacle && (
            <Btn onClick={toggleAuto} active={auto}>
              {auto ? "✓ auto-avoid" : "auto-avoid"}
            </Btn>
          )}
          <Btn
            onClick={() => {
              setU(0.5);
              setTarget({ x: 3.2, y: 2.4 });
            }}
          >
            ↺ reset
          </Btn>
          <span className="font-mono text-[13px] text-[var(--muted)]">drag the fingertip</span>
        </>
      }
    >
      <line x1={wx(-5.5)} y1={ORIGIN.y} x2={wx(5.5)} y2={ORIGIN.y} stroke={R.line} strokeWidth={1} strokeDasharray="4 6" />

      {/* obstacle */}
      {obstacle && (
        <>
          <circle cx={wx(OBST.x)} cy={wy(OBST.y)} r={OBST.r * PPU} fill={R.fillRed} stroke={R.error} strokeWidth={2.5} />
          <text x={wx(OBST.x)} y={wy(OBST.y) + 4} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.error}>avoid</text>
        </>
      )}

      {/* ghost trail of a few null-space postures (all share the fingertip) */}
      {!reduced &&
        [0.1, 0.35, 0.65, 0.9].map((uu, i) => {
          const gs = solve3(target.x, target.y, uu, L3);
          if (!gs) return null;
          const gp = jointsOf(gs, L3);
          return (
            <polyline
              key={i}
              points={gp.map((p) => `${wx(p[0])},${wy(p[1])}`).join(" ")}
              fill="none"
              stroke={R.plan}
              strokeWidth={2}
              opacity={0.18}
            />
          );
        })}

      {/* the arm */}
      <polyline points={pts.map((p) => `${wx(p[0])},${wy(p[1])}`).join(" ")} fill="none" stroke={R.signal} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
      {pts.slice(0, -1).map((p, i) => (
        <circle key={i} cx={wx(p[0])} cy={wy(p[1])} r={i === 0 ? 9 : 6} fill={R.ink} />
      ))}
      {/* swept elbow (wrist joint) highlighted amber */}
      <circle cx={wx(pts[2][0])} cy={wy(pts[2][1])} r={7} fill={R.plan} stroke="var(--background)" strokeWidth={2} />

      {/* fixed fingertip target (green) */}
      <circle
        cx={wx(target.x)}
        cy={wy(target.y)}
        r={11}
        fill={R.fillGreen}
        stroke={R.goal}
        strokeWidth={3}
        style={{ cursor: "grab" }}
        onPointerDown={(e) => {
          e.preventDefault();
          setDragTip(true);
        }}
      />

      {/* readout */}
      <text x={40} y={44} fontFamily={MONO} fontSize={14} fill={R.world}>fingertip</text>
      <text x={40} y={68} fontFamily={MONO} fontSize={15} fontWeight={600} fill={R.goal}>frozen on target</text>
      <text x={40} y={412} fontFamily={MONO} fontSize={13} fill={R.plan}>
        amber = elbow swinging through the null space — the hand never moves
      </text>
    </Stage>
  );
}

// Forward-walk a planar arm's joint angles (relative) into absolute joint points.
function jointsOf(rel: number[], L: number[]): [number, number][] {
  const pts: [number, number][] = [[0, 0]];
  let ang = 0;
  let x = 0;
  let y = 0;
  for (let i = 0; i < rel.length; i++) {
    ang += rel[i];
    x += L[i] * Math.cos(ang);
    y += L[i] * Math.sin(ang);
    pts.push([x, y]);
  }
  return pts;
}
