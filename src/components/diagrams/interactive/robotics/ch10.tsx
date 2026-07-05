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
  mulberry32,
} from "./shared";

const smooth = (t: number) => t * t * (3 - 2 * t);

// ===========================================================================
// Fig 10.1 · Behavior cloning is supervised learning on (o, a) pairs
// A demo trajectory (left) is sliced into a stack of (o, a) cards that flow
// into a network box π; on the right the trained π runs a loop that drives a
// fresh arm to the block. More demos => thicker stack, smoother deployed arm.
// ===========================================================================

export function RbBehaviorCloning() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [demos, setDemos] = useState(50); // 5..200
  // phase 0..1 flow of a card; armT 0..1 progress of deployed arm; jitter phase
  const [st, setSt] = useState({ card: 0, arm: 0, wob: 0 });

  useRafLoop(
    (dt) => {
      setSt((s) => {
        let card = s.card + dt * 0.6;
        if (card >= 1) card -= 1;
        let arm = s.arm + dt * 0.35;
        if (arm >= 1) arm = 0;
        return { card, arm, wob: s.wob + dt * 6 };
      });
    },
    { playing: playing && inView && !reduced },
  );

  // reliability rises with demo count; jitter falls
  const reliability = clamp((demos - 5) / 195, 0, 1);
  const jitter = reduced ? 0 : (1 - reliability) * 6 * Math.sin(st.wob);
  const stackN = Math.round(lerp(3, 10, reliability));

  // demo arm (left) reaching target
  const demoBase = { x: 70, y: 300 };
  const demoBlock = { x: 205, y: 150 };
  // deployed arm (right)
  const depBase = { x: 590, y: 300 };
  const depBlock = { x: 645, y: 150 };
  const armT = reduced ? 1 : smooth(st.arm);
  const depTip = {
    x: lerp(depBase.x, depBlock.x, armT) + jitter,
    y: lerp(depBase.y, depBlock.y, armT) - 40 * Math.sin(Math.PI * armT) + jitter * 0.5,
  };
  const reached = armT > 0.9;

  // network box
  const netX = 315;
  const netY = 190;
  const netW = 96;
  const netH = 68;
  const cardX = reduced ? netX - 90 : lerp(210, netX - 20, smooth(st.card));
  const cardY = 200;

  return (
    <Stage
      innerRef={ref}
      title="Fig 10.1 · Behavior cloning = supervised learning on (o, a) pairs"
      ariaLabel={`Expert demo sliced into observation-action cards feeding a policy network that drives a deployed arm; ${demos} demonstrations`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Slider
            label="demos"
            min={5}
            max={200}
            step={5}
            value={demos}
            onChange={setDemos}
            fmt={(v) => `${v}`}
          />
          <Btn onClick={() => setSt({ card: 0, arm: 0, wob: 0 })}>↺ reset</Btn>
        </>
      }
    >
      {/* lane labels (fixed) */}
      <text x={140} y={34} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>
        expert demonstration
      </text>
      <text x={363} y={34} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>
        train π
      </text>
      <text x={600} y={34} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>
        deploy π (observe → act)
      </text>
      <line x1={272} y1={44} x2={272} y2={400} stroke={R.line} strokeWidth={1.2} strokeDasharray="4 6" />
      <line x1={455} y1={44} x2={455} y2={400} stroke={R.line} strokeWidth={1.2} strokeDasharray="4 6" />

      {/* demo arm reaching the block */}
      <circle cx={demoBlock.x} cy={demoBlock.y} r={12} fill={R.fillGreen} stroke={R.goal} strokeWidth={2.5} />
      <line x1={demoBase.x} y1={demoBase.y} x2={140} y2={220} stroke={R.signal} strokeWidth={9} strokeLinecap="round" />
      <line x1={140} y1={220} x2={demoBlock.x - 12} y2={demoBlock.y + 8} stroke={R.signal} strokeWidth={9} strokeLinecap="round" />
      <circle cx={demoBase.x} cy={demoBase.y} r={7} fill={R.ink} />

      {/* stack of (o,a) cards */}
      {Array.from({ length: stackN }).map((_, i) => (
        <g key={i} transform={`translate(${175 + i * 3} ${232 + i * 3})`}>
          <rect x={0} y={0} width={64} height={22} rx={4} fill={R.fillBlue} stroke={R.signal} strokeWidth={1.4} />
        </g>
      ))}
      <text x={207} y={318} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.signal}>
        (o, a) pairs
      </text>

      {/* flowing card into π */}
      {!reduced && (
        <rect x={cardX} y={cardY} width={64} height={22} rx={4} fill={R.fillAmber} stroke={R.plan} strokeWidth={1.6} />
      )}

      {/* network box π */}
      <rect x={netX} y={netY} width={netW} height={netH} rx={10} fill="#eeeeec" stroke={R.world} strokeWidth={2.5} />
      <text x={netX + netW / 2} y={netY + 30} textAnchor="middle" fontFamily={MONO} fontSize={22} fontWeight={600} fill={R.ink}>
        π
      </text>
      <text x={netX + netW / 2} y={netY + 52} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        policy net
      </text>
      {svgArrow(netX + netW, netY + netH / 2, 470, netY + netH / 2, R.plan, 2.5, 9)}

      {/* deployed arm */}
      <circle cx={depBlock.x} cy={depBlock.y} r={12} fill={reached ? R.fillGreen : "#eeeeec"} stroke={reached ? R.goal : R.world} strokeWidth={2.5} />
      <line x1={depBase.x} y1={depBase.y} x2={(depBase.x + depTip.x) / 2} y2={(depBase.y + depTip.y) / 2 - 20} stroke={R.signal} strokeWidth={9} strokeLinecap="round" />
      <line x1={(depBase.x + depTip.x) / 2} y1={(depBase.y + depTip.y) / 2 - 20} x2={depTip.x} y2={depTip.y} stroke={R.signal} strokeWidth={9} strokeLinecap="round" />
      <circle cx={depBase.x} cy={depBase.y} r={7} fill={R.ink} />
      <circle cx={depTip.x} cy={depTip.y} r={6} fill={R.signal} />

      {/* reliability readout lane (fixed, bottom) */}
      <text x={478} y={378} fontFamily={MONO} fontSize={12} fill={R.world}>
        reliability
      </text>
      <rect x={478} y={386} width={160} height={11} rx={5} fill="#e7e7e4" />
      <rect x={478} y={386} width={160 * reliability} height={11} rx={5} fill={reliability > 0.6 ? R.goal : R.plan} />
      <text x={646} y={396} fontFamily={MONO} fontSize={12} fill={R.ink}>
        {Math.round(reliability * 100)}%
      </text>

      {reduced && (
        <text x={30} y={420} fontFamily={MONO} fontSize={12} fill={R.world}>
          Reduced motion: shown at rest; the demos slider still sets stack size and reliability.
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 10.2 · Small errors compound into total failure  (slider-driven)
// A green expert path curves to a goal inside a grey "seen in training" tube.
// A blue BC path steps along, each step nudged off and compounding, so it peels
// out of the tube and spirals. DAgger toggle snaps it back with red arrows.
// Live readout: accumulated error ~ T^2 without DAgger, ~ T with it.
// ===========================================================================

const EXP_PATH: [number, number][] = Array.from({ length: 101 }).map((_, i) => {
  const t = i / 100;
  const x = 90 + t * 520;
  const y = 300 - Math.sin(t * Math.PI) * 150;
  return [x, y];
});

export function RbCompoundingError() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [eps, setEps] = useState(0.02); // per-step error
  const [horizon, setHorizon] = useState(80); // T (1..100)
  const [dagger, setDagger] = useState(false);
  const [k, setK] = useState(0); // current step index along path

  useRafLoop(
    (dt) => {
      setK((v) => {
        const nx = v + dt * 26;
        return nx >= horizon ? 0 : nx;
      });
    },
    { playing: playing && inView && !reduced },
  );

  const kNow = reduced ? horizon : Math.min(k, horizon);
  const rng = mulberry32(1234);
  // Build the blue policy path: each step drifts off the expert, drift feeds on
  // itself; DAgger pulls it back toward the tube.
  const bluePath: [number, number][] = [];
  let dev = 0; // perpendicular deviation
  for (let i = 0; i <= Math.ceil(kNow); i++) {
    const idx = Math.min(i, 100);
    const [ex, ey] = EXP_PATH[idx];
    const push = (rng() - 0.5) * eps * 60;
    dev = dev * (dagger ? 0.72 : 1.06) + push + (dagger ? 0 : dev * 0.02);
    dev = clamp(dev, -140, 140);
    bluePath.push([ex, ey + dev]);
  }
  const bluePts = bluePath.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const expPts = EXP_PATH.map(([x, y]) => `${x},${y}`).join(" ");
  const tip = bluePath[bluePath.length - 1] ?? EXP_PATH[0];

  // accumulated error: quadratic without dagger, linear with
  const tFrac = kNow / 100;
  const accErr = dagger ? tFrac * eps * 900 : tFrac * tFrac * eps * 5200;

  return (
    <Stage
      innerRef={ref}
      title="Fig 10.2 · Small errors compound into total failure"
      ariaLabel={`Expert path with a training tube; a behavior-cloning path drifts out and spirals as error compounds; DAgger ${dagger ? "on" : "off"}`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Slider label="ε" min={0.005} max={0.06} step={0.005} value={eps} onChange={setEps} fmt={(v) => v.toFixed(3)} />
          <Slider label="T" min={10} max={100} step={1} value={horizon} onChange={setHorizon} fmt={(v) => `${v}`} />
          <Btn onClick={() => setDagger((v) => !v)} active={dagger}>
            {dagger ? "✓ DAgger relabeling" : "DAgger relabeling"}
          </Btn>
          <Btn onClick={() => setK(0)}>↺ reset</Btn>
        </>
      }
    >
      {/* "seen in training" tube around the expert path */}
      <polyline points={expPts} fill="none" stroke="#dcdcd8" strokeWidth={38} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
      <polyline points={expPts} fill="none" stroke={R.goal} strokeWidth={3} strokeDasharray="6 5" />
      <text x={90} y={40} fontFamily={MONO} fontSize={13} fill={R.world}>
        grey tube = states seen in training
      </text>
      <text x={90} y={58} fontFamily={MONO} fontSize={13} fill={R.goal}>
        green = expert path
      </text>
      <circle cx={EXP_PATH[100][0]} cy={EXP_PATH[100][1]} r={9} fill={R.fillGreen} stroke={R.goal} strokeWidth={2.5} />
      <text x={EXP_PATH[100][0]} y={EXP_PATH[100][1] + 26} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>
        goal
      </text>

      {/* blue policy path */}
      <polyline points={bluePts} fill="none" stroke={R.signal} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={tip[0]} cy={tip[1]} r={7} fill={R.signal} />

      {/* DAgger correction arrows */}
      {dagger &&
        bluePath.map((p, i) => {
          if (i % 12 !== 0 || i === 0) return null;
          const idx = Math.min(Math.round((i / bluePath.length) * 100), 100);
          const [ex, ey] = EXP_PATH[idx];
          return <g key={i}>{svgArrow(p[0], p[1], ex, ey, R.error, 2, 7)}</g>;
        })}

      {/* readout lane (fixed, top-right) */}
      <text x={470} y={40} fontFamily={MONO} fontSize={13} fill={R.world}>
        step k / N
      </text>
      <text x={598} y={40} fontFamily={MONO} fontSize={13} fill={R.ink}>
        {Math.round(kNow)} / {horizon}
      </text>
      <text x={470} y={62} fontFamily={MONO} fontSize={13} fill={R.world}>
        accumulated err
      </text>
      <text x={598} y={62} fontFamily={MONO} fontSize={13} fill={R.error} fontWeight={600}>
        {accErr.toFixed(1)}
      </text>
      <text x={470} y={82} fontFamily={MONO} fontSize={12} fill={dagger ? R.goal : R.error}>
        grows like {dagger ? "T (linear)" : "T² (quadratic)"}
      </text>

      {reduced && (
        <text x={90} y={420} fontFamily={MONO} fontSize={12} fill={R.world}>
          Reduced motion: full trajectory shown; ε, T and DAgger still recompute the drift.
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 10.3 · Predict a chunk, not a single step  (slider-driven)
// One-step mode: many short amber arrows, re-predicted every step, jittery.
// Chunk mode: a long amber ribbon of the next H actions, ridden smoothly, with
// seams only at chunk boundaries. Readouts: predictions/task, reactivity.
// ===========================================================================

const TASK_PATH: [number, number][] = Array.from({ length: 101 }).map((_, i) => {
  const t = i / 100;
  const x = 80 + t * 520;
  const y = 250 + Math.sin(t * Math.PI * 1.6) * 70;
  return [x, y];
});

export function RbActionChunking() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [chunkH, setChunkH] = useState(20); // 1..120 (as % of path units)
  const [showSeams, setShowSeams] = useState(true);
  const [p, setP] = useState(0); // 0..1 progress along task

  useRafLoop(
    (dt) => {
      setP((v) => {
        const nx = v + dt * 0.22;
        return nx >= 1 ? 0 : nx;
      });
    },
    { playing: playing && inView && !reduced },
  );

  const prog = reduced ? 0.6 : p;
  const H = chunkH; // path units per chunk (out of 100)
  const predsPerTask = Math.max(1, Math.round(100 / H));
  const reactivity = clamp(1 - (H - 1) / 119, 0, 1);

  // seam positions along the path (every H units)
  const seams: number[] = [];
  for (let s = 0; s <= 100; s += H) seams.push(s);

  const at = (u: number): [number, number] => {
    const idx = clamp(Math.round(u), 0, 100);
    return TASK_PATH[idx];
  };
  const armU = prog * 100;
  const armPos = at(armU);

  // ribbon: the current chunk ahead of the arm
  const chunkStart = Math.floor(armU / H) * H;
  const ribbon: [number, number][] = [];
  for (let u = chunkStart; u <= Math.min(chunkStart + H, 100); u += 2) ribbon.push(at(u));
  const ribbonPts = ribbon.map(([x, y]) => `${x},${y}`).join(" ");
  const taskPts = TASK_PATH.map(([x, y]) => `${x},${y}`).join(" ");

  return (
    <Stage
      innerRef={ref}
      title="Fig 10.3 · Predict a chunk, not a single step"
      ariaLabel={`An arm riding a predicted action chunk of length ${H}; ${predsPerTask} predictions per task`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Slider label="chunk H" min={1} max={120} step={1} value={chunkH} onChange={setChunkH} fmt={(v) => `${v}`} />
          <Btn onClick={() => setShowSeams((v) => !v)} active={showSeams}>
            {showSeams ? "✓ show seams" : "show seams"}
          </Btn>
          <Btn onClick={() => setP(0)}>↺ reset</Btn>
        </>
      }
    >
      {/* horizon / task path (grey) */}
      <polyline points={taskPts} fill="none" stroke={R.line} strokeWidth={2} strokeDasharray="3 6" opacity={0.7} />
      <text x={80} y={40} fontFamily={MONO} fontSize={13} fill={R.world}>
        task horizon (grey) · predicted chunk (amber)
      </text>

      {/* predicted chunk ribbon */}
      <polyline points={ribbonPts} fill="none" stroke={R.plan} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />

      {/* seams: where a fresh prediction happens */}
      {showSeams &&
        seams.map((s, i) => {
          const [sx, sy] = at(s);
          return <circle key={i} cx={sx} cy={sy} r={4.5} fill={R.error} />;
        })}

      {/* the arm riding the chunk */}
      <circle cx={armPos[0]} cy={armPos[1]} r={11} fill={R.fillBlue} stroke={R.signal} strokeWidth={3} />

      {/* readout lane (fixed, top-right) */}
      <text x={470} y={64} fontFamily={MONO} fontSize={13} fill={R.world}>
        predictions / task
      </text>
      <text x={640} y={64} fontFamily={MONO} fontSize={14} fill={R.error} fontWeight={600}>
        {predsPerTask}
      </text>
      <text x={470} y={94} fontFamily={MONO} fontSize={13} fill={R.world}>
        reactivity
      </text>
      <rect x={470} y={102} width={150} height={11} rx={5} fill="#e7e7e4" />
      <rect x={470} y={102} width={150 * reactivity} height={11} rx={5} fill={R.plan} />
      <text x={626} y={112} fontFamily={MONO} fontSize={12} fill={R.ink}>
        {Math.round(reactivity * 100)}%
      </text>
      <text x={470} y={140} fontFamily={MONO} fontSize={12} fill={R.world}>
        red dots = seams where a
      </text>
      <text x={470} y={158} fontFamily={MONO} fontSize={12} fill={R.world}>
        fresh error can enter
      </text>

      <text x={80} y={412} fontFamily={MONO} fontSize={12} fill={R.world}>
        {H > 60
          ? "long chunks: few seams, very stable, but slow to react"
          : H < 8
            ? "short chunks: many seams, reactive, but drift compounds"
            : "chunk length trades stability against reactivity"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 10.4 · A regressor averages the modes; diffusion samples one
// Tab A "Regressor": one amber path straight into the obstacle (the mean of the
// two valid modes). Tab B "Diffusion Policy": resample draws a fresh clean path
// committing to left OR right; a denoising-steps slider resolves noise->path.
// ===========================================================================

type DpTab = "reg" | "dp";

export function RbDiffusionPolicy() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [tab, setTab] = useState<DpTab>("reg");
  const [steps, setSteps] = useState(12); // denoising steps 1..30
  const [seed, setSeed] = useState(7);
  const [k, setK] = useState(0); // current denoise step index eased

  useRafLoop(
    (dt) => setK((v) => approach(v, steps, 0.14, dt)),
    { playing: inView && !reduced && tab === "dp" },
  );

  const start = { x: 120, y: 250 };
  const goal = { x: 600, y: 250 };
  const obs = { x: 360, y: 250 };

  // two valid modes: arch up (left) or arch down (right)
  const modePath = (sign: number): [number, number][] =>
    Array.from({ length: 41 }).map((_, i) => {
      const t = i / 40;
      const x = lerp(start.x, goal.x, t);
      const y = 250 - sign * Math.sin(t * Math.PI) * 120;
      return [x, y];
    });
  const modeUp = modePath(1);
  const modeDown = modePath(-1);
  const toPts = (p: [number, number][]) => p.map(([x, y]) => `${x},${y}`).join(" ");

  // regressor = mean of the two modes = straight through obstacle
  const meanPath: [number, number][] = modeUp.map(([x, y], i) => [x, (y + modeDown[i][1]) / 2]);

  // diffusion: pick a mode by seed, resolve from noise as k -> steps
  const rng = mulberry32(seed);
  const chooseUp = rng() > 0.5;
  const chosen = chooseUp ? modeUp : modeDown;
  const kNow = reduced ? steps : Math.min(k, steps);
  const resolve = clamp(kNow / steps, 0, 1); // 0 noisy -> 1 clean
  const noisy: [number, number][] = chosen.map(([x, y], i) => {
    const n = (mulberry32(seed * 31 + i)() - 0.5) * (1 - resolve) * 150;
    return [x, y + n];
  });

  return (
    <Stage
      innerRef={ref}
      title="Fig 10.4 · A regressor averages the modes; diffusion samples one"
      ariaLabel={`${tab === "reg" ? "A regressor predicting the mean path straight into the obstacle" : "Diffusion policy sampling one clean mode around the obstacle"}`}
      controls={
        <>
          <Tabs
            options={[
              { id: "reg", label: "Regressor (squared error)" },
              { id: "dp", label: "Diffusion Policy" },
            ]}
            value={tab}
            onChange={setTab}
          />
          {tab === "dp" && (
            <>
              <Btn
                onClick={() => {
                  setSeed((s) => s + 1);
                  setK(0);
                }}
              >
                ⟳ resample
              </Btn>
              <Slider label="denoising steps" min={1} max={30} step={1} value={steps} onChange={setSteps} fmt={(v) => `${v}`} />
            </>
          )}
        </>
      }
    >
      {/* the two valid modes, faint (the data) */}
      <polyline points={toPts(modeUp)} fill="none" stroke={R.goal} strokeWidth={2.5} strokeDasharray="5 6" opacity={0.6} />
      <polyline points={toPts(modeDown)} fill="none" stroke={R.goal} strokeWidth={2.5} strokeDasharray="5 6" opacity={0.6} />
      <text x={90} y={40} fontFamily={MONO} fontSize={13} fill={R.goal}>
        two valid modes (data): go left OR go right
      </text>

      {/* obstacle */}
      <circle cx={obs.x} cy={obs.y} r={30} fill="#e6e6e3" stroke={R.world} strokeWidth={2.5} />
      <text x={obs.x} y={obs.y + 5} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        obstacle
      </text>

      {/* start + goal */}
      <circle cx={start.x} cy={start.y} r={10} fill={R.fillBlue} stroke={R.signal} strokeWidth={3} />
      <text x={start.x} y={start.y + 30} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.signal}>
        start
      </text>
      <circle cx={goal.x} cy={goal.y} r={10} fill={R.fillGreen} stroke={R.goal} strokeWidth={3} />
      <text x={goal.x} y={goal.y + 30} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>
        goal
      </text>

      {tab === "reg" ? (
        <>
          {/* the averaged (failing) path straight through */}
          <polyline points={toPts(meanPath)} fill="none" stroke={R.plan} strokeWidth={4.5} strokeLinecap="round" />
          <circle cx={obs.x} cy={obs.y} r={34} fill="none" stroke={R.error} strokeWidth={3} />
          <text x={obs.x} y={obs.y - 46} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.error} fontWeight={600}>
            collision — the mean of left & right
          </text>
        </>
      ) : (
        <>
          {/* the denoised sample */}
          <polyline points={toPts(noisy)} fill="none" stroke={R.plan} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
          <text x={470} y={90} fontFamily={MONO} fontSize={13} fill={R.world}>
            denoise step k / N
          </text>
          <text x={620} y={90} fontFamily={MONO} fontSize={14} fill={R.ink} fontWeight={600}>
            {Math.round(kNow)} / {steps}
          </text>
          <text x={470} y={116} fontFamily={MONO} fontSize={13} fill={R.goal} fontWeight={600}>
            committed: {chooseUp ? "LEFT" : "RIGHT"}
          </text>
        </>
      )}

      <text x={90} y={412} fontFamily={MONO} fontSize={12} fill={R.world}>
        {tab === "reg"
          ? "squared-error regression predicts the average — the one path that fails"
          : "diffusion denoises to a single clean mode — resample to flip lanes"}
      </text>

      {reduced && tab === "dp" && (
        <text x={90} y={430} fontFamily={MONO} fontSize={12} fill={R.world}>
          Reduced motion: the clean sampled mode is shown; resample still flips the lane.
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 10.5 · ALOHA leader-follower teleoperation  (draggable field)
// Drag a small leader arm (amber, left); the larger follower arm (blue, right)
// mirrors its joint angles in real time and does a bimanual task. A record
// toggle streams the follower's (o, a) into episode cards.
// ===========================================================================

export function RbAloha() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [tgt, setTgt] = useState({ a1: 55, a2: -40 }); // leader joint targets (deg)
  const [disp, setDisp] = useState({ a1: 55, a2: -40 }); // eased follower angles
  const [drag, setDrag] = useState(false);
  const [recording, setRecording] = useState(false);
  const [episodes, setEpisodes] = useState(0);
  const [acc, setAcc] = useState(0);

  useRafLoop(
    (dt) => {
      setDisp((s) => ({
        a1: approach(s.a1, tgt.a1, 0.2, dt),
        a2: approach(s.a2, tgt.a2, 0.2, dt),
      }));
      if (recording) {
        setAcc((a) => {
          const na = a + dt;
          if (na >= 1) {
            setEpisodes((e) => Math.min(e + 1, 8));
            return na - 1;
          }
          return na;
        });
      }
    },
    { playing: inView && !reduced },
  );

  const cur = reduced ? tgt : disp;

  // leader arm (left, amber)
  const leadBase = { x: 150, y: 300 };
  const rad = (d: number) => (d * Math.PI) / 180;
  const armGeom = (base: { x: number; y: number }, a1: number, a2: number, L1: number, L2: number) => {
    const ex = base.x + L1 * Math.cos(rad(-a1));
    const ey = base.y + L1 * Math.sin(rad(-a1));
    const tx = ex + L2 * Math.cos(rad(-a1 - a2));
    const ty = ey + L2 * Math.sin(rad(-a1 - a2));
    return { ex, ey, tx, ty };
  };
  const lead = armGeom(leadBase, cur.a1, cur.a2, 62, 50);
  // follower arm (right, blue) mirrors the SAME joint angles, larger links
  const folBase = { x: 470, y: 300 };
  const fol = armGeom(folBase, cur.a1, cur.a2, 92, 74);
  const grasped = cur.a1 > 40 && cur.a1 < 90;

  const onMove = (e: ReactPointerEvent<SVGElement>) => {
    if (!drag) return;
    const [x, y] = svgPoint(e);
    const dx = x - leadBase.x;
    const dy = -(y - leadBase.y);
    const a1 = clamp((Math.atan2(dy, dx) * 180) / Math.PI, 10, 120);
    const a2 = clamp(-40 + (Math.hypot(dx, dy) - 90) * 0.6, -80, 10);
    setTgt({ a1, a2 });
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 10.5 · ALOHA leader-follower teleoperation"
      ariaLabel={`A small leader arm dragged by the operator; a larger follower arm mirrors its joint angles and does a bimanual task, recording in the follower's action space`}
      svgProps={{
        onPointerMove: onMove,
        onPointerUp: () => setDrag(false),
        onPointerLeave: () => setDrag(false),
      }}
      controls={
        <>
          <Btn onClick={() => setRecording((v) => !v)} active={recording}>
            {recording ? "● recording" : "record"}
          </Btn>
          <Btn
            onClick={() => {
              setTgt({ a1: 55, a2: -40 });
              setEpisodes(0);
              setRecording(false);
              setAcc(0);
            }}
          >
            ↺ reset
          </Btn>
          <span className="font-mono text-[13px] text-[var(--muted)]">drag the leader arm</span>
        </>
      }
    >
      <text x={150} y={40} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.plan}>
        {`leader (operator's command)`}
      </text>
      <text x={470} y={40} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.signal}>
        follower (recorded body)
      </text>
      <line x1={320} y1={50} x2={320} y2={360} stroke={R.line} strokeWidth={1.2} strokeDasharray="4 6" />

      {/* mirror link */}
      {svgArrow(210, 150, 400, 150, R.world, 2, 8)}
      <text x={305} y={140} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        joint angles stream across
      </text>

      {/* leader arm */}
      <line x1={leadBase.x} y1={leadBase.y} x2={lead.ex} y2={lead.ey} stroke={R.plan} strokeWidth={8} strokeLinecap="round" />
      <line x1={lead.ex} y1={lead.ey} x2={lead.tx} y2={lead.ty} stroke={R.plan} strokeWidth={8} strokeLinecap="round" />
      <circle cx={leadBase.x} cy={leadBase.y} r={7} fill={R.ink} />
      <circle
        cx={lead.tx}
        cy={lead.ty}
        r={11}
        fill={R.fillAmber}
        stroke={R.plan}
        strokeWidth={2.5}
        style={{ cursor: "grab" }}
        onPointerDown={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
      />

      {/* follower arm + bimanual object */}
      <rect x={folBase.x + 120} y={200} width={26} height={60} rx={5} fill={grasped ? R.fillGreen : "#eeeeec"} stroke={grasped ? R.goal : R.world} strokeWidth={2.5} />
      <line x1={folBase.x} y1={folBase.y} x2={fol.ex} y2={fol.ey} stroke={R.signal} strokeWidth={10} strokeLinecap="round" />
      <line x1={fol.ex} y1={fol.ey} x2={fol.tx} y2={fol.ty} stroke={R.signal} strokeWidth={10} strokeLinecap="round" />
      <circle cx={folBase.x} cy={folBase.y} r={8} fill={R.ink} />
      <circle cx={fol.tx} cy={fol.ty} r={7} fill={R.signal} />

      {/* recording strip (fixed lane, bottom) */}
      <text x={30} y={382} fontFamily={MONO} fontSize={12} fill={R.world}>
        {`episodes (follower's action space):`}
      </text>
      {Array.from({ length: 8 }).map((_, i) => (
        <rect
          key={i}
          x={280 + i * 50}
          y={372}
          width={44}
          height={16}
          rx={3}
          fill={i < episodes ? R.fillBlue : "none"}
          stroke={i < episodes ? R.signal : R.line}
          strokeWidth={1.5}
        />
      ))}
      {recording && (
        <rect x={280 + episodes * 50} y={372} width={44 * acc} height={16} rx={3} fill={R.fillBlue} opacity={0.5} />
      )}

      {reduced && (
        <text x={30} y={420} fontFamily={MONO} fontSize={12} fill={R.world}>
          Reduced motion: follower shown mirroring the leader; record still accumulates episodes.
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 10.6 · UMI: collect demonstrations in the wild  (toggle-compare)
// Tab A "Collect": a handheld gripper + GoPro doing a task in a kitchen, no
// robot. Tab B "Deploy": a robot with a matching gripper + wrist cam. A "match
// interface" toggle overlays and aligns the two interfaces; a throughput meter
// compares UMI vs ALOHA.
// ===========================================================================

type UmiTab = "collect" | "deploy";

export function RbUmi() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [tab, setTab] = useState<UmiTab>("collect");
  const [match, setMatch] = useState(false);
  const [align, setAlign] = useState(0); // eased 0..1 alignment

  useRafLoop(
    (dt) => setAlign((a) => approach(a, match ? 1 : 0, 0.18, dt)),
    { playing: inView && !reduced },
  );
  const al = reduced ? (match ? 1 : 0) : align;

  return (
    <Stage
      innerRef={ref}
      title="Fig 10.6 · UMI: collect demonstrations in the wild, no robot"
      ariaLabel={`${tab === "collect" ? "A handheld gripper with a GoPro collecting a demonstration in a kitchen" : "A robot with a matching gripper replaying the task"}; interfaces ${match ? "aligned" : "not aligned"}`}
      controls={
        <>
          <Tabs
            options={[
              { id: "collect", label: "Collect (handheld)" },
              { id: "deploy", label: "Deploy (robot)" },
            ]}
            value={tab}
            onChange={setTab}
          />
          <Btn onClick={() => setMatch((v) => !v)} active={match}>
            {match ? "✓ match interface" : "match interface"}
          </Btn>
        </>
      }
    >
      {/* scene */}
      <line x1={40} y1={300} x2={430} y2={300} stroke={R.line} strokeWidth={2} />
      <text x={235} y={40} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>
        {tab === "collect" ? "a kitchen — no robot present" : "a robot arm in the lab"}
      </text>

      {/* the object on the counter */}
      <rect x={300} y={262} width={30} height={38} rx={4} fill={R.fillGreen} stroke={R.goal} strokeWidth={2.5} />

      {tab === "collect" ? (
        <>
          {/* human hand + handheld gripper + GoPro */}
          <ellipse cx={150} cy={210} rx={26} ry={16} fill="#eeeeec" stroke={R.world} strokeWidth={2} />
          <text x={150} y={186} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
            hand
          </text>
          {/* jaws (amber = action) */}
          <line x1={176} y1={200} x2={230} y2={230} stroke={R.plan} strokeWidth={6} strokeLinecap="round" />
          <line x1={230} y1={222} x2={258} y2={252} stroke={R.plan} strokeWidth={5} strokeLinecap="round" />
          <line x1={230} y1={238} x2={258} y2={268} stroke={R.plan} strokeWidth={5} strokeLinecap="round" />
          {/* GoPro (blue = observation) */}
          <rect x={196} y={198} width={22} height={16} rx={3} fill={R.fillBlue} stroke={R.signal} strokeWidth={2} />
          <text x={207} y={188} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.signal}>
            GoPro
          </text>
        </>
      ) : (
        <>
          {/* robot arm with matching gripper + wrist cam */}
          <rect x={70} y={300} width={40} height={20} rx={4} fill="#eeeeec" stroke={R.world} strokeWidth={2} />
          <line x1={90} y1={300} x2={170} y2={230} stroke={R.signal} strokeWidth={9} strokeLinecap="round" />
          <line x1={170} y1={230} x2={230} y2={235} stroke={R.signal} strokeWidth={9} strokeLinecap="round" />
          <line x1={230} y1={228} x2={258} y2={252} stroke={R.plan} strokeWidth={5} strokeLinecap="round" />
          <line x1={230} y1={242} x2={258} y2={268} stroke={R.plan} strokeWidth={5} strokeLinecap="round" />
          <rect x={206} y={214} width={22} height={16} rx={3} fill={R.fillBlue} stroke={R.signal} strokeWidth={2} />
          <text x={217} y={204} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.signal}>
            wrist cam
          </text>
        </>
      )}

      {/* interface-alignment panel (fixed right lane) */}
      <line x1={460} y1={60} x2={460} y2={360} stroke={R.line} strokeWidth={1.2} strokeDasharray="4 6" />
      <text x={490} y={80} fontFamily={MONO} fontSize={13} fill={R.world}>
        observation + action
      </text>
      <text x={490} y={98} fontFamily={MONO} fontSize={13} fill={R.world}>
        interface
      </text>
      {/* two interface glyphs sliding into alignment */}
      <g transform={`translate(0 ${lerp(-14, 0, al)})`}>
        <rect x={500} y={130} width={70} height={44} rx={6} fill={R.fillAmber} stroke={R.plan} strokeWidth={2} />
        <text x={535} y={156} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.plan}>
          handheld
        </text>
      </g>
      <g transform={`translate(0 ${lerp(14, 0, al)})`}>
        <rect x={500 + lerp(80, 0, al)} y={130} width={70} height={44} rx={6} fill={R.fillBlue} stroke={R.signal} strokeWidth={2} />
        <text x={535 + lerp(80, 0, al)} y={156} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.signal}>
          robot
        </text>
      </g>
      {al > 0.85 && (
        <text x={535} y={200} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal} fontWeight={600}>
          aligned ✓ data transfers
        </text>
      )}

      {/* throughput meter (fixed) */}
      <text x={490} y={244} fontFamily={MONO} fontSize={13} fill={R.world}>
        throughput
      </text>
      <text x={490} y={266} fontFamily={MONO} fontSize={12} fill={R.plan}>
        UMI
      </text>
      <rect x={528} y={256} width={150} height={11} rx={5} fill="#e7e7e4" />
      <rect x={528} y={256} width={150} height={11} rx={5} fill={R.plan} />
      <text x={490} y={290} fontFamily={MONO} fontSize={12} fill={R.signal}>
        ALOHA
      </text>
      <rect x={528} y={280} width={150} height={11} rx={5} fill="#e7e7e4" />
      <rect x={528} y={280} width={40} height={11} rx={5} fill={R.signal} />

      <text x={30} y={412} fontFamily={MONO} fontSize={12} fill={R.world}>
        {tab === "collect"
          ? "collect anywhere with a handheld gripper + GoPro — no robot in the loop"
          : "deploy on a robot whose gripper + camera match the handheld interface"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 10.7 · The same action means different things on different bodies
// Drag an action value; two robots (A blue, B amber) with different link
// lengths land their hands in DIFFERENT spots under a raw joint command (red
// mismatch). Toggle to normalized/relative action or a common gripper
// interface and the hands snap into correspondence (green).
// ===========================================================================

export function RbEmbodimentGap() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [action, setAction] = useState(45); // 0..90 (joint deg or +cm)
  const [norm, setNorm] = useState(false); // normalized/relative action
  const [common, setCommon] = useState(false); // common gripper interface
  const [disp, setDisp] = useState(45);

  useRafLoop(
    (dt) => setDisp((v) => approach(v, action, 0.22, dt)),
    { playing: inView && !reduced },
  );
  const a = reduced ? action : disp;

  const rad = (d: number) => (d * Math.PI) / 180;
  // robot A (blue) — long link; robot B (amber) — short link
  const baseA = { x: 175, y: 320 };
  const baseB = { x: 175, y: 150 };
  const La = 150;
  const Lb = 95;

  // aligned (normalized or common) => both express the SAME relative target;
  // raw => same joint angle but different link lengths => different reach.
  const aligned = norm || common;
  const tA = {
    x: baseA.x + La * Math.cos(rad(-a)),
    y: baseA.y + La * Math.sin(rad(-a)),
  };
  const tB = aligned
    ? { x: baseB.x + La * Math.cos(rad(-a)), y: baseB.y + La * Math.sin(rad(-a)) }
    : { x: baseB.x + Lb * Math.cos(rad(-a)), y: baseB.y + Lb * Math.sin(rad(-a)) };
  // measure of correspondence: compare relative offset from each base
  const offA = Math.hypot(tA.x - baseA.x, tA.y - baseA.y);
  const offB = Math.hypot(tB.x - baseB.x, tB.y - baseB.y);
  const mismatch = Math.abs(offA - offB);
  const pools = aligned;

  return (
    <Stage
      innerRef={ref}
      title="Fig 10.7 · The same action means different things on different bodies"
      ariaLabel={`One action applied to two robots with different link lengths; ${pools ? "normalized so their hands correspond and data pools" : "raw so their hands land in different places and data will not pool"}`}
      controls={
        <>
          <Slider label="action" min={0} max={90} step={1} value={action} onChange={setAction} fmt={(v) => `${v}`} />
          <Btn onClick={() => setNorm((v) => !v)} active={norm}>
            {norm ? "✓ normalized action" : "raw joint action"}
          </Btn>
          <Btn onClick={() => setCommon((v) => !v)} active={common}>
            {common ? "✓ common gripper" : "common gripper"}
          </Btn>
          <Btn
            onClick={() => {
              setAction(45);
              setNorm(false);
              setCommon(false);
            }}
          >
            ↺ reset
          </Btn>
        </>
      }
    >
      <text x={30} y={34} fontFamily={MONO} fontSize={13} fill={R.world}>
        one action → two bodies:
      </text>
      <text x={230} y={34} fontFamily={MONO} fontSize={13} fill={pools ? R.goal : R.error} fontWeight={600}>
        {pools ? "hands correspond — data pools ✓" : "hands differ — data won't pool"}
      </text>

      {/* robot A (blue) */}
      <text x={baseA.x - 40} y={baseA.y + 6} fontFamily={MONO} fontSize={13} fill={R.signal} fontWeight={600}>
        A
      </text>
      <line x1={baseA.x} y1={baseA.y} x2={tA.x} y2={tA.y} stroke={R.signal} strokeWidth={9} strokeLinecap="round" />
      <circle cx={baseA.x} cy={baseA.y} r={7} fill={R.ink} />
      <circle cx={tA.x} cy={tA.y} r={10} fill={R.fillBlue} stroke={R.signal} strokeWidth={2.5} />

      {/* robot B (amber) */}
      <text x={baseB.x - 40} y={baseB.y + 6} fontFamily={MONO} fontSize={13} fill={R.plan} fontWeight={600}>
        B
      </text>
      <line x1={baseB.x} y1={baseB.y} x2={tB.x} y2={tB.y} stroke={R.plan} strokeWidth={9} strokeLinecap="round" />
      <circle cx={baseB.x} cy={baseB.y} r={7} fill={R.ink} />
      <circle cx={tB.x} cy={tB.y} r={10} fill={R.fillAmber} stroke={R.plan} strokeWidth={2.5} />

      {/* mismatch / correspondence indicator */}
      {pools ? (
        <>
          <line x1={tA.x} y1={tA.y} x2={tB.x} y2={tB.y} stroke={R.goal} strokeWidth={2} strokeDasharray="4 4" />
          <text x={(tA.x + tB.x) / 2 + 14} y={(tA.y + tB.y) / 2} fontFamily={MONO} fontSize={12} fill={R.goal}>
            same relative move
          </text>
        </>
      ) : (
        <>
          <line x1={tA.x} y1={tA.y} x2={tB.x} y2={tB.y} stroke={R.error} strokeWidth={2} strokeDasharray="4 4" />
          <text x={(tA.x + tB.x) / 2 + 14} y={(tA.y + tB.y) / 2} fontFamily={MONO} fontSize={12} fill={R.error}>
            mismatch
          </text>
        </>
      )}

      {/* readout lane (fixed, right) */}
      <text x={470} y={340} fontFamily={MONO} fontSize={13} fill={R.world}>
        reach A
      </text>
      <text x={560} y={340} fontFamily={MONO} fontSize={13} fill={R.signal}>
        {Math.round(offA)}
      </text>
      <text x={470} y={362} fontFamily={MONO} fontSize={13} fill={R.world}>
        reach B
      </text>
      <text x={560} y={362} fontFamily={MONO} fontSize={13} fill={R.plan}>
        {Math.round(offB)}
      </text>
      <text x={470} y={384} fontFamily={MONO} fontSize={13} fill={R.world}>
        gap
      </text>
      <text x={560} y={384} fontFamily={MONO} fontSize={13} fill={pools ? R.goal : R.error} fontWeight={600}>
        {Math.round(mismatch)}
      </text>

      {reduced && (
        <text x={30} y={420} fontFamily={MONO} fontSize={12} fill={R.world}>
          Reduced motion: shown at the action value; the toggles still align or split the two hands.
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 10.8 · A demonstration is synchronized multimodal streams on one timeline
// A scrubber timeline with stacked lanes — scene cam, wrist cam, joint traces,
// gripper, action — sharing one axis. A playhead cuts every lane. Step advances
// k/N at a fixed rate; "chunk" boxes the next H actions; "desync" nudges the
// camera lane and flags a red mispairing.
// ===========================================================================

const LANES = [
  { id: "scene", label: "scene cam", color: R.signal },
  { id: "wrist", label: "wrist cam", color: R.signal },
  { id: "joints", label: "joint angles", color: R.signal },
  { id: "gripper", label: "gripper", color: R.signal },
  { id: "action", label: "action", color: R.plan },
] as const;

const N_TICKS = 30;

export function RbSyncTimeline() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [chunk, setChunk] = useState(false);
  const [desync, setDesync] = useState(false);
  const [k, setK] = useState(6); // playhead tick 0..N_TICKS
  const [, setAcc] = useState(0); // sub-tick pacing accumulator

  useRafLoop(
    (dt) => {
      setAcc((a) => {
        const na = a + dt * 4;
        if (na >= 1) {
          setK((v) => (v + 1) % N_TICKS);
          return na - 1;
        }
        return na;
      });
    },
    { playing: playing && inView && !reduced },
  );

  const X0 = 150;
  const X1 = 690;
  const laneH = 44;
  const Y0 = 70;
  const step = (X1 - X0) / N_TICKS;
  const playX = X0 + k * step;
  const chunkH = 5;

  const laneY = (i: number) => Y0 + i * laneH;
  const rng = mulberry32(99);
  // precompute a jittery trace per joints lane
  const jointTrace = Array.from({ length: N_TICKS + 1 }).map(() => rng());

  return (
    <Stage
      innerRef={ref}
      title="Fig 10.8 · A demonstration is synchronized streams on one timeline"
      ariaLabel={`A scrubber timeline with scene camera, wrist camera, joint, gripper and action lanes sharing one clock; playhead at tick ${k} of ${N_TICKS}; ${desync ? "camera desynced" : "aligned"}`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Btn onClick={() => setK((v) => (v + 1) % N_TICKS)}>⏭ step</Btn>
          <Btn onClick={() => setChunk((v) => !v)} active={chunk}>
            {chunk ? "✓ chunk" : "chunk"}
          </Btn>
          <Btn onClick={() => setDesync((v) => !v)} active={desync}>
            {desync ? "✓ desync" : "desync"}
          </Btn>
          <Btn onClick={() => { setK(6); setAcc(0); }}>↺ reset</Btn>
        </>
      }
    >
      {/* step readout (fixed) */}
      <text x={30} y={40} fontFamily={MONO} fontSize={13} fill={R.world}>
        frame k / N @ 30 Hz
      </text>
      <text x={210} y={40} fontFamily={MONO} fontSize={13} fill={R.ink} fontWeight={600}>
        {k} / {N_TICKS}
      </text>

      {/* lanes */}
      {LANES.map((ln, i) => {
        const y = laneY(i);
        const isCam = ln.id === "scene" || ln.id === "wrist";
        const laneShift = isCam && desync ? step * 1.6 : 0;
        return (
          <g key={ln.id}>
            <text x={30} y={y + laneH / 2 + 4} fontFamily={MONO} fontSize={12} fill={ln.color}>
              {ln.label}
            </text>
            <rect x={X0} y={y + 4} width={X1 - X0} height={laneH - 10} rx={4} fill="#f2f2ef" stroke={R.line} strokeWidth={1} />
            {ln.id === "joints" ? (
              <polyline
                points={jointTrace
                  .map((v, t) => `${X0 + t * step},${y + 8 + (1 - v) * (laneH - 18)}`)
                  .join(" ")}
                fill="none"
                stroke={R.signal}
                strokeWidth={2}
              />
            ) : ln.id === "action" ? (
              Array.from({ length: N_TICKS }).map((_, t) => (
                <rect
                  key={t}
                  x={X0 + t * step + 1}
                  y={y + 9}
                  width={step - 2}
                  height={laneH - 20}
                  rx={2}
                  fill={chunk && t >= k && t < k + chunkH ? R.plan : R.fillAmber}
                  opacity={chunk && t >= k && t < k + chunkH ? 0.9 : 0.5}
                />
              ))
            ) : (
              Array.from({ length: N_TICKS }).map((_, t) => (
                <rect
                  key={t}
                  x={X0 + t * step + 1 + laneShift}
                  y={y + 9}
                  width={step - 2}
                  height={laneH - 20}
                  rx={2}
                  fill={R.fillBlue}
                  opacity={(t + i) % 3 === 0 ? 0.85 : 0.4}
                />
              ))
            )}
          </g>
        );
      })}

      {/* playhead across every lane */}
      <line x1={playX} y1={Y0 - 4} x2={playX} y2={Y0 + LANES.length * laneH} stroke={desync ? R.error : R.goal} strokeWidth={2.5} />
      <circle cx={playX} cy={Y0 - 8} r={5} fill={desync ? R.error : R.goal} />

      {/* (o,a) pair readout at the playhead (fixed bottom) */}
      <rect x={150} y={318} width={540} height={72} rx={6} fill="none" stroke={R.line} strokeWidth={1.5} />
      <text x={162} y={338} fontFamily={MONO} fontSize={12} fill={R.world}>
        at the playhead:
      </text>
      <rect x={162} y={346} width={60} height={36} rx={4} fill={R.fillBlue} stroke={R.signal} strokeWidth={1.5} />
      <text x={192} y={368} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.signal}>
        obs
      </text>
      {svgArrow(228, 364, 268, 364, desync ? R.error : R.goal, 2, 7)}
      <rect x={276} y={346} width={60} height={36} rx={4} fill={R.fillAmber} stroke={R.plan} strokeWidth={1.5} />
      <text x={306} y={368} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.plan}>
        action
      </text>
      {desync ? (
        <text x={356} y={368} fontFamily={MONO} fontSize={13} fill={R.error} fontWeight={600}>
          ⚠ mispaired — camera drifted out of sync
        </text>
      ) : (
        <text x={356} y={368} fontFamily={MONO} fontSize={13} fill={R.goal} fontWeight={600}>
          aligned (observation, action) pair ✓
        </text>
      )}

      {reduced && (
        <text x={30} y={420} fontFamily={MONO} fontSize={12} fill={R.world}>
          Reduced motion: playhead shown static; step, chunk and desync still work.
        </text>
      )}
    </Stage>
  );
}
