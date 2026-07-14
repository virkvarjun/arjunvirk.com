"use client";

import { useMemo, useState } from "react";
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
  approach,
  clamp,
  lerp,
  mulberry32,
  type V3,
  type Prim3D,
  type Camera3D,
  quat,
  seg3,
  label3,
  box3,
  Scene3D,
  useOrbit,
  Legend,
  Readout,
  Transport,
} from "./shared";

// Deterministic standard normal from a seeded uniform stream (Box–Muller).
function gauss(rng: () => number) {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Blend two #rrggbb hex colors.
function lerpHex(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const p = pa.map((v, i) => Math.round(lerp(v, pb[i], clamp(t, 0, 1))));
  return `#${p.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// ===========================================================================
// Fig 7.1 · When the model runs out  (toggle-compare)
// Three task cards; each fills a "how well do we know the dynamics?" gauge and
// lights the recommended approach (classical vs RL). "Show why" reveals the
// one-line reason.
// ===========================================================================

type TaskId = "arm" | "quad" | "hand";
const TASKS: {
  id: TaskId;
  label: string;
  known: number; // 0..1, how well we know the dynamics
  rec: "classical" | "RL";
  why: string;
}[] = [
  {
    id: "arm",
    label: "arm pick-and-place",
    known: 0.92,
    rec: "classical",
    why: "clean rigid-body dynamics: the model is trustworthy",
  },
  {
    id: "quad",
    label: "quadruped on rubble",
    known: 0.22,
    rec: "RL",
    why: "unpredictable contact: a foot can slip or roll any step",
  },
  {
    id: "hand",
    label: "in-hand reorientation",
    known: 0.1,
    rec: "RL",
    why: "discontinuous multi-contact: fingers make and break contact",
  },
];

export function RbWhenRL() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [task, setTask] = useState<TaskId>("arm");
  const [showWhy, setShowWhy] = useState(false);
  const [gauge, setGauge] = useState(TASKS[0].known);
  const [pulse, setPulse] = useState(0);

  const t = TASKS.find((x) => x.id === task)!;

  useRafLoop(
    (dt) => {
      setGauge((g) => approach(g, t.known, 0.18, dt));
      setPulse((p) => (p > 0 ? Math.max(0, p - dt * 1.4) : 0));
    },
    { playing: inView && !reduced },
  );

  const g = reduced ? t.known : gauge;
  const pulseAmt = reduced ? 0 : pulse;

  // gauge geometry (semicircle, left=RL/red, right=classical/green)
  const gx = 215;
  const gy = 260;
  const gr = 120;
  const ang = Math.PI - g * Math.PI; // g=1 -> 0 rad (right), g=0 -> PI (left)
  const nx = gx + gr * Math.cos(ang);
  const ny = gy - gr * Math.sin(ang);
  const recCol = t.rec === "classical" ? R.goal : R.error;

  const boxes: { key: "classical" | "RL"; label: string; col: string }[] = [
    { key: "classical", label: "classical control", col: R.goal },
    { key: "RL", label: "reinforcement learning", col: R.error },
  ];

  return (
    <Stage
      innerRef={ref}
      title="Fig 7.1 · When the model runs out"
      ariaLabel={`Task ${t.label}: model known ${Math.round(t.known * 100)} percent, recommended ${t.rec}`}
      controls={
        <>
          <Tabs
            options={TASKS.map((x) => ({ id: x.id, label: x.label }))}
            value={task}
            onChange={(id) => {
              setTask(id);
              setPulse(1);
            }}
          />
          <Btn onClick={() => setShowWhy((v) => !v)} active={showWhy}>
            {showWhy ? "✓ show why" : "show why"}
          </Btn>
        </>
      }
    >
      <Readout
        rows={[
          { label: "task", value: t.label, color: R.ink },
          { label: "model known", value: `${Math.round(g * 100)}%`, color: recCol },
          { label: "recommend", value: t.rec, color: recCol },
        ]}
      />
      <Legend
        items={[
          { color: R.goal, label: "classical control" },
          { color: R.error, label: "reinforcement learning" },
        ]}
      />

      {/* gauge track: red (unknown) -> green (known) arc */}
      <path
        d={`M ${gx - gr} ${gy} A ${gr} ${gr} 0 0 1 ${gx} ${gy - gr}`}
        fill="none"
        stroke={R.error}
        strokeWidth={14}
        strokeLinecap="round"
        opacity={0.55}
      />
      <path
        d={`M ${gx} ${gy - gr} A ${gr} ${gr} 0 0 1 ${gx + gr} ${gy}`}
        fill="none"
        stroke={R.goal}
        strokeWidth={14}
        strokeLinecap="round"
        opacity={0.55}
      />
      <text x={gx - gr} y={gy + 26} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.error}>
        unknown
      </text>
      <text x={gx + gr} y={gy + 26} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>
        well-known
      </text>

      {/* needle */}
      <line x1={gx} y1={gy} x2={nx} y2={ny} stroke={R.ink} strokeWidth={4} strokeLinecap="round" />
      <circle cx={gx} cy={gy} r={9} fill={R.ink} />
      <text x={gx} y={gy + 56} textAnchor="middle" fontFamily={MONO} fontSize={17} fontWeight={600} fill={recCol}>
        {Math.round(g * 100)}% known
      </text>
      <text x={gx} y={gy + 84} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>
        how well do we know the dynamics?
      </text>

      {/* divider */}
      <line x1={410} y1={40} x2={410} y2={395} stroke={R.line} strokeWidth={1.5} strokeDasharray="4 6" />

      {/* recommendation boxes */}
      <text x={565} y={108} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={R.world}>
        recommendation
      </text>
      {boxes.map((b, i) => {
        const active = b.key === t.rec;
        const by = 126 + i * 78;
        return (
          <g key={b.key}>
            <rect
              x={470}
              y={by}
              width={190}
              height={54}
              rx={9}
              fill={active ? (b.key === "classical" ? R.fillGreen : R.fillRed) : "#eeeeec"}
              stroke={active ? b.col : R.line}
              strokeWidth={active ? 3 + pulseAmt * 3 : 2}
              opacity={active ? 1 : 0.5}
            />
            <text
              x={565}
              y={by + 32}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={14}
              fontWeight={active ? 600 : 400}
              fill={active ? b.col : R.world}
            >
              {b.label}
            </text>
          </g>
        );
      })}

      {/* why lane (fixed, right) */}
      {showWhy && (
        <foreignObject x={468} y={300} width={230} height={90}>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 12.5,
              lineHeight: 1.4,
              color: R.ink,
            }}
          >
            {t.why}
          </div>
        </foreignObject>
      )}

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        the worse the model, the stronger the case for learning from consequences
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 7.2 · The agent–environment loop  (animated pipeline)
// A token circulates AGENT -(action)-> ENVIRONMENT -(state, reward)-> AGENT.
// The return G is the real geometric sum Σ γᵗ·1 up to the current step, so
// the γ slider honestly re-prices every reward collected so far.
// ===========================================================================

const A2 = { x: 185, y: 150, w: 150, h: 84 };
const E2 = { x: 385, y: 150, w: 170, h: 84 };
const MAX_T2 = 8;

export function RbAgentEnvLoop() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(0.8);
  const [gamma, setGamma] = useState(0.9);
  // phase 0..2 around the loop (0..1 agent->env, 1..2 env->agent)
  const [st, setSt] = useState({ phase: 0, step: 0 });

  useRafLoop(
    (dt) => {
      setSt((s) => {
        let p = s.phase + dt * speed;
        let step = s.step;
        if (p >= 2) {
          p -= 2;
          step = step >= MAX_T2 ? 0 : step + 1;
        }
        return { phase: p, step };
      });
    },
    { playing: playing && inView && !reduced },
  );

  const step = reduced ? 3 : st.step;
  const phase = reduced ? 0.5 : st.phase;
  // Return so far: reward +1 per completed loop, each discounted by γᵗ.
  // Computed as the closed-form geometric sum, so it is exact for any γ.
  const G = gamma < 1 ? (1 - Math.pow(gamma, step)) / (1 - gamma) : step;

  // token position along the current arc
  const agentEdge = { x: A2.x + A2.w / 2, y: A2.y };
  const envEdge = { x: E2.x - E2.w / 2, y: E2.y };
  const outbound = phase < 1;
  const f = outbound ? phase : phase - 1;
  const tokenX = outbound ? lerp(agentEdge.x, envEdge.x, f) : lerp(E2.x, A2.x, f);
  const tokenY = outbound ? A2.y - 12 : A2.y + 130; // return path dips below
  const tokenCol = outbound ? R.plan : R.signal;

  // future-reward token strip (fades with gamma)
  const futures = Array.from({ length: 7 }).map((_, i) => Math.pow(gamma, i + 1));

  return (
    <Stage
      innerRef={ref}
      title="Fig 7.2 · The agent–environment loop"
      ariaLabel={`Agent and environment loop; discount gamma ${gamma.toFixed(2)}; step ${step}; return G ${G.toFixed(2)}`}
      controls={
        <>
          <Transport
            playing={playing}
            onPlay={() => setPlaying((p) => !p)}
            onStep={() => setSt((s) => ({ phase: 0, step: s.step >= MAX_T2 ? 0 : s.step + 1 }))}
            onReset={() => {
              setSt({ phase: 0, step: 0 });
              setPlaying(false);
            }}
          />
          <Slider label="speed" min={0.25} max={2} step={0.05} value={speed} onChange={setSpeed} fmt={(v) => `${v.toFixed(2)}×`} />
          <Slider label="discount γ" min={0.1} max={0.99} step={0.01} value={gamma} onChange={setGamma} fmt={(v) => v.toFixed(2)} />
        </>
      }
    >
      <Readout
        rows={[
          { label: "step t", value: String(step), color: R.ink },
          { label: "next γᵗ", value: Math.pow(gamma, step).toFixed(2), color: R.world },
          { label: "return G", value: G.toFixed(2), color: R.goal },
        ]}
      />
      <Legend
        items={[
          { color: R.plan, label: "action a" },
          { color: R.signal, label: "next state s′" },
          { color: R.goal, label: "reward r = +1" },
        ]}
      />

      {/* agent box */}
      <rect x={A2.x - A2.w / 2} y={A2.y - A2.h / 2} width={A2.w} height={A2.h} rx={12} fill={R.fillBlue} stroke={R.signal} strokeWidth={2.5} />
      <text x={A2.x} y={A2.y - 6} textAnchor="middle" fontFamily={MONO} fontSize={17} fontWeight={600} fill={R.ink}>
        AGENT
      </text>
      <text x={A2.x} y={A2.y + 16} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        policy π
      </text>

      {/* environment box */}
      <rect x={E2.x - E2.w / 2} y={E2.y - E2.h / 2} width={E2.w} height={E2.h} rx={12} fill="#eeeeec" stroke={R.world} strokeWidth={2.5} />
      <text x={E2.x} y={E2.y - 6} textAnchor="middle" fontFamily={MONO} fontSize={17} fontWeight={600} fill={R.ink}>
        ENVIRONMENT
      </text>
      <text x={E2.x} y={E2.y + 16} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        hidden dynamics P
      </text>

      {/* outbound arrow (action) */}
      {svgArrow(agentEdge.x + 4, A2.y - 12, envEdge.x - 4, A2.y - 12, R.plan, 3, 10)}
      <text x={(agentEdge.x + envEdge.x) / 2} y={A2.y - 22} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.plan}>
        action a
      </text>

      {/* return arrow (state s', reward r), dips below */}
      <path
        d={`M ${E2.x} ${E2.y + E2.h / 2} C ${E2.x} ${A2.y + 130} ${A2.x} ${A2.y + 130} ${A2.x} ${A2.y + A2.h / 2}`}
        fill="none"
        stroke={R.signal}
        strokeWidth={3}
      />
      {svgArrow(A2.x + 30, A2.y + 118, A2.x, A2.y + A2.h / 2 + 4, R.signal, 3, 10)}
      <text x={(A2.x + E2.x) / 2} y={A2.y + 152} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.signal}>
        next state s′
      </text>
      <text x={(A2.x + E2.x) / 2} y={A2.y + 170} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.goal}>
        reward r
      </text>

      {/* travelling token */}
      {!reduced && (
        <>
          <circle cx={tokenX} cy={tokenY} r={12} fill={tokenCol} opacity={0.25} />
          <circle cx={tokenX} cy={tokenY} r={7} fill={tokenCol} />
        </>
      )}

      {/* future-reward fade strip (fixed lane, bottom) */}
      <text x={40} y={362} fontFamily={MONO} fontSize={13} fill={R.world}>
        future rewards, discounted by γᵗ:
      </text>
      {futures.map((v, i) => (
        <g key={i}>
          <rect
            x={40 + i * 92}
            y={372}
            width={72}
            height={26}
            rx={5}
            fill={R.fillGreen}
            stroke={R.goal}
            strokeWidth={1.5}
            opacity={clamp(v, 0.05, 1)}
          />
          <text
            x={76 + i * 92}
            y={390}
            textAnchor="middle"
            fontFamily={MONO}
            fontSize={12}
            fill={R.ink}
            opacity={clamp(v + 0.15, 0.25, 1)}
          >
            {v.toFixed(2)}
          </text>
        </g>
      ))}

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        one number per step is all the feedback there is — γ sets how far ahead it counts
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 7.3 · Value iteration coloring a gridworld  (stepper)
// A gridworld with a green goal (+10) and walls; each Bellman sweep applies
// the real recursion V(s) <- r + γ·max V(s') to every cell, so value visibly
// ripples outward from the goal. The readout tracks the true Bellman residual
// (max |ΔV| per sweep) and a toggle draws the greedy policy argmax arrows.
// ===========================================================================

const G3_COLS = 7;
const G3_ROWS = 5;
const GOAL_CELL = { c: 6, r: 0 };
const WALLS = new Set(["2,1", "2,2", "2,3", "4,2", "4,3", "4,4"]);
const REWARD_GOAL = 10;
const MAX_SWEEP = 12;
const NBRS3: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function cellKey(c: number, r: number) {
  return `${c},${r}`;
}

// Run real value iteration: V(s) <- r + γ·max over reachable neighbours of
// V(s'), goal pinned at +10, reward 0 elsewhere. Returns the value grid after
// every sweep plus the max |ΔV| of each sweep (the Bellman residual).
function computeValues(gamma: number) {
  const grids: number[][][] = [];
  const deltas: number[] = [0];
  let V: number[][] = Array.from({ length: G3_ROWS }, () =>
    Array.from({ length: G3_COLS }, () => 0),
  );
  V[GOAL_CELL.r][GOAL_CELL.c] = REWARD_GOAL;
  grids.push(V.map((row) => row.slice()));
  for (let k = 0; k < MAX_SWEEP; k++) {
    const next = V.map((row) => row.slice());
    let dmax = 0;
    for (let r = 0; r < G3_ROWS; r++) {
      for (let c = 0; c < G3_COLS; c++) {
        if (WALLS.has(cellKey(c, r))) continue;
        if (c === GOAL_CELL.c && r === GOAL_CELL.r) continue;
        let best = 0;
        for (const [dc, dr] of NBRS3) {
          const nc = c + dc;
          const nr = r + dr;
          if (nc < 0 || nc >= G3_COLS || nr < 0 || nr >= G3_ROWS) continue;
          if (WALLS.has(cellKey(nc, nr))) continue;
          best = Math.max(best, gamma * V[nr][nc]);
        }
        next[r][c] = best; // reward 0 on non-goal cells
        dmax = Math.max(dmax, Math.abs(best - V[r][c]));
      }
    }
    V = next;
    grids.push(V.map((row) => row.slice()));
    deltas.push(dmax);
  }
  return { grids, deltas };
}

// Greedy argmax direction out of a cell under the current value grid.
function greedyDir(grid: number[][], c: number, r: number): [number, number] | null {
  let best = 0.05; // require some propagated value before claiming a policy
  let dir: [number, number] | null = null;
  for (const [dc, dr] of NBRS3) {
    const nc = c + dc;
    const nr = r + dr;
    if (nc < 0 || nc >= G3_COLS || nr < 0 || nr >= G3_ROWS) continue;
    if (WALLS.has(cellKey(nc, nr))) continue;
    if (grid[nr][nc] > best) {
      best = grid[nr][nc];
      dir = [dc, dr];
    }
  }
  return dir;
}

export function RbValueIteration() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [gamma, setGamma] = useState(0.9);
  const [st, setSt] = useState({ k: 0, acc: 0 });
  const [playing, setPlaying] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const k = st.k;

  const { grids, deltas } = useMemo(() => computeValues(gamma), [gamma]);

  useRafLoop(
    (dt) => {
      setSt((s) => {
        const na = s.acc + dt;
        if (na > 0.7) return { k: Math.min(MAX_SWEEP, s.k + 1), acc: 0 };
        return { k: s.k, acc: na };
      });
    },
    { playing: playing && inView && !reduced && k < MAX_SWEEP },
  );

  const grid = grids[k];
  const converged = k > 0 && deltas[k] < 0.05;

  // layout
  const ox = 180;
  const oy = 88;
  const cw = 70;
  const ch = 58;

  const valColor = (v: number) => {
    const t = clamp(v / REWARD_GOAL, 0, 1);
    if (t < 0.02) return "#eeeeec";
    // grey -> amber -> green as value rises
    if (t < 0.5) return lerpHex("#e7e5e0", R.fillAmber, t / 0.5);
    return lerpHex(R.fillAmber, R.fillGreen, (t - 0.5) / 0.5);
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 7.3 · Value iteration coloring a gridworld"
      ariaLabel={`Value iteration sweep ${k} of ${MAX_SWEEP}, gamma ${gamma.toFixed(2)}, Bellman residual ${k === 0 ? "not started" : deltas[k].toFixed(2)}`}
      controls={
        <>
          <Transport
            playing={playing}
            onPlay={() => setPlaying((p) => !p)}
            onStep={() => setSt((s) => ({ k: Math.min(MAX_SWEEP, s.k + 1), acc: 0 }))}
            onReset={() => {
              setSt({ k: 0, acc: 0 });
              setPlaying(false);
            }}
            stepLabel="sweep"
          />
          <Slider label="γ" min={0.5} max={0.99} step={0.01} value={gamma} onChange={setGamma} fmt={(v) => v.toFixed(2)} />
          <Btn onClick={() => setShowPolicy((v) => !v)} active={showPolicy}>
            {showPolicy ? "✓ greedy policy" : "greedy policy"}
          </Btn>
        </>
      }
    >
      <Readout
        rows={[
          { label: "sweep k", value: `${k} / ${MAX_SWEEP}`, color: R.ink },
          {
            label: "max |ΔV|",
            value: k === 0 ? "—" : deltas[k].toFixed(2),
            color: converged ? R.goal : R.plan,
          },
          { label: "γ", value: gamma.toFixed(2), color: R.world },
        ]}
      />
      <Legend
        items={[
          { color: R.goal, label: "goal, reward +10" },
          { color: R.world, label: "wall" },
          { color: R.signal, label: "greedy move" },
        ]}
      />

      {grid.map((row, r) =>
        row.map((v, c) => {
          const x = ox + c * cw;
          const y = oy + r * ch;
          const isGoal = c === GOAL_CELL.c && r === GOAL_CELL.r;
          const isWall = WALLS.has(cellKey(c, r));
          const dir = !isWall && !isGoal && showPolicy ? greedyDir(grid, c, r) : null;
          return (
            <g key={cellKey(c, r)}>
              <rect
                x={x}
                y={y}
                width={cw - 4}
                height={ch - 4}
                rx={6}
                fill={isWall ? "#dededa" : isGoal ? R.fillGreen : valColor(v)}
                stroke={isWall ? R.world : isGoal ? R.goal : R.line}
                strokeWidth={isGoal ? 3 : isWall ? 2.5 : 1.5}
              />
              {isWall ? (
                <text x={x + (cw - 4) / 2} y={y + (ch - 4) / 2 + 5} textAnchor="middle" fontFamily={MONO} fontSize={12.5} fill={R.world}>
                  wall
                </text>
              ) : (
                <text
                  x={x + (cw - 4) / 2}
                  y={y + (ch - 4) / 2 + 5}
                  textAnchor="middle"
                  fontFamily={MONO}
                  fontSize={13.5}
                  fontWeight={isGoal ? 600 : 400}
                  fill={R.ink}
                >
                  {isGoal ? "+10" : v.toFixed(1)}
                </text>
              )}
              {dir && svgArrow(x + 52 - dir[0] * 6, y + 14 - dir[1] * 6, x + 52 + dir[0] * 6, y + 14 + dir[1] * 6, R.signal, 2, 6)}
            </g>
          );
        }),
      )}

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={converged ? R.goal : R.world}>
        {converged
          ? "converged: every cell's value is +10 discounted by γ^(steps to goal), computed by the sweeps"
          : "V(s) ← r + γ·max V(s′) — one real Bellman sweep per step; value ripples out of the goal"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 7.4 · Reinforcing good trajectories, suppressing bad  (real REINFORCE)
// A tiny honest MDP: heading θ ~ N(μ, σ) from a fixed start, five steps with
// seeded wind noise inside a walled arena, return G = 10 − dist(end, goal)/25.
// "Apply update" performs the actual REINFORCE step on the Gaussian mean,
// Δμ = α·mean[ (θ−μ)/σ² · G ], then draws a fresh on-policy batch. The
// readout reports the measured std of Δμ over 48 seeded batches, so the
// variance problem is a number, not an assertion.
// ===========================================================================

const START4 = { x: 130, y: 290 };
const GOAL4 = { x: 470, y: 130 };
const N_EP4 = 8;
const STEPS4 = 5;
const STEP_LEN4 = 66;
const SIGMA4 = 0.38; // policy std dev, rad
const LR4 = 0.01; // learning rate on μ
const MU0 = -0.05; // initial policy mean (pointing right, not at the goal)
const ARENA4 = { x0: 60, y0: 100, x1: 690, y1: 395 };

type Ep4 = { pts: [number, number][]; theta: number; G: number };

// One seeded batch of episodes from the current policy mean.
function runBatch4(mu: number, seed: number, wind: number): Ep4[] {
  const rng = mulberry32((seed * 2654435761) >>> 0);
  const eps: Ep4[] = [];
  for (let i = 0; i < N_EP4; i++) {
    const theta = mu + SIGMA4 * gauss(rng);
    let x = START4.x;
    let y = START4.y;
    const pts: [number, number][] = [[x, y]];
    for (let t = 0; t < STEPS4; t++) {
      const a = theta + wind * gauss(rng); // per-step wind: the world's luck
      x = clamp(x + STEP_LEN4 * Math.cos(a), ARENA4.x0 + 6, ARENA4.x1 - 6);
      y = clamp(y + STEP_LEN4 * Math.sin(a), ARENA4.y0 + 6, ARENA4.y1 - 6);
      pts.push([x, y]);
    }
    const d = Math.hypot(x - GOAL4.x, y - GOAL4.y);
    eps.push({ pts, theta, G: 10 - d / 25 });
  }
  return eps;
}

// The REINFORCE gradient on the Gaussian mean: mean over the batch of
// ∇μ log π(θ) · G = ((θ − μ)/σ²) · G.
function gradMu4(eps: Ep4[], mu: number): number {
  let s = 0;
  for (const e of eps) s += ((e.theta - mu) / (SIGMA4 * SIGMA4)) * e.G;
  return s / eps.length;
}

export function RbPolicyGradient() {
  const { ref } = useStageVisibility();
  const [seed, setSeed] = useState(1);
  const [mu, setMu] = useState(MU0);
  const [wind, setWind] = useState(0.22);

  const eps = useMemo(() => runBatch4(mu, seed, wind), [mu, seed, wind]);
  const dMu = LR4 * gradMu4(eps, mu);

  // Measured variance of the update: rerun the same policy on 48 fresh seeds
  // and take the std of Δμ. This is REINFORCE's flaw as a measurement.
  const stdDMu = useMemo(() => {
    const gs: number[] = [];
    for (let k = 0; k < 48; k++) gs.push(LR4 * gradMu4(runBatch4(mu, 1000 + k, wind), mu));
    const m = gs.reduce((s, v) => s + v, 0) / gs.length;
    return Math.sqrt(gs.reduce((s, v) => s + (v - m) * (v - m), 0) / gs.length);
  }, [mu, wind]);

  const maxRet = Math.max(...eps.map((e) => e.G));
  const minRet = Math.min(...eps.map((e) => e.G));
  const meanRet = eps.reduce((s, e) => s + e.G, 0) / eps.length;
  const retColor = (g: number) => lerpHex(R.error, R.goal, clamp((g - minRet) / (maxRet - minRet + 1e-6), 0, 1));

  const deg = (rad: number) => (rad * 180) / Math.PI;
  const noisy = stdDMu > Math.abs(dMu);
  const L = 118;

  return (
    <Stage
      innerRef={ref}
      title="Fig 7.4 · Reinforcing good trajectories, suppressing bad"
      ariaLabel={`Eight sampled rollouts from a Gaussian policy, mean heading ${Math.round(deg(mu))} degrees; REINFORCE update ${deg(dMu).toFixed(1)} degrees with measured std ${deg(stdDMu).toFixed(1)} degrees over 48 batches`}
      controls={
        <>
          <Btn onClick={() => setSeed((s) => s + 1)} title="re-roll trajectories from the current policy">
            🎲 sample new rollouts
          </Btn>
          <Btn
            onClick={() => {
              setMu((m) => clamp(m + LR4 * gradMu4(eps, m), -1.0, 0.45));
              setSeed((s) => s + 1); // on-policy: fresh data from the new policy
            }}
            title="take the real REINFORCE step on μ, then resample"
          >
            ↗ apply update
          </Btn>
          <Btn
            onClick={() => {
              setSeed(1);
              setMu(MU0);
              setWind(0.22);
            }}
          >
            ↺ reset
          </Btn>
          <Slider label="wind noise" min={0} max={0.5} step={0.01} value={wind} onChange={setWind} fmt={(v) => v.toFixed(2)} />
        </>
      }
    >
      <Readout
        rows={[
          { label: "policy μ", value: `${deg(mu).toFixed(0)}°`, color: R.plan },
          { label: "mean G", value: meanRet.toFixed(1), color: R.ink },
          { label: "Δμ this batch", value: `${deg(dMu) >= 0 ? "+" : ""}${deg(dMu).toFixed(1)}°`, color: R.ink },
          { label: "std Δμ (48×)", value: `±${deg(stdDMu).toFixed(1)}°`, color: noisy ? R.error : R.goal },
        ]}
      />
      <Legend
        items={[
          { color: R.goal, label: "high return" },
          { color: R.error, label: "low return" },
          { color: R.plan, label: "policy mean μ" },
        ]}
      />

      {/* arena walls (the clamp in the dynamics, drawn honestly) */}
      <rect
        x={ARENA4.x0}
        y={ARENA4.y0}
        width={ARENA4.x1 - ARENA4.x0}
        height={ARENA4.y1 - ARENA4.y0}
        rx={10}
        fill="none"
        stroke={R.line}
        strokeWidth={1.5}
        strokeDasharray="6 6"
      />

      {/* goal region */}
      <circle cx={GOAL4.x} cy={GOAL4.y} r={28} fill={R.fillGreen} stroke={R.goal} strokeWidth={2.5} />
      <text x={GOAL4.x} y={GOAL4.y + 5} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.goal}>
        goal
      </text>

      {/* the sampled episodes, drawn from their real simulated points */}
      {eps.map((e, i) => (
        <g key={i}>
          <polyline
            points={e.pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}
            fill="none"
            stroke={retColor(e.G)}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.85}
          />
          <circle cx={e.pts[STEPS4][0]} cy={e.pts[STEPS4][1]} r={4.5} fill={retColor(e.G)} />
        </g>
      ))}

      {/* policy preferred-direction arrow (amber), at the real mean heading */}
      {svgArrow(START4.x, START4.y, START4.x + L * Math.cos(mu), START4.y + L * Math.sin(mu), R.plan, 5, 13)}
      <text
        x={START4.x + (L + 14) * Math.cos(mu)}
        y={START4.y + (L + 14) * Math.sin(mu) - 8}
        fontFamily={MONO}
        fontSize={13}
        fill={R.plan}
        fontWeight={600}
      >
        policy π
      </text>

      {/* start hub */}
      <circle cx={START4.x} cy={START4.y} r={8} fill={R.ink} />
      <text x={START4.x} y={START4.y + 26} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        start
      </text>

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={noisy ? R.error : R.world}>
        {noisy
          ? "measured: the update's noise exceeds the update itself — REINFORCE hears a whisper in a hurricane"
          : "Δμ = α·mean[(θ−μ)/σ²·G] bends the policy toward whatever the returns favored"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 7.5 · Advantage: how much better than average?  (measured variance)
// LEFT: Q(s,a) bars for five actions against a baseline line V(s); advantage
// is the signed gap. RIGHT: 60 seeded sampled visits to states of varying
// value; each dot is the policy-gradient weight for the chosen action, once
// as the raw return G and once as the advantage G − V(s). The variance shrink
// is measured from those samples, not asserted.
// ===========================================================================

const Q5 = [3, 6, 5, 8, 4]; // Q(s,a) for the five candidate actions
const CHOSEN5 = 3;
const N_SAMP5 = 60;

export function RbAdvantage() {
  const { ref } = useStageVisibility();
  const [baseline, setBaseline] = useState(5); // V(s)
  const [chosenQ, setChosenQ] = useState(8); // Q of the highlighted action
  const [seed, setSeed] = useState(1);

  const qVals = Q5.map((v, i) => (i === CHOSEN5 ? chosenQ : v));
  const aTrue = chosenQ - baseline;

  // Sample 60 visits: each lands in a state whose value swings by "luck"
  // (some states are just better places to be). The raw weight is the whole
  // return; the advantage subtracts the critic's V(s) for that visit.
  const sim = useMemo(() => {
    const rng = mulberry32((seed * 1013904223 + 5) >>> 0);
    const raw: { v: number; jx: number }[] = [];
    const adv: { v: number; jx: number }[] = [];
    for (let k = 0; k < N_SAMP5; k++) {
      const luck = 3 * gauss(rng); // state-to-state value swing
      const noise = 0.7 * gauss(rng); // leftover in-episode noise
      const jx = (rng() - 0.5) * 52;
      const g = baseline + luck + aTrue + noise;
      raw.push({ v: g, jx });
      adv.push({ v: g - (baseline + luck), jx });
    }
    const sd = (xs: number[]) => {
      const m = xs.reduce((s, v) => s + v, 0) / xs.length;
      return Math.sqrt(xs.reduce((s, v) => s + (v - m) * (v - m), 0) / xs.length);
    };
    return { raw, adv, sdRaw: sd(raw.map((d) => d.v)), sdAdv: sd(adv.map((d) => d.v)) };
  }, [seed, baseline, aTrue]);

  const shrink = sim.sdRaw / Math.max(sim.sdAdv, 1e-6);

  // LEFT panel: value axis 0..12
  const bx0 = 70;
  const barW = 44;
  const barGap = 12;
  const ayTop = 110;
  const ayBot = 370;
  const yOf = (v: number) => ayBot - (clamp(v, 0, 12) / 12) * (ayBot - ayTop);

  // RIGHT panel: weight axis, shared by both columns
  const colRawX = 470;
  const colAdvX = 610;
  const yOfW = (v: number) => clamp(250 - v * 8, 96, 378);

  const colDots = (dots: { v: number; jx: number }[], cx: number, col: string) =>
    dots.map((d, i) => <circle key={i} cx={cx + d.jx} cy={yOfW(d.v)} r={2.5} fill={col} opacity={0.5} />);
  const meanOf = (dots: { v: number }[]) => dots.reduce((s, d) => s + d.v, 0) / dots.length;
  const bracket = (cx: number, mean: number, sd: number, col: string) => (
    <g stroke={col} strokeWidth={2.5}>
      <line x1={cx - 36} y1={yOfW(mean)} x2={cx + 36} y2={yOfW(mean)} />
      <line x1={cx + 42} y1={yOfW(mean - sd)} x2={cx + 42} y2={yOfW(mean + sd)} />
      <line x1={cx + 37} y1={yOfW(mean - sd)} x2={cx + 47} y2={yOfW(mean - sd)} />
      <line x1={cx + 37} y1={yOfW(mean + sd)} x2={cx + 47} y2={yOfW(mean + sd)} />
    </g>
  );

  return (
    <Stage
      innerRef={ref}
      title="Fig 7.5 · Advantage: how much better than average?"
      ariaLabel={`Baseline V(s) ${baseline.toFixed(1)}; chosen action Q ${chosenQ.toFixed(1)}; advantage ${aTrue.toFixed(1)}; measured std of the raw-return weight ${sim.sdRaw.toFixed(1)} versus ${sim.sdAdv.toFixed(1)} with the baseline`}
      controls={
        <>
          <Slider label="baseline V(s)" min={0} max={11} step={0.5} value={baseline} onChange={setBaseline} fmt={(v) => v.toFixed(1)} />
          <Slider label="chosen Q" min={0} max={11} step={0.5} value={chosenQ} onChange={setChosenQ} fmt={(v) => v.toFixed(1)} />
          <Btn onClick={() => setSeed((s) => s + 1)} title="draw 60 fresh sampled visits">
            🎲 resample
          </Btn>
        </>
      }
    >
      <Readout
        rows={[
          { label: "A(s,a4)", value: `${aTrue >= 0 ? "+" : ""}${aTrue.toFixed(1)}`, color: R.plan },
          { label: "std raw G", value: `±${sim.sdRaw.toFixed(1)}`, color: R.error },
          { label: "std A", value: `±${sim.sdAdv.toFixed(1)}`, color: R.goal },
          { label: "shrink", value: `×${shrink.toFixed(1)}`, color: R.goal },
        ]}
      />
      <Legend
        items={[
          { color: R.plan, label: "chosen action a4" },
          { color: R.error, label: "weight = raw G" },
          { color: R.goal, label: "weight = G − V(s)" },
        ]}
      />

      {/* ---- LEFT: Q bars vs the baseline ---- */}
      <line x1={bx0 - 12} y1={ayBot} x2={355} y2={ayBot} stroke={R.line} strokeWidth={1.5} />
      <line x1={bx0 - 12} y1={yOf(baseline)} x2={350} y2={yOf(baseline)} stroke={R.world} strokeWidth={2.5} strokeDasharray="7 5" />
      <text x={354} y={yOf(baseline) + 4} fontFamily={MONO} fontSize={12.5} fill={R.world}>
        V(s)
      </text>
      {qVals.map((q, i) => {
        const x = bx0 + i * (barW + barGap);
        const isChosen = i === CHOSEN5;
        const advI = q - baseline;
        const top = Math.min(yOf(q), yOf(baseline));
        const bot = Math.max(yOf(q), yOf(baseline));
        const col = isChosen ? R.plan : advI >= 0 ? R.goal : R.error;
        const fill = isChosen ? R.fillAmber : advI >= 0 ? R.fillGreen : R.fillRed;
        return (
          <g key={i}>
            <rect x={x} y={top} width={barW} height={Math.max(2, bot - top)} rx={4} fill={fill} stroke={col} strokeWidth={isChosen ? 3 : 2} />
            <text x={x + barW / 2} y={ayBot + 18} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={isChosen ? R.plan : R.world}>
              a{i + 1}
            </text>
            <text
              x={x + barW / 2}
              y={advI >= 0 ? yOf(q) - 6 : yOf(q) + 15}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={12}
              fontWeight={isChosen ? 600 : 400}
              fill={advI >= 0 ? R.goal : R.error}
            >
              {advI >= 0 ? "+" : ""}
              {advI.toFixed(1)}
            </text>
          </g>
        );
      })}
      <text x={bx0 - 12} y={ayTop - 10} fontFamily={MONO} fontSize={12.5} fill={R.world}>
        A = Q(s,a) − V(s)
      </text>

      {/* divider */}
      <line x1={395} y1={70} x2={395} y2={400} stroke={R.line} strokeWidth={1.5} strokeDasharray="4 6" />

      {/* ---- RIGHT: measured update weights over 60 sampled visits ---- */}
      <text x={540} y={84} textAnchor="middle" fontFamily={MONO} fontSize={12.5} fill={R.world}>
        update weight for a4, {N_SAMP5} sampled visits
      </text>
      {colDots(sim.raw, colRawX, R.error)}
      {colDots(sim.adv, colAdvX, R.goal)}
      {bracket(colRawX, meanOf(sim.raw), sim.sdRaw, R.error)}
      {bracket(colAdvX, meanOf(sim.adv), sim.sdAdv, R.goal)}
      <text x={colRawX} y={398} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.error}>
        raw G
      </text>
      <text x={colAdvX} y={398} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>
        G − V(s)
      </text>

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        same visits, two weights: subtracting V(s) cancels the state luck — measured std shrinks ×{shrink.toFixed(1)}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 7.6 · PPO clipping: the trust region  (slider-driven, rigorous 2D)
// The actual clipped surrogate L = min(r·A, clip(r, 1−ε, 1+ε)·A) plotted
// against the probability ratio for A = ±1, with the true piecewise gradient
// ∂L/∂r reported live — including PPO's asymmetry: for A>0 the objective goes
// flat above 1+ε, but for A<0 the raw term keeps the gradient alive there.
// ===========================================================================

export function RbPPOClip() {
  const { ref } = useStageVisibility();
  const [ratio, setRatio] = useState(1.0);
  const [eps, setEps] = useState(0.2);
  const [advPos, setAdvPos] = useState(true);

  const A = advPos ? 1 : -1;
  const rMin = 0.4;
  const rMax = 1.6;

  // plot region
  const px0 = 100;
  const px1 = 660;
  const py0 = 90; // top
  const py1 = 360; // bottom
  const objMax = 1.7;
  const xOf = (r: number) => px0 + ((r - rMin) / (rMax - rMin)) * (px1 - px0);
  const yOf = (o: number) => {
    const mid = (py0 + py1) / 2;
    return mid - (o / objMax) * (mid - py0);
  };

  const clipR = (r: number) => clamp(r, 1 - eps, 1 + eps);
  const ppoObj = (r: number) => Math.min(r * A, clipR(r) * A);
  // The true piecewise derivative of the min(): flat only on the side the
  // clip protects; on the other side the raw term still drives the ratio back.
  const ppoGrad = (r: number) => (A > 0 ? (r > 1 + eps ? 0 : A) : r < 1 - eps ? 0 : A);

  const pts = Array.from({ length: 61 }, (_, i) => {
    const r = rMin + ((rMax - rMin) * i) / 60;
    return `${xOf(r).toFixed(1)},${yOf(ppoObj(r)).toFixed(1)}`;
  });
  const rawPts = Array.from({ length: 61 }, (_, i) => {
    const r = rMin + ((rMax - rMin) * i) / 60;
    return `${xOf(r).toFixed(1)},${yOf(r * A).toFixed(1)}`;
  });

  const rShown = clamp(ratio, rMin, rMax);
  const markerX = xOf(rShown);
  const markerY = yOf(ppoObj(rShown));
  const grad = ppoGrad(rShown);
  const dead = grad === 0;
  const inBand = rShown >= 1 - eps && rShown <= 1 + eps;

  return (
    <Stage
      innerRef={ref}
      title="Fig 7.6 · PPO clipping: the trust region"
      ariaLabel={`PPO clipped objective versus probability ratio ${rShown.toFixed(2)}, epsilon ${eps.toFixed(2)}, advantage ${advPos ? "positive" : "negative"}; gradient ${dead ? "zero, clipped" : "live"}`}
      controls={
        <>
          <Slider label="ratio" min={rMin} max={rMax} step={0.01} value={ratio} onChange={setRatio} fmt={(v) => v.toFixed(2)} />
          <Slider label="ε" min={0.05} max={0.5} step={0.01} value={eps} onChange={setEps} fmt={(v) => v.toFixed(2)} />
          <Btn onClick={() => setAdvPos((v) => !v)} active={advPos}>
            advantage: {advPos ? "positive +" : "negative −"}
          </Btn>
        </>
      }
    >
      <Readout
        rows={[
          { label: "ratio", value: rShown.toFixed(2), color: R.signal },
          { label: "objective", value: ppoObj(rShown).toFixed(2), color: R.plan },
          { label: "∂obj/∂ratio", value: grad.toFixed(0), color: dead ? R.error : R.goal },
        ]}
      />
      <Legend
        items={[
          { color: R.world, label: "raw ratio·A", dash: true },
          { color: R.plan, label: "clipped objective" },
          { color: R.goal, label: "trust region" },
        ]}
      />
      <text x={360} y={44} textAnchor="middle" fontFamily={MONO} fontSize={12.5} fill={R.world}>
        L = min( ratio·A, clip(ratio, 1−ε, 1+ε)·A )
      </text>

      {/* axes with objective ticks */}
      <line x1={px0} y1={py0 - 10} x2={px0} y2={py1} stroke={R.line} strokeWidth={1.5} />
      <line x1={px0} y1={yOf(0)} x2={px1} y2={yOf(0)} stroke={R.line} strokeWidth={1.5} />
      {[-1, 0, 1].map((o) => (
        <g key={o}>
          <line x1={px0 - 5} y1={yOf(o)} x2={px0} y2={yOf(o)} stroke={R.line} strokeWidth={1.5} />
          <text x={px0 - 9} y={yOf(o) + 4} textAnchor="end" fontFamily={MONO} fontSize={11.5} fill={R.world}>
            {o}
          </text>
        </g>
      ))}
      <text x={px1} y={yOf(0) + 18} textAnchor="end" fontFamily={MONO} fontSize={13} fill={R.signal}>
        probability ratio →
      </text>

      {/* trust-region band (green = safe) */}
      <rect x={xOf(1 - eps)} y={py0 - 10} width={xOf(1 + eps) - xOf(1 - eps)} height={py1 - (py0 - 10)} fill={R.fillGreen} opacity={0.35} />
      <text x={xOf(1)} y={py1 + 20} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>
        trust region [1−ε, 1+ε]
      </text>

      {/* ratio = 1 tick */}
      <line x1={xOf(1)} y1={py0 - 10} x2={xOf(1)} y2={py1} stroke={R.line} strokeWidth={1} strokeDasharray="3 5" />
      <text x={xOf(1)} y={py1 + 38} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        ratio = 1
      </text>

      {/* raw objective (faint) then the clipped surrogate (amber) */}
      <polyline points={rawPts.join(" ")} fill="none" stroke={R.world} strokeWidth={1.5} strokeDasharray="5 5" opacity={0.7} />
      <polyline points={pts.join(" ")} fill="none" stroke={R.plan} strokeWidth={3.5} strokeLinejoin="round" />

      {/* marker riding the clipped curve */}
      <line x1={markerX} y1={py0 - 10} x2={markerX} y2={py1} stroke={R.signal} strokeWidth={1.5} opacity={0.6} />
      <circle cx={markerX} cy={markerY} r={7} fill={dead ? R.error : R.goal} stroke="var(--background)" strokeWidth={2} />

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={dead ? R.error : R.world}>
        {dead
          ? "flat: the min() took the clipped term — pushing further buys nothing, the gradient is exactly 0"
          : inBand
            ? "inside the trust region: the objective is live, slope = A"
            : "outside the band, but the min() keeps the raw term: the gradient stays on to pull the ratio back"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 7.7 · Domain randomization  (true 3D, orbitable)
// Nine parallel simulated worlds on a 3×3 pad: every episode re-rolls each
// world's friction (grip ticks), link mass (body size), and terrain roughness
// (ridge bumps) from a band of width w around nominal. The centre world is
// reality with fixed parameters; it reads green only when all three of its
// values fall inside the sampled band. A policy trace walks every world, its
// sideways slip growing as friction drops.
// ===========================================================================

const REALITY7 = { f: 0.72, m: 0.35, rough: 0.28 };
const TILE7 = 1.15;
const GAP7 = 1.5;

type World7 = {
  cx: number;
  cy: number;
  f: number;
  m: number;
  rough: number;
  phase: number;
  trace: V3[];
  real: boolean;
};

function terrainH7(t: number, rough: number, phase: number) {
  return rough * (0.15 * (0.5 + 0.5 * Math.sin(t * 6.2 + phase)) + 0.07 * (0.5 + 0.5 * Math.sin(t * 12.4 + 2 * phase)));
}

// Build nine worlds: eight sampled from the randomization band, the centre
// one pinned to reality's fixed physics. Same rng draws regardless of width,
// so widening the band never reshuffles the layout.
function buildWorlds7(seed: number, width: number): World7[] {
  const rng = mulberry32((seed * 40503 + 11) >>> 0);
  const worlds: World7[] = [];
  for (let gy = 1; gy >= -1; gy--) {
    for (let gx = -1; gx <= 1; gx++) {
      const real = gx === 0 && gy === 0;
      const draw = () => clamp(0.5 + (rng() - 0.5) * width, 0.03, 0.97);
      const f0 = draw();
      const m0 = draw();
      const r0 = draw();
      const f = real ? REALITY7.f : f0;
      const m = real ? REALITY7.m : m0;
      const rough = real ? REALITY7.rough : r0;
      const cx = gx * GAP7;
      const cy = gy * GAP7;
      const trng = mulberry32((seed * 7919 + (gx + 2) * 37 + (gy + 2) * 149) >>> 0);
      const phase = trng() * Math.PI * 2;
      const trace: V3[] = [];
      let wob = 0;
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        wob = wob * 0.82 + (trng() - 0.5) * (1 - f) * 0.28; // low grip => slip
        trace.push([cx - TILE7 / 2 + t * TILE7, cy + clamp(wob, -0.42, 0.42), 0.04 + terrainH7(t, rough, phase)]);
      }
      worlds.push({ cx, cy, f, m, rough, phase, trace, real });
    }
  }
  return worlds;
}

export function RbDomainRandomization() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const orbit = useOrbit(-26, 24);
  const [seed, setSeed] = useState(1);
  const [width, setWidth] = useState(0.7);
  const [playing, setPlaying] = useState(true);
  const [walk, setWalk] = useState(0.4);

  useRafLoop((dt) => setWalk((w) => (w + dt * 0.22) % 1), {
    playing: playing && inView && !reduced,
  });
  const wv = reduced ? 1 : walk;

  const worlds = useMemo(() => buildWorlds7(seed, width), [seed, width]);
  const lo = 0.5 - width / 2;
  const hi = 0.5 + width / 2;
  const inBand = (v: number) => v >= lo && v <= hi;
  const covered = inBand(REALITY7.f) && inBand(REALITY7.m) && inBand(REALITY7.rough);

  const cam: Camera3D = { yawDeg: orbit.yawDeg, pitchDeg: orbit.pitchDeg, dist: 7.5, zoom: 88, fov: 6 };

  const prims: Prim3D[] = worlds.flatMap((w) => {
    const h = TILE7 / 2;
    const edge = w.real ? (covered ? R.goal : R.error) : R.line;
    const out: Prim3D[] = [
      seg3([w.cx - h, w.cy - h, 0], [w.cx + h, w.cy - h, 0], edge, { width: w.real ? 2.5 : 1.2 }),
      seg3([w.cx + h, w.cy - h, 0], [w.cx + h, w.cy + h, 0], edge, { width: w.real ? 2.5 : 1.2 }),
      seg3([w.cx + h, w.cy + h, 0], [w.cx - h, w.cy + h, 0], edge, { width: w.real ? 2.5 : 1.2 }),
      seg3([w.cx - h, w.cy + h, 0], [w.cx - h, w.cy - h, 0], edge, { width: w.real ? 2.5 : 1.2 }),
    ];
    // friction as grip ticks: more ticks = more grip
    const nTicks = 1 + Math.round(w.f * 5);
    for (let i = 0; i < nTicks; i++) {
      const x = w.cx - h + ((i + 0.5) / nTicks) * TILE7;
      out.push(seg3([x, w.cy + h * 0.62, 0], [x, w.cy + h * 0.92, 0], R.world, { width: 1.5, opacity: 0.8 }));
    }
    // terrain ridge along the back edge: bump height = roughness
    for (let i = 0; i < 14; i++) {
      const t0 = i / 14;
      const t1 = (i + 1) / 14;
      out.push(
        seg3(
          [w.cx - h + t0 * TILE7, w.cy - h * 0.7, terrainH7(t0, w.rough, w.phase)],
          [w.cx - h + t1 * TILE7, w.cy - h * 0.7, terrainH7(t1, w.rough, w.phase)],
          R.world,
          { width: 1.5 },
        ),
      );
    }
    // policy trace walked so far
    const nSeg = Math.max(1, Math.round(wv * 16));
    for (let i = 0; i < nSeg; i++) out.push(seg3(w.trace[i], w.trace[i + 1], R.plan, { width: 2 }));
    // the robot body riding the trace; box size = link mass
    const p = w.trace[nSeg];
    const s = 0.14 + 0.16 * w.m;
    out.push(...box3([p[0], p[1], p[2] + s / 2 + 0.02], quat.id, s, s * 0.8, s * 0.8, R.signal));
    if (w.real) out.push(label3([w.cx, w.cy, 0.66], "reality", covered ? R.goal : R.error, { anchor: "middle", size: 12.5 }));
    return out;
  });

  return (
    <Stage
      innerRef={ref}
      title="Fig 7.7 · Domain randomization"
      ariaLabel={`Nine simulated worlds with randomized friction, mass and terrain; randomization width ${width.toFixed(2)}; reality ${covered ? "inside" : "outside"} the trained range. Drag to orbit.`}
      svgProps={orbit.svgProps}
      controls={
        <>
          <Transport
            playing={playing}
            onPlay={() => setPlaying((p) => !p)}
            onReset={() => {
              setSeed(1);
              setWalk(0.4);
              orbit.reset();
            }}
          />
          <Btn onClick={() => setSeed((s) => s + 1)} title="re-roll every world's physics">
            🎲 roll new episode
          </Btn>
          <Slider label="randomization width" min={0.1} max={1} step={0.05} value={width} onChange={setWidth} fmt={(v) => v.toFixed(2)} />
        </>
      }
    >
      <Scene3D cam={cam} prims={prims} />
      <Readout
        rows={[
          { label: "band", value: `${lo.toFixed(2)}–${hi.toFixed(2)}`, color: R.ink },
          { label: "reality f", value: REALITY7.f.toFixed(2), color: inBand(REALITY7.f) ? R.goal : R.error },
          { label: "reality m", value: REALITY7.m.toFixed(2), color: inBand(REALITY7.m) ? R.goal : R.error },
          { label: "reality ρ", value: REALITY7.rough.toFixed(2), color: inBand(REALITY7.rough) ? R.goal : R.error },
        ]}
      />
      <Legend
        items={[
          { color: R.plan, label: "policy trace" },
          { color: R.signal, label: "robot, size = mass" },
          { color: R.world, label: "grip ticks = friction" },
          { color: covered ? R.goal : R.error, label: "reality world" },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={covered ? R.world : R.error}>
        {covered
          ? "reality sits inside the training spread — just one more world the policy already handles · drag to orbit"
          : "band too narrow: reality's physics fall outside anything training ever sampled — the reality gap"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 7.8 · Teacher–student distillation  (animated pipeline)
// TOP (teacher): onboard sensors + privileged info -> teacher -> action.
// BOTTOM (student): only sensor history -> student -> action. A "distill"
// arrow links teacher action to student. "Deploy" greys out the privileged
// channel to show what vanishes on the real robot.
// ===========================================================================

type Stage8 = "train" | "distill" | "deploy";
const STAGES8: { id: Stage8; label: string }[] = [
  { id: "train", label: "train teacher" },
  { id: "distill", label: "distill" },
  { id: "deploy", label: "deploy student" },
];

export function RbTeacherStudent() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [stage, setStage] = useState<Stage8>("train");
  const [revealPriv, setRevealPriv] = useState(true);
  const [glow, setGlow] = useState(0);

  useRafLoop((dt) => setGlow((g) => (g + dt * 1.6) % (Math.PI * 2)), {
    playing: inView && !reduced && stage !== "deploy",
  });

  const deployed = stage === "deploy";
  const privActive = revealPriv && !deployed;
  const pulse = reduced ? 0.8 : 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(glow));

  // teacher row y, student row y
  const tY = 150;
  const sY = 330;

  return (
    <Stage
      innerRef={ref}
      title="Fig 7.8 · Teacher–student distillation"
      ariaLabel={`Teacher-student pipeline, stage ${stage}; privileged channel ${privActive ? "active" : "off"}`}
      controls={
        <>
          <Tabs options={STAGES8} value={stage} onChange={setStage} />
          <Btn onClick={() => setRevealPriv((v) => !v)} active={revealPriv} title="highlight the privileged inputs only the teacher gets">
            {revealPriv ? "✓ reveal privileged" : "reveal privileged"}
          </Btn>
        </>
      }
    >
      <Readout
        rows={[
          { label: "stage", value: `${STAGES8.findIndex((s) => s.id === stage) + 1}/3 ${stage}`, color: R.ink },
          { label: "privileged", value: privActive ? "on (sim)" : "off", color: privActive ? R.goal : R.world },
          { label: "student sees", value: "sensors only", color: R.signal },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "onboard sensors" },
          { color: R.goal, label: "privileged (sim only)" },
          { color: R.plan, label: "policy → action" },
          { color: R.error, label: "distillation loss" },
        ]}
      />

      {/* ---- TEACHER ROW ---- */}
      <text x={40} y={tY - 46} fontFamily={MONO} fontSize={14} fill={R.world}>
        TEACHER (simulation)
      </text>
      {/* onboard sensors input */}
      <rect x={40} y={tY - 26} width={130} height={52} rx={8} fill={R.fillBlue} stroke={R.signal} strokeWidth={2.5} />
      <text x={105} y={tY - 2} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.ink}>
        onboard
      </text>
      <text x={105} y={tY + 15} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.ink}>
        sensors
      </text>
      {/* privileged info input */}
      <rect
        x={40}
        y={tY + 40}
        width={130}
        height={52}
        rx={8}
        fill={privActive ? R.fillGreen : "#eeeeec"}
        stroke={privActive ? R.goal : R.line}
        strokeWidth={privActive ? 3 : 2}
        opacity={deployed ? 0.35 : 1}
      />
      <text x={105} y={tY + 62} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={privActive ? R.goal : R.world} opacity={deployed ? 0.5 : 1}>
        privileged
      </text>
      <text x={105} y={tY + 79} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={privActive ? R.goal : R.world} opacity={deployed ? 0.5 : 1}>
        friction, terrain
      </text>

      {/* teacher policy box */}
      {svgArrow(172, tY, 288, tY, R.signal, 2.5, 8)}
      {svgArrow(172, tY + 66, 288, tY + 12, privActive ? R.goal : R.world, 2.5, 8)}
      <rect
        x={290}
        y={tY - 30}
        width={130}
        height={72}
        rx={10}
        fill={R.fillAmber}
        stroke={R.plan}
        strokeWidth={2.5}
        opacity={deployed ? 0.4 : 1}
        style={privActive ? { filter: `drop-shadow(0 0 ${pulse * 6}px ${R.goal})` } : undefined}
      />
      <text x={355} y={tY + 2} textAnchor="middle" fontFamily={MONO} fontSize={14} fontWeight={600} fill={R.ink} opacity={deployed ? 0.5 : 1}>
        teacher
      </text>
      <text x={355} y={tY + 22} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.world} opacity={deployed ? 0.5 : 1}>
        (RL, cheats)
      </text>
      {/* teacher action */}
      {svgArrow(422, tY, 520, tY, deployed ? R.world : R.plan, 2.5, 8)}
      <rect x={522} y={tY - 22} width={120} height={46} rx={8} fill={deployed ? "#eeeeec" : R.fillAmber} stroke={deployed ? R.line : R.plan} strokeWidth={2.5} opacity={deployed ? 0.4 : 1} />
      <text x={582} y={tY + 6} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.ink} opacity={deployed ? 0.5 : 1}>
        action
      </text>

      {/* ---- distill arrow ---- */}
      <g opacity={stage === "deploy" ? 0.3 : 1}>
        {svgArrow(582, tY + 26, 582, sY - 26, R.error, 3, 10)}
        <text x={598} y={(tY + sY) / 2 - 4} fontFamily={MONO} fontSize={12} fill={R.error}>
          imitate /
        </text>
        <text x={598} y={(tY + sY) / 2 + 12} fontFamily={MONO} fontSize={12} fill={R.error}>
          distill
        </text>
      </g>

      {/* divider */}
      <line x1={30} y1={(tY + sY) / 2 + 18} x2={560} y2={(tY + sY) / 2 + 18} stroke={R.line} strokeWidth={1} strokeDasharray="4 6" />

      {/* ---- STUDENT ROW ---- */}
      <text x={40} y={sY - 42} fontFamily={MONO} fontSize={14} fill={deployed ? R.goal : R.world} fontWeight={deployed ? 600 : 400}>
        STUDENT (deployable){deployed ? ", on the real robot" : ""}
      </text>
      {/* sensor history input */}
      <rect x={40} y={sY - 26} width={130} height={52} rx={8} fill={R.fillBlue} stroke={R.signal} strokeWidth={2.5} />
      <text x={105} y={sY - 2} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.ink}>
        sensor
      </text>
      <text x={105} y={sY + 15} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.ink}>
        history
      </text>

      {svgArrow(172, sY, 288, sY, R.signal, 2.5, 8)}
      <rect x={290} y={sY - 30} width={130} height={72} rx={10} fill={R.fillBlue} stroke={R.signal} strokeWidth={deployed ? 3.5 : 2.5} />
      <text x={355} y={sY + 2} textAnchor="middle" fontFamily={MONO} fontSize={14} fontWeight={600} fill={R.ink}>
        student
      </text>
      <text x={355} y={sY + 22} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.world}>
        sensors only
      </text>
      {svgArrow(422, sY, 520, sY, R.plan, 2.5, 8)}
      <rect x={522} y={sY - 22} width={120} height={46} rx={8} fill={R.fillAmber} stroke={R.plan} strokeWidth={2.5} />
      <text x={582} y={sY + 6} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.ink}>
        action
      </text>

      {/* verdict lane (fixed, bottom) */}
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={deployed ? R.goal : R.world}>
        {deployed
          ? "privileged channel gone: only the sensor-only student survives onto the real robot"
          : "the teacher cheats with ground truth; the student learns to match it from sensors alone"}
      </text>
    </Stage>
  );
}
