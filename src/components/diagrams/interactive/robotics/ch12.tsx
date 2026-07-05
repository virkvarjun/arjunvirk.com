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
  lerp,
} from "./shared";

const rad = (deg: number) => (deg * Math.PI) / 180;
const smooth = (t: number) => t * t * (3 - 2 * t);

// ===========================================================================
// Fig 12.1 · Finding an antipodal grasp  (draggable field)
// Drag/rotate a blob; a parallel-jaw gripper closes on two opposing points.
// If the two surface normals point at each other inside their friction cones,
// the readout flips to "force closure — holds"; otherwise "will slip".
// ===========================================================================

// A closed blob defined as a radius function of angle (deterministic).
const BLOB_K = [1, 0.16, -0.1, 0.08, -0.05];
const blobR = (ang: number) =>
  92 *
  (1 +
    BLOB_K[1] * Math.cos(2 * ang) +
    BLOB_K[2] * Math.cos(3 * ang + 0.6) +
    BLOB_K[3] * Math.cos(4 * ang - 0.4) +
    BLOB_K[4] * Math.cos(5 * ang));

export function RbAntipodalGrasp() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [showCone, setShowCone] = useState(true);
  const [approachDeg, setApproachDeg] = useState(90); // gripper approach angle
  const [rot, setRot] = useState(24); // object rotation (deg), target
  const [center, setCenter] = useState({ x: 275, y: 230 });
  const [disp, setDisp] = useState({ rot: 24, close: 0 }); // eased rot + finger close
  const [drag, setDrag] = useState<null | "move" | "rotate">(null);

  const CX0 = center.x;
  const CY0 = center.y;
  const app = rad(approachDeg);
  // gripper axis unit vector and its perpendicular (the pinch line)
  const ux = Math.cos(app);
  const uy = Math.sin(app);

  // Ray-march the blob boundary along +/- the pinch line to find contacts.
  const contactFor = (dir: number, rotRad: number) => {
    for (let d = 190; d > 4; d -= 1.5) {
      const px = CX0 + dir * ux * d;
      const py = CY0 + dir * uy * d;
      const rx = px - CX0;
      const ry = py - CY0;
      const localAng = Math.atan2(ry, rx) - rotRad;
      const rr = blobR(localAng);
      if (Math.hypot(rx, ry) <= rr) {
        // just inside: step back to the surface for a clean contact point
        const cd = rr;
        const a = Math.atan2(ry, rx);
        const cx = CX0 + Math.cos(a) * cd;
        const cy = CY0 + Math.sin(a) * cd;
        // outward surface normal (numerical) in local frame -> world
        const eps = 0.02;
        const r1 = blobR(localAng + eps);
        const r0 = blobR(localAng - eps);
        const dr = (r1 - r0) / (2 * eps);
        // tangent, then normal (pointing outward)
        const worldAng = a;
        let nx = Math.cos(worldAng) + (dr / rr) * Math.sin(worldAng);
        let ny = Math.sin(worldAng) - (dr / rr) * Math.cos(worldAng);
        const nl = Math.hypot(nx, ny) || 1;
        nx /= nl;
        ny /= nl;
        return { x: cx, y: cy, nx, ny };
      }
    }
    return null;
  };

  useRafLoop(
    (dt) => {
      setDisp((s) => ({
        rot: approach(s.rot, rot, 0.2, dt),
        close: approach(s.close, 1, 0.12, dt),
      }));
    },
    { playing: inView && !reduced },
  );

  const curRot = reduced ? rot : disp.rot;
  const closeT = reduced ? 1 : disp.close;
  const rotRad = rad(curRot);

  const cA = contactFor(1, rotRad);
  const cB = contactFor(-1, rotRad);

  // Force closure test: each contact's outward normal should point back along
  // the pinch line toward the other contact, within the friction cone (~ ±18°).
  const FRICTION = rad(18);
  let holds = false;
  if (cA && cB) {
    // pinch line direction from A to B
    const okA = Math.acos(clamp(-(cA.nx * ux + cA.ny * uy), -1, 1)) < FRICTION;
    const okB = Math.acos(clamp(cB.nx * ux + cB.ny * uy, -1, 1)) < FRICTION;
    holds = okA && okB;
  }
  const grasp = holds ? R.goal : R.error;

  // finger positions: retract from contact by (1 - closeT) * gap
  const gap = 150;
  const fingerA = cA
    ? { x: lerp(CX0 + ux * gap, cA.x, closeT), y: lerp(CY0 + uy * gap, cA.y, closeT) }
    : null;
  const fingerB = cB
    ? { x: lerp(CX0 - ux * gap, cB.x, closeT), y: lerp(CY0 - uy * gap, cB.y, closeT) }
    : null;

  const blobPath = (() => {
    const N = 72;
    let p = "";
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const rr = blobR(a);
      const wx = CX0 + rr * Math.cos(a + rotRad);
      const wy = CY0 + rr * Math.sin(a + rotRad);
      p += `${i === 0 ? "M" : "L"} ${wx.toFixed(1)} ${wy.toFixed(1)} `;
    }
    return p + "Z";
  })();

  const onMove = (e: ReactPointerEvent<SVGElement>) => {
    if (!drag) return;
    const [x, y] = svgPoint(e);
    if (drag === "move") {
      setCenter({ x: clamp(x, 150, 400), y: clamp(y, 130, 320) });
    } else {
      const a = (Math.atan2(y - CY0, x - CX0) * 180) / Math.PI;
      setRot(a);
    }
  };

  const cone = (c: { x: number; y: number; nx: number; ny: number }) => {
    const L = 46;
    const base = Math.atan2(c.ny, c.nx);
    const p1x = c.x + Math.cos(base + FRICTION) * L;
    const p1y = c.y + Math.sin(base + FRICTION) * L;
    const p2x = c.x + Math.cos(base - FRICTION) * L;
    const p2y = c.y + Math.sin(base - FRICTION) * L;
    return (
      <polygon
        points={`${c.x},${c.y} ${p1x},${p1y} ${p2x},${p2y}`}
        fill={R.world}
        opacity={0.22}
        stroke={R.world}
        strokeWidth={1}
      />
    );
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 12.1 · Finding an antipodal grasp"
      ariaLabel={`A parallel-jaw gripper pinching a rotatable object; ${holds ? "force closure holds" : "the grasp will slip"}`}
      svgProps={{
        onPointerMove: onMove,
        onPointerUp: () => setDrag(null),
        onPointerLeave: () => setDrag(null),
      }}
      controls={
        <>
          <Slider
            label="approach"
            min={0}
            max={180}
            value={approachDeg}
            onChange={setApproachDeg}
            fmt={(v) => `${v}°`}
          />
          <Btn onClick={() => setShowCone((v) => !v)} active={showCone}>
            {showCone ? "✓ friction cone" : "show friction cone"}
          </Btn>
          <Btn
            onClick={() => {
              setRot(24);
              setApproachDeg(90);
              setCenter({ x: 275, y: 230 });
              setDisp({ rot: 24, close: 0 });
            }}
          >
            ↺ reset
          </Btn>
          <span className="font-mono text-[13px] text-[var(--muted)]">
            drag body to move · drag ring to rotate
          </span>
        </>
      }
    >
      {/* readout lane, top-left */}
      <text x={40} y={44} fontFamily={MONO} fontSize={14} fill={R.world}>
        grasp status
      </text>
      <text x={40} y={68} fontFamily={MONO} fontSize={17} fontWeight={600} fill={grasp}>
        {holds ? "force closure — holds ✓" : "will slip ✗"}
      </text>

      {/* pinch line (the antipodal axis) */}
      <line
        x1={CX0 - ux * 200}
        y1={CY0 - uy * 200}
        x2={CX0 + ux * 200}
        y2={CY0 + uy * 200}
        stroke={R.plan}
        strokeWidth={1.5}
        strokeDasharray="5 6"
        opacity={0.7}
      />

      {/* the object */}
      <path d={blobPath} fill={R.fillBlue} stroke={R.signal} strokeWidth={3} />
      {/* rotate handle ring */}
      <circle
        cx={CX0}
        cy={CY0}
        r={112}
        fill="none"
        stroke={R.line}
        strokeWidth={1.5}
        strokeDasharray="3 7"
        style={{ cursor: "grab" }}
        onPointerDown={(e) => {
          e.preventDefault();
          setDrag("rotate");
        }}
      />
      <circle
        cx={CX0}
        cy={CY0}
        r={12}
        fill={R.signal}
        stroke="var(--background)"
        strokeWidth={2}
        style={{ cursor: "grab" }}
        onPointerDown={(e) => {
          e.preventDefault();
          setDrag("move");
        }}
      />

      {/* friction cones */}
      {showCone && cA && cone(cA)}
      {showCone && cB && cone(cB)}

      {/* contact normals */}
      {cA && svgArrow(cA.x, cA.y, cA.x + cA.nx * 42, cA.y + cA.ny * 42, grasp, 2.5, 8)}
      {cB && svgArrow(cB.x, cB.y, cB.x + cB.nx * 42, cB.y + cB.ny * 42, grasp, 2.5, 8)}

      {/* gripper fingers */}
      {fingerA && (
        <g>
          <line
            x1={fingerA.x + ux * 26}
            y1={fingerA.y + uy * 26}
            x2={fingerA.x}
            y2={fingerA.y}
            stroke={R.plan}
            strokeWidth={9}
            strokeLinecap="round"
          />
          <circle cx={fingerA.x} cy={fingerA.y} r={6} fill={R.plan} />
        </g>
      )}
      {fingerB && (
        <g>
          <line
            x1={fingerB.x - ux * 26}
            y1={fingerB.y - uy * 26}
            x2={fingerB.x}
            y2={fingerB.y}
            stroke={R.plan}
            strokeWidth={9}
            strokeLinecap="round"
          />
          <circle cx={fingerB.x} cy={fingerB.y} r={6} fill={R.plan} />
        </g>
      )}

      {/* contact dots */}
      {cA && <circle cx={cA.x} cy={cA.y} r={5} fill={grasp} />}
      {cB && <circle cx={cB.x} cy={cB.y} r={5} fill={grasp} />}

      {/* legend lane, bottom */}
      <text x={40} y={412} fontFamily={MONO} fontSize={13} fill={R.world}>
        {holds
          ? "opposing normals inside the friction cones — the pinch resists any wrench"
          : "normals miss each other — a shove would break this grip"}
      </text>
      {reduced && (
        <text x={40} y={430} fontFamily={MONO} fontSize={12} fill={R.world}>
          Reduced motion: fingers shown closed; sliders and drag still update the grasp.
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 12.2 · Reorienting an object in-hand  (stepper)
// A multi-finger hand rotates a cube toward a ghosted target by a sequence of
// contact make/break/slide switches. Step advances one contact-switch (k/N);
// the risky finger (breaking/sliding) flashes red.
// ===========================================================================

const IH_STEPS = 6; // contact-switches
const FINGERS = 4;

export function RbInHandReorient() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, false);
  const [showForce, setShowForce] = useState(true);
  const [targetDeg, setTargetDeg] = useState(90);
  const [step, setStep] = useState(0); // 0..IH_STEPS
  // eased cube angle, pulse phase, and an accumulator that auto-advances steps.
  const [disp, setDisp] = useState({ ang: 0, phase: 0, acc: 0 });

  // cube angle target = fraction of steps done * commanded target
  const cubeTarget = (step / IH_STEPS) * targetDeg;
  // which finger is the "risky" one at this step
  const riskyFinger = step > 0 ? (step - 1) % FINGERS : -1;

  useRafLoop(
    (dt) => {
      setDisp((s) => {
        let ph = s.phase + dt * 2.2;
        if (ph > Math.PI * 2) ph -= Math.PI * 2;
        let acc = s.acc;
        if (playing) {
          acc += dt;
          if (acc >= 1.1) {
            acc = 0;
            setStep((k) => (k >= IH_STEPS ? k : k + 1));
          }
        } else {
          acc = 0;
        }
        return { ang: approach(s.ang, cubeTarget, 0.14, dt), phase: ph, acc };
      });
    },
    { playing: inView && !reduced },
  );

  const cubeAng = reduced ? targetDeg : disp.ang;
  const pulse = reduced ? 0.5 : (Math.sin(disp.phase) + 1) / 2;

  const CX = 260;
  const CY = 232;
  const half = 58;

  // cube corners rotated
  const corners = (ang: number) => {
    const c = Math.cos(rad(ang));
    const s = Math.sin(rad(ang));
    return [
      [-half, -half],
      [half, -half],
      [half, half],
      [-half, half],
    ].map(([x, y]) => [CX + x * c - y * s, CY + x * s + y * c]);
  };
  const cs = corners(cubeAng);
  const ghost = corners(targetDeg);

  // finger contact points sit on the cube edges, spaced around it
  const fingerPts = cs.map(([x, y], i) => {
    const nx = x - CX;
    const ny = y - CY;
    const nl = Math.hypot(nx, ny) || 1;
    return { x, y, ox: (nx / nl) * 44, oy: (ny / nl) * 44, i };
  });

  const doStep = () => setStep((k) => (k >= IH_STEPS ? k : k + 1));
  const reset = () => {
    setStep(0);
    setDisp({ ang: 0, phase: 0, acc: 0 });
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 12.2 · Reorienting an object in-hand"
      ariaLabel={`A four-finger hand rotating a cube toward a target; contact switch ${step} of ${IH_STEPS}`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Btn onClick={doStep} title="advance one contact-switch">
            ⏭ step
          </Btn>
          <Btn onClick={reset}>↺ reset</Btn>
          <Slider
            label="target"
            min={0}
            max={180}
            value={targetDeg}
            onChange={setTargetDeg}
            fmt={(v) => `${v}°`}
          />
          <Btn onClick={() => setShowForce((v) => !v)} active={showForce}>
            {showForce ? "✓ contact forces" : "show contact forces"}
          </Btn>
        </>
      }
    >
      {/* readout lane */}
      <text x={40} y={44} fontFamily={MONO} fontSize={14} fill={R.world}>
        contact switch
      </text>
      <text x={200} y={44} fontFamily={MONO} fontSize={15} fontWeight={600} fill={R.ink}>
        {step} / {IH_STEPS}
      </text>
      <text x={300} y={44} fontFamily={MONO} fontSize={14} fill={R.world}>
        cube angle
      </text>
      <text x={430} y={44} fontFamily={MONO} fontSize={15} fontWeight={600} fill={R.signal}>
        {Math.round(cubeAng)}°
      </text>

      {/* hand structure (palm) */}
      <ellipse cx={CX} cy={CY + 108} rx={96} ry={30} fill="#eeeeec" stroke={R.world} strokeWidth={2} />
      <text x={CX} y={CY + 150} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        hand
      </text>

      {/* ghosted target orientation */}
      <polygon
        points={ghost.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none"
        stroke={R.plan}
        strokeWidth={2}
        strokeDasharray="6 6"
        opacity={0.8}
      />
      <text
        x={ghost[1][0] + 8}
        y={ghost[1][1] - 6}
        fontFamily={MONO}
        fontSize={12}
        fill={R.plan}
      >
        target
      </text>

      {/* the cube */}
      <polygon
        points={cs.map(([x, y]) => `${x},${y}`).join(" ")}
        fill={R.fillBlue}
        stroke={R.signal}
        strokeWidth={3}
      />

      {/* fingers */}
      {fingerPts.map((f) => {
        const risky = f.i === riskyFinger;
        const col = risky ? R.error : R.goal;
        return (
          <g key={f.i}>
            <line
              x1={f.x + f.ox}
              y1={f.y + f.oy}
              x2={f.x + f.ox * 0.15}
              y2={f.y + f.oy * 0.15}
              stroke={R.world}
              strokeWidth={7}
              strokeLinecap="round"
            />
            <circle
              cx={f.x}
              cy={f.y}
              r={7}
              fill={col}
              stroke="var(--background)"
              strokeWidth={1.5}
            />
            {showForce && !risky && (
              <g opacity={0.4 + 0.5 * pulse}>
                {svgArrow(
                  f.x + f.ox * 0.7,
                  f.y + f.oy * 0.7,
                  f.x + f.ox * 0.2,
                  f.y + f.oy * 0.2,
                  R.goal,
                  2,
                  6,
                )}
              </g>
            )}
          </g>
        );
      })}

      {/* legend / status lane, bottom */}
      <text x={40} y={410} fontFamily={MONO} fontSize={13} fill={R.world}>
        <tspan fill={R.goal}>green</tspan> = gripping contact ·{" "}
        <tspan fill={R.error}>red</tspan> = the finger breaking/sliding (the risky moment)
      </text>
      {step >= IH_STEPS && (
        <text x={40} y={430} fontFamily={MONO} fontSize={13} fill={R.goal} fontWeight={600}>
          reached target orientation ✓
        </text>
      )}
      {reduced && step < IH_STEPS && (
        <text x={40} y={430} fontFamily={MONO} fontSize={12} fill={R.world}>
          Reduced motion: cube shown at target; step still advances the sequence.
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 12.3 · Which chapter runs which body part?  (toggle-compare)
// A line-art humanoid. Click a region to reveal which chapter's method controls
// it; "show all" labels every region. Each region does a calm idle motion.
// ===========================================================================

type BodyRegion = "legs" | "arms" | "torso" | "head" | "all";
const REGION_INFO: Record<
  Exclude<BodyRegion, "all">,
  { label: string; method: string; chapter: string; color: string; why: string }
> = {
  legs: {
    label: "legs",
    method: "RL locomotion",
    chapter: "Ch 7",
    color: R.goal,
    why: "walking is contact-rich and hand-code-resistant — learned in sim.",
  },
  arms: {
    label: "arms / hands",
    method: "VLA manipulation",
    chapter: "Ch 9",
    color: R.plan,
    why: "the hands need to understand the instruction and the scene.",
  },
  torso: {
    label: "torso / whole-body",
    method: "balance control (ZMP)",
    chapter: "Ch 4",
    color: R.signal,
    why: "keep the ZMP inside the support so the body doesn't tip.",
  },
  head: {
    label: "head / eyes",
    method: "perception + VLM",
    chapter: "Ch 8",
    color: R.world,
    why: "read the world; state estimation (Ch 5) pins the floating body.",
  },
};

export function RbBodyPartChapters() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [sel, setSel] = useState<BodyRegion>("all");
  const [t, setT] = useState(0);

  useRafLoop((dt) => setT((v) => v + dt), { playing: inView && !reduced });
  const osc = reduced ? 0 : Math.sin(t * 1.5);

  const CX = 220;
  const active = (r: Exclude<BodyRegion, "all">) => sel === "all" || sel === r;
  const glow = (r: Exclude<BodyRegion, "all">) =>
    sel === r ? 1 : sel === "all" ? 0.55 : 0.18;

  const colFor = (r: Exclude<BodyRegion, "all">) =>
    active(r) ? REGION_INFO[r].color : R.world;

  // joints
  const hip = { x: CX, y: 250 };
  const shoulderL = { x: CX - 40, y: 150 };
  const shoulderR = { x: CX + 40, y: 150 };
  const armL = { x: CX - 66, y: 220 + osc * 16 };
  const armR = { x: CX + 66, y: 220 - osc * 16 };
  const footL = { x: CX - 26 + osc * 6, y: 360 };
  const footR = { x: CX + 26 - osc * 6, y: 360 };

  return (
    <Stage
      innerRef={ref}
      title="Fig 12.3 · Which chapter runs which body part?"
      ariaLabel={`A humanoid with body regions mapped to chapters; ${sel === "all" ? "all regions shown" : sel + " selected"}`}
      controls={
        <>
          <Tabs
            options={[
              { id: "legs", label: "Legs" },
              { id: "arms", label: "Arms" },
              { id: "torso", label: "Torso" },
              { id: "head", label: "Head" },
              { id: "all", label: "Show all" },
            ]}
            value={sel}
            onChange={setSel}
          />
        </>
      }
    >
      {/* ground */}
      <line x1={CX - 120} y1={366} x2={CX + 120} y2={366} stroke={R.line} strokeWidth={2} />

      {/* legs (Ch7) */}
      <g strokeWidth={9} strokeLinecap="round" opacity={glow("legs")}>
        <line x1={hip.x - 16} y1={hip.y} x2={footL.x} y2={footL.y} stroke={colFor("legs")} />
        <line x1={hip.x + 16} y1={hip.y} x2={footR.x} y2={footR.y} stroke={colFor("legs")} />
      </g>
      {/* torso / whole-body (Ch4) */}
      <g opacity={glow("torso")}>
        <line
          x1={CX}
          y1={150}
          x2={CX}
          y2={250}
          stroke={colFor("torso")}
          strokeWidth={12}
          strokeLinecap="round"
        />
      </g>
      {/* arms (Ch9) */}
      <g strokeWidth={8} strokeLinecap="round" opacity={glow("arms")}>
        <line x1={shoulderL.x} y1={shoulderL.y} x2={armL.x} y2={armL.y} stroke={colFor("arms")} />
        <line x1={shoulderR.x} y1={shoulderR.y} x2={armR.x} y2={armR.y} stroke={colFor("arms")} />
        <circle cx={armL.x} cy={armL.y} r={7} fill={colFor("arms")} />
        <circle cx={armR.x} cy={armR.y} r={7} fill={colFor("arms")} />
      </g>
      {/* head (Ch8) */}
      <g opacity={glow("head")}>
        <circle cx={CX} cy={122} r={22} fill={active("head") ? R.fillBlue : "#eeeeec"} stroke={colFor("head")} strokeWidth={3} />
      </g>

      {/* selection glow ring on active region's anchor */}
      {sel !== "all" && (
        <circle
          cx={sel === "legs" ? CX : sel === "arms" ? CX + 66 : sel === "torso" ? CX : CX}
          cy={sel === "legs" ? 340 : sel === "arms" ? 220 : sel === "torso" ? 200 : 122}
          r={30}
          fill="none"
          stroke={REGION_INFO[sel].color}
          strokeWidth={2}
          strokeDasharray="4 5"
          opacity={0.6 + 0.3 * (reduced ? 0.5 : (Math.sin(t * 3) + 1) / 2)}
        />
      )}

      {/* callout panel, right lane */}
      <line x1={440} y1={60} x2={440} y2={390} stroke={R.line} strokeWidth={1.5} strokeDasharray="4 6" />
      {sel === "all" ? (
        <>
          <text x={468} y={96} fontFamily={MONO} fontSize={15} fontWeight={600} fill={R.ink}>
            the factored humanoid
          </text>
          {(["legs", "torso", "arms", "head"] as const).map((r, i) => (
            <g key={r}>
              <circle cx={472} cy={132 + i * 46} r={7} fill={REGION_INFO[r].color} />
              <text x={488} y={128 + i * 46} fontFamily={MONO} fontSize={14} fill={R.ink} fontWeight={600}>
                {REGION_INFO[r].label}
              </text>
              <text x={488} y={148 + i * 46} fontFamily={MONO} fontSize={12} fill={R.world}>
                {REGION_INFO[r].method} · {REGION_INFO[r].chapter}
              </text>
            </g>
          ))}
        </>
      ) : (
        <>
          <text x={468} y={110} fontFamily={MONO} fontSize={16} fontWeight={600} fill={REGION_INFO[sel].color}>
            {REGION_INFO[sel].label}
          </text>
          <text x={468} y={150} fontFamily={MONO} fontSize={14} fill={R.world}>
            method
          </text>
          <text x={468} y={172} fontFamily={MONO} fontSize={15} fill={R.ink} fontWeight={600}>
            {REGION_INFO[sel].method}
          </text>
          <text x={468} y={206} fontFamily={MONO} fontSize={14} fill={R.world}>
            chapter
          </text>
          <text x={468} y={228} fontFamily={MONO} fontSize={15} fill={R.ink} fontWeight={600}>
            {REGION_INFO[sel].chapter}
          </text>
          {wrapText(REGION_INFO[sel].why, 30).map((ln, i) => (
            <text key={i} x={468} y={266 + i * 20} fontFamily={MONO} fontSize={13} fill={R.world}>
              {ln}
            </text>
          ))}
        </>
      )}
    </Stage>
  );
}

// Simple word-wrap for callout prose (returns lines of <= maxChars).
function wrapText(s: string, maxChars: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ===========================================================================
// Fig 12.4 · The pub/sub graph of a real robot  (animated pipeline)
// A ROS 2 node graph; a data token flows camera -> perception -> planner ->
// controller -> gripper. Toggle sense/plan/act coloring; kill a node to show
// only its subscribers go dark. TF node quietly pulses publishing transforms.
// ===========================================================================

type GNode = {
  id: string;
  x: number;
  y: number;
  label: string;
  beat: "sense" | "plan" | "act" | "tf";
};
const GNODES: GNode[] = [
  { id: "cam", x: 100, y: 120, label: "camera", beat: "sense" },
  { id: "perc", x: 270, y: 120, label: "perception", beat: "sense" },
  { id: "plan", x: 440, y: 120, label: "planner / VLA", beat: "plan" },
  { id: "ctrl", x: 610, y: 220, label: "controller", beat: "act" },
  { id: "grip", x: 440, y: 320, label: "gripper", beat: "act" },
  { id: "tf", x: 190, y: 300, label: "TF", beat: "tf" },
];
// edges = the token path in order, with topic labels
const GEDGES: { from: string; to: string; topic: string; path: boolean }[] = [
  { from: "cam", to: "perc", topic: "/camera/image", path: true },
  { from: "perc", to: "plan", topic: "/objects", path: true },
  { from: "plan", to: "ctrl", topic: "/goal_pose", path: true },
  { from: "ctrl", to: "grip", topic: "/joint_cmd", path: true },
  { from: "tf", to: "plan", topic: "/tf", path: false },
];
const BEAT_COLOR = {
  sense: R.signal,
  plan: R.plan,
  act: R.goal,
  tf: R.world,
} as const;
const NW = 68;
const NH = 26;

export function RbPubSubGraph() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [speed, setSpeed] = useState(0.7);
  const [phaseColor, setPhaseColor] = useState(false);
  const [killed, setKilled] = useState<string | null>(null);
  const [st, setSt] = useState({ phase: 0, tf: 0 });

  const pathEdges = GEDGES.filter((e) => e.path);

  useRafLoop(
    (dt) => {
      setSt((s) => {
        let p = s.phase + dt * speed;
        if (p >= pathEdges.length) p -= pathEdges.length;
        let tf = s.tf + dt * 1.8;
        if (tf > Math.PI * 2) tf -= Math.PI * 2;
        return { phase: p, tf };
      });
    },
    { playing: playing && inView && !reduced },
  );

  const node = (id: string) => GNODES.find((n) => n.id === id)!;
  // which nodes are starved: any node downstream of the killed one on the path
  const starved = new Set<string>();
  if (killed) {
    starved.add(killed);
    // propagate along path edges
    let changed = true;
    while (changed) {
      changed = false;
      for (const e of pathEdges) {
        if (starved.has(e.from) && !starved.has(e.to)) {
          starved.add(e.to);
          changed = true;
        }
      }
    }
  }

  const seg = Math.floor(st.phase) % pathEdges.length;
  const f = smooth(st.phase - Math.floor(st.phase));
  const e = pathEdges[seg];
  const a = node(e.from);
  const b = node(e.to);
  const tokenX = reduced ? a.x : lerp(a.x, b.x, f);
  const tokenY = reduced ? a.y : lerp(a.y, b.y, f);
  const tokenAlive = !killed || (!starved.has(e.from) && !starved.has(e.to));
  const tfPulse = reduced ? 0.5 : (Math.sin(st.tf) + 1) / 2;

  const nodeColor = (n: GNode) => {
    if (starved.has(n.id)) return R.error;
    if (phaseColor) return BEAT_COLOR[n.beat];
    return n.beat === "tf" ? R.world : R.ink;
  };
  const nodeFill = (n: GNode) => {
    if (starved.has(n.id)) return R.fillRed;
    if (!phaseColor) return "#eeeeec";
    return n.beat === "sense"
      ? R.fillBlue
      : n.beat === "plan"
        ? R.fillAmber
        : n.beat === "act"
          ? R.fillGreen
          : "#eeeeec";
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 12.4 · The pub/sub graph of a real robot"
      ariaLabel="A ROS 2 node graph with a data token flowing through the sense-plan-act loop"
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Slider
            label="speed"
            min={0.25}
            max={2}
            step={0.05}
            value={speed}
            onChange={setSpeed}
            fmt={(v) => `${v.toFixed(2)}×`}
          />
          <Btn onClick={() => setPhaseColor((v) => !v)} active={phaseColor}>
            {phaseColor ? "✓ sense/plan/act" : "highlight phases"}
          </Btn>
          <Btn
            onClick={() => setKilled((k) => (k === "perc" ? null : "perc"))}
            active={killed === "perc"}
            title="drop the perception node"
          >
            {killed ? "revive node" : "kill a node"}
          </Btn>
        </>
      }
    >
      {/* edges */}
      {GEDGES.map((ed, i) => {
        const na = node(ed.from);
        const nb = node(ed.to);
        const dead = killed != null && (starved.has(ed.from) || starved.has(ed.to));
        const col = dead ? R.error : ed.path ? R.line : R.world;
        return (
          <g key={i} opacity={dead ? 0.5 : 0.9}>
            {svgArrow(na.x, na.y, nb.x, nb.y, col, 2.5, 9)}
            <text
              x={(na.x + nb.x) / 2}
              y={(na.y + nb.y) / 2 - 8}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={12}
              fill={dead ? R.error : R.world}
            >
              {ed.topic}
            </text>
          </g>
        );
      })}

      {/* nodes */}
      {GNODES.map((n) => {
        const near =
          !reduced && Math.hypot(n.x - tokenX, n.y - tokenY) < 40 && tokenAlive;
        const isTf = n.beat === "tf";
        return (
          <g key={n.id}>
            <rect
              x={n.x - NW}
              y={n.y - NH}
              width={NW * 2}
              height={NH * 2}
              rx={9}
              fill={nodeFill(n)}
              stroke={nodeColor(n)}
              strokeWidth={near || (isTf && tfPulse > 0.6) ? 4 : 2}
              opacity={isTf ? 0.55 + 0.4 * tfPulse : 1}
            />
            <text
              x={n.x}
              y={n.y + 5}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={13}
              fontWeight={600}
              fill={starved.has(n.id) ? R.error : R.ink}
            >
              {n.label}
            </text>
          </g>
        );
      })}

      {/* the data token */}
      {!reduced && tokenAlive && (
        <g>
          <circle cx={tokenX} cy={tokenY} r={11} fill={BEAT_COLOR[b.beat]} opacity={0.25} />
          <circle cx={tokenX} cy={tokenY} r={6} fill={BEAT_COLOR[b.beat]} />
        </g>
      )}

      {/* status lane, bottom */}
      <text x={40} y={410} fontFamily={MONO} fontSize={13} fill={killed ? R.error : R.world}>
        {killed
          ? "perception killed — only its subscribers go dark; camera & TF keep publishing"
          : "one token traces sense → plan → act; nodes agree on topics, not on each other"}
      </text>
      {reduced && (
        <text x={40} y={430} fontFamily={MONO} fontSize={12} fill={R.world}>
          Reduced motion: graph shown static; kill / phase toggles still work.
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 12.5 · The generalization gap: seen vs unseen  (slider-driven diagram)
// Two success-rate distributions (seen = green, unseen = amber) drawn as bell
// curves with confidence bands. Fewer trials fattens the bands; more novelty
// pushes the unseen mean down and widens the gap.
// ===========================================================================

export function RbGeneralizationGap() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [trials, setTrials] = useState(50);
  const [novelty, setNovelty] = useState(50);
  const [showCI, setShowCI] = useState(true);
  const [disp, setDisp] = useState({ seen: 0.88, unseen: 0.55, band: 0.08 });

  // targets
  const seenMean = 0.88;
  const unseenMean = clamp(0.88 - (novelty / 100) * 0.62, 0.15, 0.88);
  // confidence half-width ~ 1/sqrt(trials), scaled
  const band = clamp(0.55 / Math.sqrt(trials), 0.015, 0.25);

  useRafLoop(
    (dt) => {
      setDisp((s) => ({
        seen: approach(s.seen, seenMean, 0.16, dt),
        unseen: approach(s.unseen, unseenMean, 0.16, dt),
        band: approach(s.band, band, 0.16, dt),
      }));
    },
    { playing: inView && !reduced },
  );

  const sMean = reduced ? seenMean : disp.seen;
  const uMean = reduced ? unseenMean : disp.unseen;
  const bw = reduced ? band : disp.band;

  // plot area
  const X0 = 90;
  const X1 = 640;
  const Y0 = 90;
  const Y1 = 330;
  const rateToX = (r: number) => X0 + r * (X1 - X0);
  const sigma = 0.05 + bw; // curve spread grows with uncertainty

  // gaussian curve as a path across the plot, peaked at mean
  const curve = (mean: number, color: string, fill: string) => {
    const N = 60;
    let p = `M ${X0} ${Y1} `;
    for (let i = 0; i <= N; i++) {
      const r = i / N;
      const g = Math.exp(-0.5 * ((r - mean) / sigma) ** 2);
      const x = rateToX(r);
      const y = Y1 - g * (Y1 - Y0) * 0.82;
      p += `L ${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    p += `L ${X1} ${Y1} Z`;
    return (
      <path d={p} fill={fill} opacity={0.55} stroke={color} strokeWidth={2.5} />
    );
  };

  const gapNoisy = Math.abs(sMean - uMean) < bw * 1.6;
  const gapPct = Math.round((sMean - uMean) * 100);

  return (
    <Stage
      innerRef={ref}
      title="Fig 12.5 · The generalization gap: seen vs unseen"
      ariaLabel={`Success-rate distributions for seen and unseen conditions; gap ${gapPct} percent, ${gapNoisy ? "inside the noise band" : "statistically clear"}`}
      controls={
        <>
          <Slider
            label="trials"
            min={5}
            max={400}
            step={5}
            value={trials}
            onChange={setTrials}
            fmt={(v) => `${v}`}
          />
          <Slider
            label="novelty"
            min={0}
            max={100}
            value={novelty}
            onChange={setNovelty}
            fmt={(v) => `${v}%`}
          />
          <Btn onClick={() => setShowCI((v) => !v)} active={showCI}>
            {showCI ? "✓ confidence" : "show confidence"}
          </Btn>
          <Btn
            onClick={() => {
              setTrials(50);
              setNovelty(50);
            }}
          >
            ↺ reset
          </Btn>
        </>
      }
    >
      {/* axes */}
      <line x1={X0} y1={Y1} x2={X1} y2={Y1} stroke={R.line} strokeWidth={2} />
      {[0, 0.25, 0.5, 0.75, 1].map((r) => (
        <g key={r}>
          <line x1={rateToX(r)} y1={Y1} x2={rateToX(r)} y2={Y1 + 6} stroke={R.line} strokeWidth={1.5} />
          <text x={rateToX(r)} y={Y1 + 22} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
            {Math.round(r * 100)}%
          </text>
        </g>
      ))}
      <text x={(X0 + X1) / 2} y={Y1 + 44} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>
        success rate →
      </text>

      {/* distributions */}
      {curve(uMean, R.plan, R.fillAmber)}
      {curve(sMean, R.goal, R.fillGreen)}

      {/* confidence bands at each mean */}
      {showCI && (
        <>
          <rect x={rateToX(clamp(sMean - bw, 0, 1))} y={Y0 - 6} width={rateToX(sMean + bw) - rateToX(sMean - bw)} height={Y1 - Y0 + 6} fill={R.goal} opacity={0.12} />
          <rect x={rateToX(clamp(uMean - bw, 0, 1))} y={Y0 - 6} width={rateToX(clamp(uMean + bw, 0, 1)) - rateToX(clamp(uMean - bw, 0, 1))} height={Y1 - Y0 + 6} fill={R.plan} opacity={0.12} />
        </>
      )}

      {/* mean lines */}
      <line x1={rateToX(sMean)} y1={Y0 - 6} x2={rateToX(sMean)} y2={Y1} stroke={R.goal} strokeWidth={2} strokeDasharray="5 5" />
      <line x1={rateToX(uMean)} y1={Y0 - 6} x2={rateToX(uMean)} y2={Y1} stroke={R.plan} strokeWidth={2} strokeDasharray="5 5" />

      {/* the gap bracket */}
      <line x1={rateToX(uMean)} y1={Y0 - 14} x2={rateToX(sMean)} y2={Y0 - 14} stroke={R.error} strokeWidth={2} strokeDasharray={gapNoisy ? "3 4" : undefined} />
      <text x={(rateToX(uMean) + rateToX(sMean)) / 2} y={Y0 - 20} textAnchor="middle" fontFamily={MONO} fontSize={13} fontWeight={600} fill={R.error}>
        gap {gapPct}%
      </text>

      {/* legend lane, top-left */}
      <text x={40} y={44} fontFamily={MONO} fontSize={13} fill={R.goal} fontWeight={600}>
        ● seen (flattering)
      </text>
      <text x={230} y={44} fontFamily={MONO} fontSize={13} fill={R.plan} fontWeight={600}>
        ● unseen (honest)
      </text>

      {/* status lane, bottom */}
      <text x={40} y={410} fontFamily={MONO} fontSize={13} fill={gapNoisy ? R.error : R.world}>
        {gapNoisy
          ? "too few trials — the gap has dissolved into noise; the comparison is meaningless"
          : "the seen/unseen gap is the honest measure — a big gap means it memorized, not learned"}
      </text>
      {reduced && (
        <text x={40} y={430} fontFamily={MONO} fontSize={12} fill={R.world}>
          Reduced motion: distributions shown static; sliders still recompute the gap.
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 12.6 · Stiff vs compliant: what happens when a human is in the way
// (toggle-compare)
// The same arm runs into a hand two ways. Stiff drives through and spikes the
// force past the limit (red). Compliant senses the resistance and halts at its
// force cap (green). A force gauge tracks the contact force live.
// ===========================================================================

type ArmMode = "stiff" | "compliant";

export function RbStiffVsCompliant() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [mode, setMode] = useState<ArmMode>("stiff");
  const [running, setRunning] = useState(false);
  const [forceLimit, setForceLimit] = useState(0.45); // 0..1 of gauge
  const [st, setSt] = useState({ reach: 0, force: 0 }); // reach 0..1, force 0..1

  const HAND_X = 470; // where the human hand sits
  const START_X = 150;
  const TARGET_X = 600;
  const armX = (reach: number) => lerp(START_X, TARGET_X, reach);
  const contactReach = (HAND_X - START_X) / (TARGET_X - START_X);

  useRafLoop(
    (dt) => {
      setSt((s) => {
        if (!running) return s;
        let reach = s.reach;
        let force = s.force;
        const hitContact = reach >= contactReach - 0.001;
        if (!hitContact) {
          reach = Math.min(contactReach, reach + dt * 0.5);
          force = approach(force, 0, 0.2, dt);
        } else if (mode === "stiff") {
          // keeps driving; force spikes past the limit
          reach = Math.min(1, reach + dt * 0.18);
          force = approach(force, 0.95, 0.08, dt);
        } else {
          // compliant: halts at contact, force settles at the cap
          reach = contactReach;
          force = approach(force, forceLimit, 0.12, dt);
        }
        return { reach, force };
      });
    },
    { playing: inView && !reduced && running },
  );

  const reach = reduced ? (mode === "stiff" ? 0.78 : contactReach) : st.reach;
  const force = reduced ? (mode === "stiff" ? 0.95 : forceLimit) : st.force;
  const ax = armX(reach);
  const danger = force > forceLimit + 0.02;
  const armCol = danger ? R.error : R.signal;

  const run = () => {
    setSt({ reach: 0, force: 0 });
    setRunning(true);
  };
  const reset = () => {
    setRunning(false);
    setSt({ reach: 0, force: 0 });
  };

  // gauge geometry (top-left readout lane)
  const GX = 40;
  const GY = 60;
  const GW = 240;
  const limitX = GX + forceLimit * GW;

  return (
    <Stage
      innerRef={ref}
      title="Fig 12.6 · Stiff vs compliant when a human is in the way"
      ariaLabel={`A ${mode} arm running into a human hand; contact force ${Math.round(force * 100)} percent, ${danger ? "in the danger zone" : "under the safe limit"}`}
      controls={
        <>
          <Tabs
            options={[
              { id: "stiff", label: "Stiff" },
              { id: "compliant", label: "Compliant" },
            ]}
            value={mode}
            onChange={(m) => {
              setMode(m);
              reset();
            }}
          />
          {mode === "compliant" && (
            <Slider
              label="force limit"
              min={0.15}
              max={0.7}
              step={0.01}
              value={forceLimit}
              onChange={setForceLimit}
              fmt={(v) => `${Math.round(v * 100)}%`}
            />
          )}
          <Btn onClick={run}>▶ run into obstacle</Btn>
          <Btn onClick={reset}>↺ reset</Btn>
        </>
      }
    >
      {/* force gauge, top-left */}
      <text x={GX} y={48} fontFamily={MONO} fontSize={14} fill={R.world}>
        contact force
      </text>
      <rect x={GX} y={GY} width={GW} height={16} rx={8} fill="#e7e7e4" />
      {/* danger zone (past limit) */}
      <rect x={limitX} y={GY} width={GX + GW - limitX} height={16} rx={0} fill={R.fillRed} opacity={0.6} />
      <rect x={GX} y={GY} width={GW * force} height={16} rx={8} fill={danger ? R.error : R.goal} />
      <line x1={limitX} y1={GY - 5} x2={limitX} y2={GY + 21} stroke={R.ink} strokeWidth={2} />
      <text x={limitX} y={GY - 10} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.ink}>
        limit
      </text>
      <text x={GX + GW + 14} y={GY + 13} fontFamily={MONO} fontSize={14} fontWeight={600} fill={danger ? R.error : R.goal}>
        {Math.round(force * 100)}%
      </text>

      {/* ground / bench */}
      <line x1={100} y1={330} x2={660} y2={330} stroke={R.line} strokeWidth={2} />

      {/* target marker (command) */}
      <line x1={TARGET_X} y1={150} x2={TARGET_X} y2={330} stroke={R.plan} strokeWidth={1.5} strokeDasharray="5 6" />
      <text x={TARGET_X} y={144} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.plan}>
        target
      </text>

      {/* robot base + arm (a horizontal link driving right) */}
      <rect x={START_X - 40} y={230} width={40} height={70} rx={6} fill="#eeeeec" stroke={R.world} strokeWidth={2} />
      <line x1={START_X} y1={265} x2={ax} y2={265} stroke={armCol} strokeWidth={12} strokeLinecap="round" />
      <circle cx={ax} cy={265} r={12} fill={armCol} />

      {/* the human hand obstacle */}
      <g>
        <rect x={HAND_X} y={244} width={44} height={42} rx={10} fill="#eeeeec" stroke={R.world} strokeWidth={2.5} />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={HAND_X + 4 + i * 10} y={224} width={7} height={24} rx={3} fill="#eeeeec" stroke={R.world} strokeWidth={2} />
        ))}
        <text x={HAND_X + 22} y={306} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
          human
        </text>
      </g>

      {/* contact flash */}
      {reach >= contactReach - 0.005 && (
        <circle cx={HAND_X} cy={265} r={danger ? 16 : 12} fill="none" stroke={danger ? R.error : R.goal} strokeWidth={3} opacity={0.8} />
      )}

      {/* status lane, bottom */}
      <text x={40} y={410} fontFamily={MONO} fontSize={13} fill={danger ? R.error : mode === "compliant" ? R.goal : R.world}>
        {mode === "stiff"
          ? danger
            ? "STIFF: drives through the hand — force spikes past the limit into the danger zone"
            : "stiff, position-controlled: it will not yield — press run"
          : force >= forceLimit - 0.03 && reach >= contactReach - 0.005
            ? "COMPLIANT: senses the resistance and halts safely under its force cap ✓"
            : "compliant, force-limited: it yields on contact — press run"}
      </text>
      {reduced && (
        <text x={40} y={430} fontFamily={MONO} fontSize={12} fill={R.world}>
          Reduced motion: final state shown per tab; the force limit slider still applies.
        </text>
      )}
    </Stage>
  );
}
