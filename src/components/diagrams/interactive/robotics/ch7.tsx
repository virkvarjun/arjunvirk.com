"use client";

import { useReducer, useState } from "react";
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
} from "./shared";

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
  const gx = 200;
  const gy = 250;
  const gr = 120;
  const ang = Math.PI - g * Math.PI; // g=1 -> 0 rad (right), g=0 -> PI (left)
  const nx = gx + gr * Math.cos(ang);
  const ny = gy - gr * Math.sin(ang);
  const recCol = t.rec === "classical" ? R.goal : R.error;

  // recommendation boxes
  const boxes: { key: "classical" | "RL"; x: number; label: string; col: string }[] = [
    { key: "classical", x: 470, label: "classical control", col: R.goal },
    { key: "RL", x: 470, label: "reinforcement learning", col: R.error },
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
      {/* gauge label lane */}
      <text x={gx} y={54} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={R.world}>
        how well do we know the dynamics?
      </text>

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
      <text x={gx} y={gy + 58} textAnchor="middle" fontFamily={MONO} fontSize={17} fontWeight={600} fill={recCol}>
        {Math.round(g * 100)}% known
      </text>

      {/* divider */}
      <line x1={410} y1={40} x2={410} y2={400} stroke={R.line} strokeWidth={1.5} strokeDasharray="4 6" />

      {/* recommendation boxes */}
      <text x={565} y={90} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={R.world}>
        recommendation
      </text>
      {boxes.map((b, i) => {
        const active = b.key === t.rec;
        const by = 120 + i * 78;
        return (
          <g key={b.key}>
            <rect
              x={b.x}
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
              x={b.x + 95}
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

      {/* why lane (fixed, bottom) */}
      <text x={470} y={318} fontFamily={MONO} fontSize={13} fill={R.world}>
        {t.label}
      </text>
      {showWhy && (
        <foreignObject x={468} y={330} width={230} height={80}>
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
    </Stage>
  );
}

// ===========================================================================
// Fig 7.2 · The agent–environment loop  (animated pipeline)
// A token circulates AGENT -(action)-> ENVIRONMENT -(state, reward)-> AGENT.
// A running return G accumulates each reward, pre-multiplied by γ^t; the γ
// slider fades far-future reward tokens.
// ===========================================================================

const A2 = { x: 185, y: 150, w: 150, h: 84 };
const E2 = { x: 385, y: 150, w: 170, h: 84 };

export function RbAgentEnvLoop() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [speed, setSpeed] = useState(0.8);
  const [gamma, setGamma] = useState(0.9);
  // phase 0..2 around the loop (0..1 agent->env, 1..2 env->agent); t = step index
  const [st, setSt] = useState({ phase: 0, step: 0, G: 0 });

  useRafLoop(
    (dt) => {
      setSt((s) => {
        let p = s.phase + dt * speed;
        let step = s.step;
        let G = s.G;
        if (p >= 2) {
          p -= 2;
          // reward arrives once per full loop; discount by gamma^step
          G += Math.pow(gamma, step) * 1; // reward = +1 each step
          step += 1;
          if (step > 8) {
            step = 0;
            G = 0;
          }
        }
        return { phase: p, step, G };
      });
    },
    { playing: playing && inView && !reduced },
  );

  const phase = reduced ? 0.5 : st.phase;
  // token position along the current arc
  const agentEdge = { x: A2.x + A2.w / 2, y: A2.y };
  const envEdge = { x: E2.x - E2.w / 2, y: E2.y };
  const outbound = phase < 1;
  const f = outbound ? phase : phase - 1;
  const tokenX = outbound
    ? lerp(agentEdge.x, envEdge.x, f)
    : lerp(E2.x, A2.x, f);
  const tokenY = outbound ? A2.y : A2.y + 130; // return path dips below
  const tokenCol = outbound ? R.plan : R.signal;

  // future-reward token strip (fades with gamma)
  const futures = Array.from({ length: 7 }).map((_, i) => Math.pow(gamma, i + 1));

  return (
    <Stage
      innerRef={ref}
      title="Fig 7.2 · The agent–environment loop"
      ariaLabel={`Agent and environment loop; discount gamma ${gamma.toFixed(2)}; return G ${st.G.toFixed(2)}`}
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
          <Slider
            label="discount γ"
            min={0.1}
            max={0.99}
            step={0.01}
            value={gamma}
            onChange={setGamma}
            fmt={(v) => v.toFixed(2)}
          />
        </>
      }
    >
      {/* agent box */}
      <rect
        x={A2.x - A2.w / 2}
        y={A2.y - A2.h / 2}
        width={A2.w}
        height={A2.h}
        rx={12}
        fill={R.fillBlue}
        stroke={R.signal}
        strokeWidth={2.5}
      />
      <text x={A2.x} y={A2.y - 6} textAnchor="middle" fontFamily={MONO} fontSize={17} fontWeight={600} fill={R.ink}>
        AGENT
      </text>
      <text x={A2.x} y={A2.y + 16} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        policy π
      </text>

      {/* environment box */}
      <rect
        x={E2.x - E2.w / 2}
        y={E2.y - E2.h / 2}
        width={E2.w}
        height={E2.h}
        rx={12}
        fill="#eeeeec"
        stroke={R.world}
        strokeWidth={2.5}
      />
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

      {/* return accumulator (fixed readout, top-left) */}
      <text x={40} y={40} fontFamily={MONO} fontSize={14} fill={R.world}>
        return G = Σ γᵗ·rₜ
      </text>
      <text x={40} y={66} fontFamily={MONO} fontSize={22} fontWeight={600} fill={R.goal}>
        {st.G.toFixed(2)}
      </text>
      <text x={40} y={88} fontFamily={MONO} fontSize={12} fill={R.world}>
        step t = {st.step}
      </text>

      {/* future-reward fade strip (fixed lane, bottom) */}
      <text x={40} y={362} fontFamily={MONO} fontSize={13} fill={R.world}>
        future rewards, discounted by γᵗ:
      </text>
      {futures.map((v, i) => (
        <g key={i}>
          <rect
            x={40 + i * 92}
            y={374}
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
            y={392}
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
    </Stage>
  );
}

// ===========================================================================
// Fig 7.3 · Value iteration coloring a gridworld  (stepper)
// A gridworld with a green goal (+10) and walls; each Bellman sweep updates
// V(s) <- r + γ·max V(s') and cells recolor, value spreading from the goal.
// ===========================================================================

const G3_COLS = 7;
const G3_ROWS = 5;
const GOAL_CELL = { c: 6, r: 0 };
const WALLS = new Set(["2,1", "2,2", "2,3", "4,2", "4,3", "4,4"]);
const REWARD_GOAL = 10;
const MAX_SWEEP = 9;

function cellKey(c: number, r: number) {
  return `${c},${r}`;
}

// Precompute value grids for each sweep k (0..MAX_SWEEP), for a given gamma.
function computeValues(gamma: number) {
  const grids: number[][][] = [];
  let V: number[][] = Array.from({ length: G3_ROWS }, () =>
    Array.from({ length: G3_COLS }, () => 0),
  );
  // goal fixed at +10
  V[GOAL_CELL.r][GOAL_CELL.c] = REWARD_GOAL;
  grids.push(V.map((row) => row.slice()));
  const nbrs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (let k = 0; k < MAX_SWEEP; k++) {
    const next = V.map((row) => row.slice());
    for (let r = 0; r < G3_ROWS; r++) {
      for (let c = 0; c < G3_COLS; c++) {
        if (WALLS.has(cellKey(c, r))) continue;
        if (c === GOAL_CELL.c && r === GOAL_CELL.r) continue;
        let best = 0;
        for (const [dc, dr] of nbrs) {
          const nc = c + dc;
          const nr = r + dr;
          if (nc < 0 || nc >= G3_COLS || nr < 0 || nr >= G3_ROWS) continue;
          if (WALLS.has(cellKey(nc, nr))) continue;
          best = Math.max(best, gamma * V[nr][nc]);
        }
        next[r][c] = best; // reward 0 on non-goal cells
      }
    }
    V = next;
    grids.push(V.map((row) => row.slice()));
  }
  return grids;
}

export function RbValueIteration() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [gammaIdx, setGammaIdx] = useState(0.9);
  const [st, setSt] = useState({ k: 0, acc: 0 });
  const [playing, setPlaying] = useState(false);
  const k = st.k;

  const grids = computeValues(gammaIdx);
  const shownK = reduced ? MAX_SWEEP : k;

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

  const grid = grids[shownK];

  // layout
  const ox = 90;
  const oy = 70;
  const cw = 78;
  const ch = 60;

  const valColor = (v: number) => {
    const t = clamp(v / REWARD_GOAL, 0, 1);
    if (t < 0.02) return "#eeeeec";
    // grey -> amber -> green as value rises
    if (t < 0.5) {
      const u = t / 0.5;
      return lerpHex("#e7e5e0", R.fillAmber, u);
    }
    const u = (t - 0.5) / 0.5;
    return lerpHex(R.fillAmber, R.fillGreen, u);
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 7.3 · Value iteration coloring a gridworld"
      ariaLabel={`Value iteration sweep ${shownK} of ${MAX_SWEEP}, gamma ${gammaIdx.toFixed(2)}`}
      controls={
        <>
          <Btn
            onClick={() => setSt((s) => ({ k: Math.min(MAX_SWEEP, s.k + 1), acc: 0 }))}
            title="apply one Bellman sweep"
          >
            ▶ step
          </Btn>
          <Btn onClick={() => setPlaying((p) => !p)} active={playing}>
            {playing ? "⏸ pause" : "▶ auto"}
          </Btn>
          <Btn
            onClick={() => {
              setSt({ k: 0, acc: 0 });
              setPlaying(false);
            }}
          >
            ↺ reset
          </Btn>
          <Slider
            label="γ"
            min={0.5}
            max={0.99}
            step={0.01}
            value={gammaIdx}
            onChange={(v) => {
              setGammaIdx(v);
            }}
            fmt={(v) => v.toFixed(2)}
          />
          <span className="font-mono text-[13px] text-[var(--muted)]">
            k = {shownK} / {MAX_SWEEP}
          </span>
        </>
      }
    >
      <text x={40} y={44} fontFamily={MONO} fontSize={14} fill={R.world}>
        one Bellman sweep: V(s) ← r + γ·max V(s′)
      </text>

      {grid.map((row, r) =>
        row.map((v, c) => {
          const x = ox + c * cw;
          const y = oy + r * ch;
          const isGoal = c === GOAL_CELL.c && r === GOAL_CELL.r;
          const isWall = WALLS.has(cellKey(c, r));
          return (
            <g key={cellKey(c, r)}>
              <rect
                x={x}
                y={y}
                width={cw - 4}
                height={ch - 4}
                rx={6}
                fill={isWall ? "#dededa" : isGoal ? R.fillGreen : valColor(v)}
                stroke={isWall ? R.error : isGoal ? R.goal : R.line}
                strokeWidth={isGoal ? 3 : isWall ? 2.5 : 1.5}
              />
              {isWall ? (
                <text
                  x={x + (cw - 4) / 2}
                  y={y + (ch - 4) / 2 + 5}
                  textAnchor="middle"
                  fontFamily={MONO}
                  fontSize={13}
                  fill={R.error}
                >
                  wall
                </text>
              ) : (
                <text
                  x={x + (cw - 4) / 2}
                  y={y + (ch - 4) / 2 + 5}
                  textAnchor="middle"
                  fontFamily={MONO}
                  fontSize={14}
                  fontWeight={isGoal ? 600 : 400}
                  fill={R.ink}
                >
                  {isGoal ? "+10" : v.toFixed(1)}
                </text>
              )}
            </g>
          );
        }),
      )}
    </Stage>
  );
}

// Blend two #rrggbb hex colors.
function lerpHex(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const p = pa.map((v, i) => Math.round(lerp(v, pb[i], clamp(t, 0, 1))));
  return `#${p.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// ===========================================================================
// Fig 7.4 · Reinforcing good trajectories, suppressing bad  (slider-driven)
// A start point fans out several rollouts toward a goal; each is colored by
// return. "Apply update" bends the policy's preferred-direction arrow toward
// the high-return rollouts. A variance slider spreads the returns, showing the
// update direction jitter.
// ===========================================================================

const START4 = { x: 150, y: 300 };
const GOAL4 = { x: 600, y: 130 };
const N_ROLL = 6;

export function RbPolicyGradient() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [seed, setSeed] = useState(1);
  const [variance, setVariance] = useState(0.4);
  const [policyAng, setPolicyAng] = useState(-0.35); // rad, target
  const [dispAng, setDispAng] = useState(-0.35);

  // deterministic rollouts from seed
  const rng = mulberry32(seed * 2654435761);
  const baseAng = Math.atan2(GOAL4.y - START4.y, GOAL4.x - START4.x);
  const rolls = Array.from({ length: N_ROLL }).map((_, i) => {
    const spread = 0.9;
    const a = baseAng + (i - (N_ROLL - 1) / 2) * (spread / N_ROLL) * 2 + (rng() - 0.5) * 0.2;
    // return: higher for trajectories pointing near the goal, plus noise
    const align = Math.cos(a - baseAng);
    const ret = 5 * align + (rng() - 0.5) * variance * 20;
    return { a, ret };
  });
  const maxRet = Math.max(...rolls.map((r) => r.ret));
  const minRet = Math.min(...rolls.map((r) => r.ret));

  useRafLoop(
    (dt) => {
      setDispAng((v) => approach(v, policyAng, 0.16, dt));
    },
    { playing: inView && !reduced },
  );

  const applyUpdate = () => {
    // weighted average of rollout angles by (return - mean): the PG update
    const mean = rolls.reduce((s, r) => s + r.ret, 0) / rolls.length;
    let num = 0;
    let den = 0;
    for (const r of rolls) {
      const w = Math.max(0, r.ret - mean);
      num += w * r.a;
      den += w;
    }
    const target = den > 0 ? num / den : baseAng;
    setPolicyAng(target);
  };

  const arrowAng = reduced ? baseAng : dispAng;
  const L = 150;

  const retColor = (ret: number) => {
    const t = clamp((ret - minRet) / (maxRet - minRet + 1e-6), 0, 1);
    return lerpHex(R.error, R.goal, t);
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 7.4 · Reinforcing good trajectories, suppressing bad"
      ariaLabel="Policy-gradient rollouts fanning toward a goal, colored by return; the policy arrow bends toward high-return rollouts on update"
      controls={
        <>
          <Btn
            onClick={() => setSeed((s) => s + 1)}
            title="re-roll trajectories from the current policy"
          >
            🎲 sample new rollouts
          </Btn>
          <Btn onClick={applyUpdate}>↗ apply update</Btn>
          <Btn
            onClick={() => {
              setSeed(1);
              setPolicyAng(-0.35);
              setVariance(0.4);
            }}
          >
            ↺ reset
          </Btn>
          <Slider
            label="variance"
            min={0}
            max={1}
            step={0.05}
            value={variance}
            onChange={setVariance}
            fmt={(v) => v.toFixed(2)}
          />
        </>
      }
    >
      <text x={40} y={40} fontFamily={MONO} fontSize={14} fill={R.world}>
        rollouts colored by return: green high, red low
      </text>

      {/* goal region */}
      <circle cx={GOAL4.x} cy={GOAL4.y} r={34} fill={R.fillGreen} stroke={R.goal} strokeWidth={2.5} />
      <text x={GOAL4.x} y={GOAL4.y + 5} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.goal}>
        goal
      </text>

      {/* rollouts */}
      {rolls.map((r, i) => {
        const len = 320;
        const ex = START4.x + len * Math.cos(r.a);
        const ey = START4.y + len * Math.sin(r.a);
        // slight curve via quadratic control point
        const mx = (START4.x + ex) / 2 + Math.sin(r.a) * 20;
        const my = (START4.y + ey) / 2 - Math.cos(r.a) * 20;
        return (
          <g key={i}>
            <path
              d={`M ${START4.x} ${START4.y} Q ${mx} ${my} ${ex} ${ey}`}
              fill="none"
              stroke={retColor(r.ret)}
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.85}
            />
            <circle cx={ex} cy={ey} r={5} fill={retColor(r.ret)} />
            <text x={ex + 8} y={ey + 4} fontFamily={MONO} fontSize={12} fill={retColor(r.ret)}>
              {r.ret >= 0 ? "+" : ""}
              {r.ret.toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* policy preferred-direction arrow (amber) */}
      {svgArrow(
        START4.x,
        START4.y,
        START4.x + L * Math.cos(arrowAng),
        START4.y + L * Math.sin(arrowAng),
        R.plan,
        5,
        13,
      )}
      <text
        x={START4.x + L * Math.cos(arrowAng) + 4}
        y={START4.y + L * Math.sin(arrowAng) - 8}
        fontFamily={MONO}
        fontSize={13}
        fill={R.plan}
        fontWeight={600}
      >
        policy π
      </text>

      {/* start hub */}
      <circle cx={START4.x} cy={START4.y} r={9} fill={R.ink} />
      <text x={START4.x} y={START4.y + 30} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        start
      </text>

      {/* variance note lane (fixed, bottom) */}
      <text x={40} y={412} fontFamily={MONO} fontSize={13} fill={variance > 0.6 ? R.error : R.world}>
        {variance > 0.6
          ? "high variance: re-sampling swings the update direction wildly; REINFORCE's fatal flaw"
          : "low variance: the update points cleanly toward the high-return rollouts"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 7.5 · Advantage: how much better than average?  (slider-driven)
// A bar chart for one state: a baseline line at V(s), bars for candidate
// actions at Q(s,a). Advantage = gap above/below baseline. "REINFORCE view"
// colors bars by raw return G, shifting them all up by the baseline offset.
// ===========================================================================

const ACTIONS5 = [3, 6, 5, 8, 4]; // Q(s,a) offsets around a base, tweaked by chosen slider
const N_ACT = ACTIONS5.length;

export function RbAdvantage() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [baseline, setBaseline] = useState(5); // V(s)
  const [chosenQ, setChosenQ] = useState(8); // Q of the highlighted action
  const [reinforceView, setReinforceView] = useState(false);
  const [disp, setDisp] = useState({ base: 5, q: 8 });

  useRafLoop(
    (dt) => {
      setDisp((s) => ({
        base: approach(s.base, baseline, 0.2, dt),
        q: approach(s.q, chosenQ, 0.2, dt),
      }));
    },
    { playing: inView && !reduced },
  );

  const bV = reduced ? baseline : disp.base;
  const chosenIdx = 3; // the highlighted action
  const qVals = ACTIONS5.map((v, i) => (i === chosenIdx ? (reduced ? chosenQ : disp.q) : v));

  // layout: value axis 0..12 mapped to y
  const ax0 = 120;
  const ax1 = 660;
  const ay0 = 90; // top (value 12)
  const ay1 = 360; // bottom (value 0)
  const vmax = 12;
  const yOf = (v: number) => ay1 - (clamp(v, 0, vmax) / vmax) * (ay1 - ay0);
  const barW = 66;
  const gap = (ax1 - ax0 - N_ACT * barW) / (N_ACT + 1);

  return (
    <Stage
      innerRef={ref}
      title="Fig 7.5 · Advantage: how much better than average?"
      ariaLabel={`Baseline V(s) ${bV.toFixed(1)}; chosen action Q ${(reduced ? chosenQ : disp.q).toFixed(1)}; advantage ${((reduced ? chosenQ : disp.q) - bV).toFixed(1)}`}
      controls={
        <>
          <Slider label="baseline V(s)" min={0} max={11} step={0.5} value={baseline} onChange={setBaseline} fmt={(v) => v.toFixed(1)} />
          <Slider label="chosen Q" min={0} max={11} step={0.5} value={chosenQ} onChange={setChosenQ} fmt={(v) => v.toFixed(1)} />
          <Btn onClick={() => setReinforceView((v) => !v)} active={reinforceView}>
            {reinforceView ? "✓ REINFORCE view" : "REINFORCE view"}
          </Btn>
        </>
      }
    >
      <text x={40} y={44} fontFamily={MONO} fontSize={14} fill={reinforceView ? R.error : R.world}>
        {reinforceView ? "raw return G: huge common offset, high variance" : "advantage A = Q(s,a) − V(s)"}
      </text>

      {/* baseline line */}
      {!reinforceView && (
        <>
          <line x1={ax0 - 10} y1={yOf(bV)} x2={ax1} y2={yOf(bV)} stroke={R.world} strokeWidth={2.5} strokeDasharray="7 5" />
          <text x={ax1 + 2} y={yOf(bV) + 4} fontFamily={MONO} fontSize={13} fill={R.world}>
            V(s)
          </text>
        </>
      )}

      {/* baseline (zero) for reinforce view */}
      {reinforceView && (
        <line x1={ax0 - 10} y1={ay1} x2={ax1} y2={ay1} stroke={R.line} strokeWidth={2} />
      )}

      {qVals.map((q, i) => {
        const x = ax0 + gap + i * (barW + gap);
        const isChosen = i === chosenIdx;
        const adv = q - bV;
        // In advantage view, bar spans from baseline to Q (green up, red down).
        // In reinforce view, bar spans from 0 to Q (all amber-ish, big offset).
        let top: number;
        let bot: number;
        let col: string;
        let fill: string;
        if (reinforceView) {
          top = yOf(q);
          bot = ay1;
          col = isChosen ? R.plan : R.world;
          fill = isChosen ? R.fillAmber : "#eeeeec";
        } else {
          top = Math.min(yOf(q), yOf(bV));
          bot = Math.max(yOf(q), yOf(bV));
          const pos = adv >= 0;
          col = isChosen ? R.plan : pos ? R.goal : R.error;
          fill = isChosen ? R.fillAmber : pos ? R.fillGreen : R.fillRed;
        }
        return (
          <g key={i}>
            <rect x={x} y={top} width={barW} height={Math.max(2, bot - top)} rx={4} fill={fill} stroke={col} strokeWidth={isChosen ? 3 : 2} />
            <text x={x + barW / 2} y={ay1 + 20} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={isChosen ? R.plan : R.world}>
              a{i + 1}
            </text>
            {!reinforceView && (
              <text
                x={x + barW / 2}
                y={adv >= 0 ? yOf(q) - 6 : yOf(q) + 16}
                textAnchor="middle"
                fontFamily={MONO}
                fontSize={12}
                fontWeight={isChosen ? 600 : 400}
                fill={adv >= 0 ? R.goal : R.error}
              >
                {adv >= 0 ? "+" : ""}
                {adv.toFixed(1)}
              </text>
            )}
            {reinforceView && (
              <text x={x + barW / 2} y={yOf(q) - 6} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={isChosen ? R.plan : R.world}>
                {q.toFixed(1)}
              </text>
            )}
          </g>
        );
      })}

      {/* chosen-action advantage readout (fixed, top-right) */}
      <text x={ax1} y={70} textAnchor="end" fontFamily={MONO} fontSize={14} fill={R.plan} fontWeight={600}>
        chosen a4: A = {((reduced ? chosenQ : disp.q) - bV).toFixed(1)}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 7.6 · PPO clipping: the trust region  (slider-driven)
// Plot the PPO objective (y) vs the probability ratio (x). Raw objective is a
// line; clipped objective bends flat outside [1-ε, 1+ε]. Sign-of-advantage
// toggle flips which side flattens. A marker rides along as the ratio slider
// moves.
// ===========================================================================

export function RbPPOClip() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [ratio, setRatio] = useState(1.0);
  const [eps, setEps] = useState(0.2);
  const [advPos, setAdvPos] = useState(true);
  const [dispRatio, setDispRatio] = useState(1.0);

  useRafLoop(
    (dt) => setDispRatio((v) => approach(v, ratio, 0.25, dt)),
    { playing: inView && !reduced },
  );
  const rShown = reduced ? ratio : dispRatio;

  const A = advPos ? 1 : -1;

  // plot region
  const px0 = 100;
  const px1 = 660;
  const py0 = 80; // top
  const py1 = 360; // bottom (objective 0)
  const rMin = 0.4;
  const rMax = 1.6;
  const objMax = 1.7; // objective axis top (|A|·rMax-ish)
  const xOf = (r: number) => px0 + ((r - rMin) / (rMax - rMin)) * (px1 - px0);
  const yOf = (o: number) => {
    const mid = (py0 + py1) / 2;
    return mid - (o / objMax) * (mid - py0);
  };

  const clipRatio = (r: number) => clamp(r, 1 - eps, 1 + eps);
  const ppoObj = (r: number) => Math.min(r * A, clipRatio(r) * A);

  // sample the clipped curve
  const pts: string[] = [];
  for (let r = rMin; r <= rMax + 1e-6; r += 0.02) {
    pts.push(`${xOf(r).toFixed(1)},${yOf(ppoObj(r)).toFixed(1)}`);
  }
  const rawPts: string[] = [];
  for (let r = rMin; r <= rMax + 1e-6; r += 0.02) {
    rawPts.push(`${xOf(r).toFixed(1)},${yOf(r * A).toFixed(1)}`);
  }

  const markerX = xOf(clamp(rShown, rMin, rMax));
  const markerY = yOf(ppoObj(clamp(rShown, rMin, rMax)));
  const inBand = rShown >= 1 - eps && rShown <= 1 + eps;

  return (
    <Stage
      innerRef={ref}
      title="Fig 7.6 · PPO clipping: the trust region"
      ariaLabel={`PPO objective versus probability ratio ${rShown.toFixed(2)}, epsilon ${eps.toFixed(2)}, advantage ${advPos ? "positive" : "negative"}`}
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
      {/* axes */}
      <line x1={px0} y1={py0 - 10} x2={px0} y2={py1} stroke={R.line} strokeWidth={1.5} />
      <line x1={px0} y1={yOf(0)} x2={px1} y2={yOf(0)} stroke={R.line} strokeWidth={1.5} />
      <text x={px1} y={yOf(0) + 18} textAnchor="end" fontFamily={MONO} fontSize={13} fill={R.signal}>
        probability ratio →
      </text>
      <text x={px0 - 8} y={py0 - 2} textAnchor="end" fontFamily={MONO} fontSize={13} fill={R.plan}>
        objective
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

      {/* raw objective (faint) */}
      <polyline points={rawPts.join(" ")} fill="none" stroke={R.world} strokeWidth={1.5} strokeDasharray="5 5" opacity={0.7} />
      {/* clipped objective (amber) */}
      <polyline points={pts.join(" ")} fill="none" stroke={R.plan} strokeWidth={3.5} strokeLinejoin="round" />

      {/* marker riding the clipped curve */}
      <line x1={markerX} y1={py0 - 10} x2={markerX} y2={py1} stroke={R.signal} strokeWidth={1.5} opacity={0.6} />
      <circle cx={markerX} cy={markerY} r={7} fill={inBand ? R.goal : R.error} stroke="var(--background)" strokeWidth={2} />

      {/* readouts (fixed, top-left) */}
      <text x={px0} y={54} fontFamily={MONO} fontSize={14} fill={R.world}>
        objective = min( ratio·A, clip(ratio)·A )
      </text>
      <text x={markerX} y={py0 - 18} textAnchor="middle" fontFamily={MONO} fontSize={13} fontWeight={600} fill={inBand ? R.goal : R.error}>
        {inBand ? "inside: gradient live" : "clipped: gradient ≈ 0"}
      </text>

      {reduced && (
        <text x={px0} y={py1 + 56} fontFamily={MONO} fontSize={12} fill={R.world}>
          Reduced motion: the clipped curve is shown static; sliders still move the marker.
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 7.7 · Domain randomization  (slider-driven)
// A robot on terrain with a panel of physics params (friction, mass, motor,
// latency, terrain). "Roll new episode" re-randomizes each within its range;
// a "randomization width" slider narrows/widens the bands; a reality marker
// sits inside: green if covered, red if the band is too narrow to reach it.
// ===========================================================================

type Param = { name: string; reality: number }; // reality ∈ 0..1 within range
const PARAMS: Param[] = [
  { name: "friction", reality: 0.72 },
  { name: "link mass", reality: 0.35 },
  { name: "motor strength", reality: 0.6 },
  { name: "control latency", reality: 0.8 },
  { name: "terrain roughness", reality: 0.28 },
];

export function RbDomainRandomization() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [seed, setSeed] = useState(1);
  const [width, setWidth] = useState(0.7); // randomization width 0..1
  const [showReality, setShowReality] = useState(true);
  const [disp, setDisp] = useState<number[]>(PARAMS.map(() => 0.5));

  // deterministic sampled values from seed + width
  const rng = mulberry32(seed * 40503);
  const sampled = PARAMS.map(() => 0.5 + (rng() - 0.5) * width);

  useRafLoop(
    (dt) => {
      setDisp((cur) => cur.map((v, i) => approach(v, sampled[i], 0.18, dt)));
    },
    { playing: inView && !reduced },
  );

  const vals = reduced ? sampled : disp;

  // layout: bars on the right, robot/terrain on the left
  const bx0 = 360;
  const bw = 300;
  const by0 = 92;
  const bh = 42;
  const covers = (p: Param) => {
    const lo = 0.5 - width / 2;
    const hi = 0.5 + width / 2;
    return p.reality >= lo && p.reality <= hi;
  };
  const allCovered = PARAMS.every(covers);

  // terrain roughness drives a little terrain profile
  const rough = vals[4];
  const terrainPts: string[] = [];
  const tRng = mulberry32(seed * 7919 + 13);
  for (let i = 0; i <= 12; i++) {
    const x = 60 + i * 20;
    const y = 320 + (tRng() - 0.5) * rough * 70;
    terrainPts.push(`${x},${y.toFixed(1)}`);
  }

  return (
    <Stage
      innerRef={ref}
      title="Fig 7.7 · Domain randomization"
      ariaLabel={`Domain randomization, width ${width.toFixed(2)}; reality ${allCovered ? "inside" : "outside"} the trained range`}
      controls={
        <>
          <Btn onClick={() => setSeed((s) => s + 1)} title="re-randomize every physics parameter">
            🎲 roll new episode
          </Btn>
          <Slider label="randomization width" min={0.1} max={1} step={0.05} value={width} onChange={setWidth} fmt={(v) => v.toFixed(2)} />
          <Btn onClick={() => setShowReality((v) => !v)} active={showReality}>
            {showReality ? "✓ reality marker" : "show reality marker"}
          </Btn>
        </>
      }
    >
      <text x={40} y={44} fontFamily={MONO} fontSize={14} fill={R.world}>
        every episode: re-roll the physics
      </text>

      {/* terrain + robot (left) */}
      <polyline points={terrainPts.join(" ")} fill="none" stroke={R.world} strokeWidth={2.5} />
      <rect x={140} y={250} width={72} height={40} rx={9} fill={R.fillBlue} stroke={R.signal} strokeWidth={3} />
      {[-24, 0, 24].map((dx, i) => (
        <line key={i} x1={176 + dx} y1={290} x2={176 + dx} y2={318} stroke={R.signal} strokeWidth={5} strokeLinecap="round" />
      ))}
      <text x={176} y={240} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.signal}>
        policy
      </text>

      {/* parameter bars (right) */}
      {PARAMS.map((p, i) => {
        const y = by0 + i * (bh + 14);
        const lo = 0.5 - width / 2;
        const hi = 0.5 + width / 2;
        const lox = bx0 + lo * bw;
        const hix = bx0 + hi * bw;
        const valx = bx0 + clamp(vals[i], 0, 1) * bw;
        const realx = bx0 + p.reality * bw;
        const ok = covers(p);
        return (
          <g key={p.name}>
            <text x={bx0} y={y - 4} fontFamily={MONO} fontSize={12} fill={R.world}>
              {p.name}
            </text>
            {/* full range track */}
            <rect x={bx0} y={y} width={bw} height={bh - 20} rx={5} fill="#eeeeec" stroke={R.line} strokeWidth={1} />
            {/* randomization band */}
            <rect x={lox} y={y} width={hix - lox} height={bh - 20} rx={5} fill={R.fillGreen} opacity={0.45} />
            {/* sampled value marker */}
            <circle cx={valx} cy={y + (bh - 20) / 2} r={6} fill={R.plan} stroke="var(--background)" strokeWidth={1.5} />
            {/* reality marker */}
            {showReality && (
              <>
                <line x1={realx} y1={y - 3} x2={realx} y2={y + bh - 17} stroke={ok ? R.goal : R.error} strokeWidth={3} />
                <circle cx={realx} cy={y + (bh - 20) / 2} r={4.5} fill={ok ? R.goal : R.error} />
              </>
            )}
          </g>
        );
      })}

      {/* legend + verdict (fixed lane, bottom) */}
      <circle cx={370} cy={388} r={5} fill={R.plan} />
      <text x={382} y={392} fontFamily={MONO} fontSize={12} fill={R.world}>
        sampled
      </text>
      {showReality && (
        <>
          <circle cx={470} cy={388} r={5} fill={allCovered ? R.goal : R.error} />
          <text x={482} y={392} fontFamily={MONO} fontSize={12} fill={allCovered ? R.goal : R.error}>
            reality
          </text>
        </>
      )}
      <text x={40} y={392} fontFamily={MONO} fontSize={13} fontWeight={600} fill={allCovered ? R.goal : R.error}>
        {allCovered ? "reality inside range, transfers ✓" : "reality outside range, reality gap"}
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

  useRafLoop(
    (dt) => setGlow((g) => (g + dt * 1.6) % (Math.PI * 2)),
    { playing: inView && !reduced && stage !== "deploy" },
  );

  const deployed = stage === "deploy";
  const privActive = revealPriv && !deployed;
  const pulse = reduced ? 0.8 : 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(glow));

  // teacher row y, student row y
  const tY = 120;
  const sY = 300;

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
          <span className="font-mono text-[13px] text-[var(--muted)]">
            step {STAGES8.findIndex((s) => s.id === stage) + 1} / 3
          </span>
        </>
      }
    >
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
        {svgArrow(582, tY + 24, 582, sY - 24, R.error, 3, 10)}
        <text x={598} y={(tY + sY) / 2 + 4} fontFamily={MONO} fontSize={12} fill={R.error}>
          imitate /
        </text>
        <text x={598} y={(tY + sY) / 2 + 20} fontFamily={MONO} fontSize={12} fill={R.error}>
          distill
        </text>
      </g>

      {/* divider */}
      <line x1={30} y1={(tY + sY) / 2 + 34} x2={690} y2={(tY + sY) / 2 + 34} stroke={R.line} strokeWidth={1} strokeDasharray="4 6" />

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
      <rect
        x={290}
        y={sY - 30}
        width={130}
        height={72}
        rx={10}
        fill={R.fillBlue}
        stroke={R.signal}
        strokeWidth={deployed ? 3.5 : 2.5}
      />
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
      <text x={40} y={412} fontFamily={MONO} fontSize={13} fill={deployed ? R.goal : R.world}>
        {deployed
          ? "privileged channel gone: only the sensor-only student survives onto the real robot"
          : "the teacher cheats with ground truth; the student learns to match it from sensors alone"}
      </text>
    </Stage>
  );
}
