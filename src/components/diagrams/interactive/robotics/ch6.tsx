"use client";

import { useMemo, useReducer, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  R,
  MONO,
  Btn,
  Slider,
  Stage,
  useRafLoop,
  usePrefersReducedMotion,
  useStageVisibility,
  clamp,
  lerp,
  mulberry32,
  svgArrow,
  svgPoint,
  Legend,
  Readout,
  Transport,
} from "./shared";

// --- tiny shared geometry helpers -------------------------------------------

type Rect = { x: number; y: number; w: number; h: number };

// Euclidean distance from a point to an axis-aligned rectangle (0 inside).
function distRect(px: number, py: number, o: Rect) {
  const dx = Math.max(o.x - px, 0, px - (o.x + o.w));
  const dy = Math.max(o.y - py, 0, py - (o.y + o.h));
  return Math.hypot(dx, dy);
}

const angNorm = (a: number) => {
  let v = a;
  while (v > Math.PI) v -= 2 * Math.PI;
  while (v < -Math.PI) v += 2 * Math.PI;
  return v;
};

// ===========================================================================
// Fig 6.1 · Shrink the robot, grow the obstacles  (draggable field + slider)
// Left: a workspace with a draggable disk robot near two obstacles. Right: the
// same scene in C-space where the robot is a point and every obstacle is the
// exact Minkowski inflation (rect grown by r with radius-r corners). The
// free-space readout is measured by sampling the same inflated set, so growing
// the robot visibly and numerically shrinks the free space.
// ===========================================================================

const OBS_6_1: Rect[] = [
  { x: 88, y: 118, w: 70, h: 112 },
  { x: 112, y: 282, w: 132, h: 78 },
];
const PANEL_6_1 = { x: 24, y: 80, w: 300, h: 326 }; // left panel box
const PANEL_DX = 372; // right panel offset in x

export function RbCSpaceInflation() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [radius, setRadius] = useState(26); // target robot radius
  const [showHalo, setShowHalo] = useState(true);
  const [pos, setPos] = useState({ x: 250, y: 210 }); // robot center, left panel
  const [drag, setDrag] = useState(false);
  const [dispR, setDispR] = useState(26); // eased radius for the C-obstacles

  useRafLoop(
    (dt) => {
      setDispR((r) => {
        const k = 1 - Math.pow(1 - 0.2, dt * 60);
        return r + k * (radius - r);
      });
    },
    { playing: inView && !reduced },
  );

  const r = reduced ? radius : dispR;

  const onMove = (e: ReactPointerEvent<SVGElement>) => {
    if (!drag) return;
    const [x, y] = svgPoint(e);
    setPos({ x: clamp(x, 32, 316), y: clamp(y, 88, 398) });
  };

  const reset = () => {
    setRadius(26);
    setPos({ x: 250, y: 210 });
  };

  // Point-in-C-obstacle is exactly "distance to the original rect ≤ r": the
  // honest Minkowski test, used for the status readout AND the area estimate.
  const inside = OBS_6_1.some((o) => distRect(pos.x, pos.y, o) <= r);

  // Measure the free-space fraction by sampling the right panel on a grid and
  // running the same distance test — the number is computed, not asserted.
  const freePct = useMemo(() => {
    const nx = 46;
    const ny = 50;
    let free = 0;
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        const px = PANEL_6_1.x + ((i + 0.5) / nx) * PANEL_6_1.w;
        const py = PANEL_6_1.y + ((j + 0.5) / ny) * PANEL_6_1.h;
        if (!OBS_6_1.some((o) => distRect(px, py, o) <= r)) free++;
      }
    }
    return (100 * free) / (nx * ny);
  }, [r]);

  const cfg = { x: pos.x + PANEL_DX, y: pos.y };

  return (
    <Stage
      innerRef={ref}
      title="Fig 6.1 · Shrink the robot, grow the obstacles"
      ariaLabel={`A disk robot of radius ${Math.round(r)} in a workspace, shown as a single point in configuration space where obstacles are inflated by the robot's radius; ${Math.round(freePct)} percent of the space remains free`}
      svgProps={{
        onPointerMove: onMove,
        onPointerUp: () => setDrag(false),
        onPointerLeave: () => setDrag(false),
      }}
      controls={
        <>
          <Slider
            label="robot size"
            min={4}
            max={46}
            value={radius}
            onChange={setRadius}
            fmt={(v) => `r=${v}`}
          />
          <Btn onClick={() => setShowHalo((v) => !v)} active={showHalo}>
            {showHalo ? "✓ inflation halo" : "show halo"}
          </Btn>
          <Btn onClick={reset}>↺ reset</Btn>
          <span className="font-mono text-[13px] text-[var(--muted)]">drag the robot</span>
        </>
      }
    >
      <defs>
        <clipPath id="rb61-left">
          <rect x={PANEL_6_1.x} y={PANEL_6_1.y} width={PANEL_6_1.w} height={PANEL_6_1.h} rx={6} />
        </clipPath>
        <clipPath id="rb61-right">
          <rect x={PANEL_6_1.x + PANEL_DX} y={PANEL_6_1.y} width={PANEL_6_1.w} height={PANEL_6_1.h} rx={6} />
        </clipPath>
      </defs>

      {/* fixed lanes: readout top-left, legend top-right, titles above panels */}
      <Readout
        x={24}
        y={20}
        rows={[
          { label: "robot radius", value: `${Math.round(r)} px` },
          { label: "free space", value: `${freePct.toFixed(0)} %`, color: R.goal },
          {
            label: "robot center",
            value: inside ? "in C-obstacle" : "free",
            color: inside ? R.error : R.ink,
          },
        ]}
      />
      <Legend
        x={524}
        y={24}
        items={[
          { color: R.error, label: "C-obstacle (inflated)" },
          { color: R.world, label: "real obstacle" },
        ]}
      />
      <text x={174} y={74} textAnchor="middle" fontFamily={MONO} fontSize={13.5} fill={R.world}>
        workspace
      </text>
      <text x={174 + PANEL_DX} y={74} textAnchor="middle" fontFamily={MONO} fontSize={13.5} fill={R.world}>
        configuration space
      </text>
      <line x1={360} y1={80} x2={360} y2={406} stroke={R.line} strokeWidth={1.5} strokeDasharray="4 6" />

      {/* RIGHT panel: free space backdrop, exact Minkowski C-obstacles */}
      <rect x={PANEL_6_1.x + PANEL_DX} y={PANEL_6_1.y} width={PANEL_6_1.w} height={PANEL_6_1.h} rx={6} fill={R.fillGreen} opacity={0.45} />
      <g clipPath="url(#rb61-right)">
        {OBS_6_1.map((o, i) => (
          <rect
            key={`ci${i}`}
            x={o.x - r + PANEL_DX}
            y={o.y - r}
            width={o.w + 2 * r}
            height={o.h + 2 * r}
            rx={r}
            fill={R.fillRed}
            stroke={R.error}
            strokeWidth={2}
          />
        ))}
        {OBS_6_1.map((o, i) => (
          <rect
            key={`co${i}`}
            x={o.x + PANEL_DX}
            y={o.y}
            width={o.w}
            height={o.h}
            rx={4}
            fill="none"
            stroke={R.world}
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
        ))}
      </g>
      <rect x={PANEL_6_1.x + PANEL_DX} y={PANEL_6_1.y} width={PANEL_6_1.w} height={PANEL_6_1.h} rx={6} fill="none" stroke={R.line} strokeWidth={2} />
      {/* the robot as a single point */}
      <circle cx={cfg.x} cy={cfg.y} r={5.5} fill={R.signal} stroke="var(--background)" strokeWidth={1.5} />
      <text x={cfg.x} y={cfg.y - 12} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={inside ? R.error : R.signal}>
        {inside ? "in C-obstacle" : "the robot, a point"}
      </text>

      {/* LEFT panel: real obstacles + draggable disk robot */}
      <rect x={PANEL_6_1.x} y={PANEL_6_1.y} width={PANEL_6_1.w} height={PANEL_6_1.h} rx={6} fill="none" stroke={R.line} strokeWidth={2} />
      {OBS_6_1.map((o, i) => (
        <rect key={`o${i}`} x={o.x} y={o.y} width={o.w} height={o.h} rx={4} fill="#e6e6e3" stroke={R.world} strokeWidth={2} />
      ))}
      <g clipPath="url(#rb61-left)">
        {showHalo && (
          <circle cx={pos.x} cy={pos.y} r={r} fill="none" stroke={R.error} strokeWidth={1.5} strokeDasharray="4 4" opacity={0.8} />
        )}
        <circle
          cx={pos.x}
          cy={pos.y}
          r={Math.max(6, r * 0.42)}
          fill={R.fillBlue}
          stroke={R.signal}
          strokeWidth={3}
          style={{ cursor: "grab" }}
          onPointerDown={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
        />
      </g>

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12.5} fill={R.world}>
        same scene, two views: fatten the obstacles by r and the shaped robot becomes a point
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 6.2 · Dijkstra vs A*: watch A* aim  (toggle-compare stepper)
// Two identical grids, same start/goal/walls. Both searches actually run (a
// uniform-cost expansion with h = 0 vs h = Manhattan); the full expansion
// trace — closed set, open set with live f-values, pop order — is precomputed
// deterministically and scrubbed by play / step / reset. The punchline is the
// counter: A* pops far fewer cells for the same optimal path.
// ===========================================================================

const GRID_6_2 = { cols: 11, rows: 9 };
const OBST_6_2 = new Set<string>([
  "5,1", "5,2", "5,3", "5,4", "5,5",
  "3,4", "4,4", "6,4", "7,4",
  "8,2", "8,3", "8,6", "8,7",
  "2,6", "3,6", "3,7",
]);
const START_6_2: [number, number] = [1, 4];
const GOAL_6_2: [number, number] = [9, 4];

type Expansion = {
  x: number;
  y: number;
  g: number; // cost-so-far at pop
  f: number; // g + h at pop
  open: { key: string; f: number }[]; // frontier snapshot after this pop
};
type SearchTrace = { expansions: Expansion[]; path: [number, number][] };

// Run the real search (0 = Dijkstra, 1 = A*), recording every pop and the
// open-set snapshot after it. Fully deterministic: stable min-f scan with
// insertion-order tie-breaking.
function runSearch(useHeuristic: boolean): SearchTrace {
  const key = (x: number, y: number) => `${x},${y}`;
  const h = (x: number, y: number) =>
    useHeuristic ? Math.abs(x - GOAL_6_2[0]) + Math.abs(y - GOAL_6_2[1]) : 0;
  const g = new Map<string, number>();
  const parent = new Map<string, string>();
  const expansions: Expansion[] = [];
  const closed = new Set<string>();
  g.set(key(...START_6_2), 0);
  const open: [number, number][] = [START_6_2];
  const dirs: [number, number][] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (open.length) {
    let bi = 0;
    let bf = Infinity;
    for (let i = 0; i < open.length; i++) {
      const [x, y] = open[i];
      const f = (g.get(key(x, y)) ?? Infinity) + h(x, y);
      if (f < bf - 1e-9) {
        bf = f;
        bi = i;
      }
    }
    const [cx, cy] = open.splice(bi, 1)[0];
    const ck = key(cx, cy);
    if (closed.has(ck)) continue;
    closed.add(ck);
    const cg = g.get(ck) ?? 0;
    if (cx === GOAL_6_2[0] && cy === GOAL_6_2[1]) {
      expansions.push({ x: cx, y: cy, g: cg, f: cg + h(cx, cy), open: [] });
      break;
    }
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= GRID_6_2.cols || ny >= GRID_6_2.rows) continue;
      const nk = key(nx, ny);
      if (OBST_6_2.has(nk) || closed.has(nk)) continue;
      const ng = cg + 1;
      if (ng < (g.get(nk) ?? Infinity)) {
        g.set(nk, ng);
        parent.set(nk, ck);
        open.push([nx, ny]);
      }
    }
    // frontier snapshot: unique, not-yet-closed entries with their current f
    const snap = new Map<string, number>();
    for (const [x, y] of open) {
      const kk = key(x, y);
      if (closed.has(kk)) continue;
      const f = (g.get(kk) ?? Infinity) + h(x, y);
      const prev = snap.get(kk);
      if (prev === undefined || f < prev) snap.set(kk, f);
    }
    expansions.push({
      x: cx,
      y: cy,
      g: cg,
      f: cg + h(cx, cy),
      open: [...snap.entries()].map(([kk, f]) => ({ key: kk, f })),
    });
  }
  const path: [number, number][] = [];
  let cur = key(...GOAL_6_2);
  if (closed.has(cur)) {
    while (cur) {
      const [px, py] = cur.split(",").map(Number);
      path.push([px, py]);
      const p = parent.get(cur);
      if (!p) break;
      cur = p;
    }
    path.reverse();
  }
  return { expansions, path };
}

export function RbDijkstraVsAstar() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [speed, setSpeed] = useState(1);
  const [k, setK] = useState(0); // number of expansions revealed
  const [, setAcc] = useState(0);

  const dij = useMemo(() => runSearch(false), []);
  const astar = useMemo(() => runSearch(true), []);
  const total = Math.max(dij.expansions.length, astar.expansions.length);

  useRafLoop(
    (dt) => {
      setAcc((a) => {
        const next = a + dt * speed * 6; // ~6 expansions/sec at 1x
        const adv = Math.floor(next);
        if (adv > 0) setK((cur) => Math.min(total, cur + adv));
        return next - adv;
      });
    },
    { playing: playing && inView && !reduced && k < total },
  );

  const shown = reduced ? total : k;
  const cell = 26;
  const gw = GRID_6_2.cols * cell;
  const gh = GRID_6_2.rows * cell;
  const GY = 112;

  const dijShown = Math.min(shown, dij.expansions.length);
  const aShown = Math.min(shown, astar.expansions.length);
  const bothDone = shown >= total;

  const renderGrid = (trace: SearchTrace, ox: number, label: string, isAstar: boolean) => {
    const n = Math.min(shown, trace.expansions.length);
    const done = shown >= trace.expansions.length;
    const closedVal = new Map<string, number>();
    for (let i = 0; i < n; i++) {
      const e = trace.expansions[i];
      closedVal.set(`${e.x},${e.y}`, isAstar ? e.f : e.g);
    }
    const openVal = new Map<string, number>();
    if (n > 0 && !done) {
      for (const o of trace.expansions[n - 1].open) openVal.set(o.key, o.f);
    }
    const frontier = n > 0 && !done ? trace.expansions[n - 1] : null;
    const pathSet = new Set(done ? trace.path.map(([x, y]) => `${x},${y}`) : []);
    const cells: React.ReactNode[] = [];
    for (let y = 0; y < GRID_6_2.rows; y++) {
      for (let x = 0; x < GRID_6_2.cols; x++) {
        const kk = `${x},${y}`;
        const px = ox + x * cell;
        const py = GY + y * cell;
        const isObst = OBST_6_2.has(kk);
        const isStart = x === START_6_2[0] && y === START_6_2[1];
        const isGoal = x === GOAL_6_2[0] && y === GOAL_6_2[1];
        const onPath = pathSet.has(kk);
        const isClosed = closedVal.has(kk);
        const isOpen = openVal.has(kk);
        let fill = "var(--background)";
        if (isObst) fill = R.fillRed;
        else if (onPath) fill = R.fillGreen;
        else if (isStart) fill = R.fillAmber;
        else if (isGoal) fill = R.fillGreen;
        else if (isClosed) fill = "#e9e9e6";
        else if (isOpen) fill = R.fillAmber;
        cells.push(
          <rect key={kk} x={px} y={py} width={cell} height={cell} fill={fill} stroke={R.line} strokeWidth={0.8} />,
        );
        if (isStart) {
          cells.push(
            <text key={`${kk}S`} x={px + cell / 2} y={py + cell / 2 + 5} textAnchor="middle" fontFamily={MONO} fontSize={13} fontWeight={600} fill={R.plan}>S</text>,
          );
        } else if (isGoal) {
          cells.push(
            <text key={`${kk}G`} x={px + cell / 2} y={py + cell / 2 + 5} textAnchor="middle" fontFamily={MONO} fontSize={13} fontWeight={600} fill={R.goal}>G</text>,
          );
        } else if (isClosed) {
          cells.push(
            <text key={`${kk}v`} x={px + cell / 2} y={py + cell / 2 + 3.5} textAnchor="middle" fontFamily={MONO} fontSize={10} fill={R.world}>
              {closedVal.get(kk)}
            </text>,
          );
        } else if (isOpen) {
          cells.push(
            <text key={`${kk}f`} x={px + cell / 2} y={py + cell / 2 + 3.5} textAnchor="middle" fontFamily={MONO} fontSize={10} fill={R.plan} fontWeight={600}>
              {openVal.get(kk)}
            </text>,
          );
        }
      }
    }
    if (frontier) {
      cells.push(
        <rect key="fr" x={ox + frontier.x * cell} y={GY + frontier.y * cell} width={cell} height={cell} fill="none" stroke={R.signal} strokeWidth={3} />,
      );
    }
    return (
      <g>
        <text x={ox + gw / 2} y={104} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={R.ink} fontWeight={600}>
          {label}
        </text>
        {cells}
        <text x={ox} y={GY + gh + 22} fontFamily={MONO} fontSize={13} fill={R.world}>
          cells expanded:{" "}
          <tspan fill={R.signal} fontWeight={600}>
            {n}
          </tspan>
          {done ? <tspan fill={R.goal}> · done</tspan> : null}
        </text>
      </g>
    );
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 6.2 · Dijkstra vs A*: watch A* aim"
      ariaLabel={`Two grid searches side by side: Dijkstra expanded ${dijShown} cells, A star expanded ${aShown} cells; numbers show cost-so-far and f values on the frontier`}
      controls={
        <>
          <Transport
            playing={playing}
            onPlay={toggle}
            onStep={() => setK((c) => Math.min(total, c + 1))}
            onReset={() => {
              setK(0);
              setAcc(0);
            }}
          />
          <Slider label="speed" min={0.25} max={3} step={0.25} value={speed} onChange={setSpeed} fmt={(v) => `${v}×`} />
          <span className="font-mono text-[13px] text-[var(--muted)]">
            step {Math.min(shown, total)} / {total}
          </span>
        </>
      }
    >
      <Readout
        x={24}
        y={20}
        rows={[
          { label: "Dijkstra", value: `${dijShown} expanded` },
          { label: "A*", value: `${aShown} expanded`, color: R.signal },
          {
            label: "A* saved",
            value: bothDone ? `${dij.expansions.length - astar.expansions.length} cells` : "…",
            color: bothDone ? R.goal : R.world,
          },
        ]}
      />
      <Legend
        x={524}
        y={24}
        items={[
          { color: R.world, label: "closed (expanded)" },
          { color: R.plan, label: "frontier (f value)" },
          { color: R.goal, label: "final path" },
          { color: R.error, label: "wall" },
        ]}
      />
      {renderGrid(dij, 40, "Dijkstra (h=0)", false)}
      {renderGrid(astar, 394, "A* (h=Manhattan)", true)}
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12.5} fill={bothDone ? R.goal : R.world}>
        {bothDone
          ? `same optimal path, cost ${dij.path.length - 1} — the heuristic cut the work from ${dij.expansions.length} pops to ${astar.expansions.length}`
          : "both pop the smallest f = g + h · Dijkstra's h is 0, so it floods in rings"}
      </text>
      {reduced && (
        <text x={40} y={GY + gh + 44} fontFamily={MONO} fontSize={12} fill={R.world}>
          Reduced motion: both searches shown fully expanded with their final paths.
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 6.3 · RRT: a tree reaching for the goal  (stepper on a draggable field)
// The whole RRT run (sample → nearest → steer → collision-check) is computed
// once as a deterministic trace from a seeded PRNG, then scrubbed one extend
// per step. The goal and every obstacle are draggable: on drop the trace
// recomputes from the same seed, so the figure stays reproducible.
// ===========================================================================

const BOX_6_3 = { x: 28, y: 64, w: 664, h: 344 };
const START_6_3 = { x: 70, y: 378 };
const GOAL_R_6_3 = 32;
const STEP_6_3 = 34; // extension length
const MAX_EV_6_3 = 500;

function segHitsObstacle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  obs: Rect[],
) {
  // sample points along the segment; cheap and deterministic.
  for (let t = 0; t <= 1.0001; t += 0.12) {
    const px = lerp(ax, bx, t);
    const py = lerp(ay, by, t);
    for (const o of obs) {
      if (px >= o.x && px <= o.x + o.w && py >= o.y && py <= o.y + o.h) return true;
    }
  }
  return false;
}

type TreeNode = { x: number; y: number; parent: number; h: number };
type RrtEvent = {
  sx: number;
  sy: number; // the sample
  x: number;
  y: number; // attempted new node
  parent: number;
  h: number;
  ok: boolean; // collision-free?
};
type RrtTrace = {
  events: RrtEvent[];
  nodes: TreeNode[]; // full final tree (nodes only ever append)
  okPrefix: number[]; // okPrefix[k] = #nodes added within the first k events
  reachedAt: number; // event index that reached the goal, or -1
  path: TreeNode[]; // final path, shown once reachedAt is scrubbed past
  pathLen: number;
};

// The actual RRT loop, run start-to-finish with one seeded PRNG stream.
function buildRrtTrace(
  goal: { x: number; y: number },
  obstacles: Rect[],
  goalBias: number,
  nonholo: boolean,
): RrtTrace {
  const rng = mulberry32(0x6a3d);
  const nodes: TreeNode[] = [{ x: START_6_3.x, y: START_6_3.y, parent: -1, h: -Math.PI / 3 }];
  const events: RrtEvent[] = [];
  const okPrefix: number[] = [0];
  let reachedAt = -1;
  for (let it = 0; it < MAX_EV_6_3 && reachedAt < 0; it++) {
    // sample (goal-biased)
    let sx: number;
    let sy: number;
    if (rng() < goalBias) {
      sx = goal.x;
      sy = goal.y;
    } else {
      sx = 34 + rng() * 652;
      sy = 70 + rng() * 332;
    }
    // nearest node
    let ni = 0;
    let nd = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const d = Math.hypot(nodes[i].x - sx, nodes[i].y - sy);
      if (d < nd) {
        nd = d;
        ni = i;
      }
    }
    const near = nodes[ni];
    const ang = Math.atan2(sy - near.y, sx - near.x);
    let hNew = ang;
    if (nonholo) {
      // car-like: bounded turn from the parent's heading, then drive.
      hNew = near.h + clamp(angNorm(ang - near.h), -0.6, 0.6);
    }
    const nx = clamp(near.x + Math.cos(hNew) * STEP_6_3, 34, 686);
    const ny = clamp(near.y + Math.sin(hNew) * STEP_6_3, 70, 402);
    const ok = !segHitsObstacle(near.x, near.y, nx, ny, obstacles);
    events.push({ sx, sy, x: nx, y: ny, parent: ni, h: hNew, ok });
    if (ok) {
      nodes.push({ x: nx, y: ny, parent: ni, h: hNew });
      if (Math.hypot(nx - goal.x, ny - goal.y) < GOAL_R_6_3) reachedAt = events.length - 1;
    }
    okPrefix.push(okPrefix[okPrefix.length - 1] + (ok ? 1 : 0));
  }
  // final path
  const path: TreeNode[] = [];
  let pathLen = 0;
  if (reachedAt >= 0) {
    let idx = nodes.length - 1;
    while (idx >= 0) {
      path.push(nodes[idx]);
      const p = nodes[idx].parent;
      if (p >= 0) pathLen += Math.hypot(nodes[idx].x - nodes[p].x, nodes[idx].y - nodes[p].y);
      idx = p;
    }
  }
  return { events, nodes, okPrefix, reachedAt, path, pathLen };
}

const OBST_6_3_INIT: Rect[] = [
  { x: 200, y: 100, w: 60, h: 160 },
  { x: 370, y: 220, w: 180, h: 56 },
  { x: 265, y: 328, w: 60, h: 60 },
];

export function RbRrtGrowth() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [goalBias, setGoalBias] = useState(0.1);
  const [nonholo, setNonholo] = useState(false);
  const [goal, setGoal] = useState({ x: 615, y: 130 });
  const [obstacles, setObstacles] = useState<Rect[]>(OBST_6_3_INIT);
  const [k, setK] = useState(0); // events revealed
  const [, setAcc] = useState(0);
  const dragRef = useRef<null | { kind: "goal" } | { kind: "obs"; i: number; dx: number; dy: number }>(null);

  const trace = useMemo(
    () => buildRrtTrace(goal, obstacles, goalBias, nonholo),
    [goal, obstacles, goalBias, nonholo],
  );
  const N = trace.events.length;

  useRafLoop(
    (dt) => {
      setAcc((a) => {
        const next = a + dt * 10; // ~10 events/sec
        const adv = Math.floor(next);
        if (adv > 0) setK((c) => Math.min(N, c + adv));
        return next - adv;
      });
    },
    { playing: playing && inView && !reduced && k < N },
  );

  const shown = reduced ? N : Math.min(k, N);
  const nodes = trace.nodes.slice(0, 1 + trace.okPrefix[shown]);
  const reached = trace.reachedAt >= 0 && shown > trace.reachedAt;
  const path = reached ? trace.path : [];
  const lastEv = shown > 0 ? trace.events[shown - 1] : null;

  const onMove = (e: ReactPointerEvent<SVGElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const [x, y] = svgPoint(e);
    if (d.kind === "goal") {
      setGoal({ x: clamp(x, 74, 650), y: clamp(y, 106, 366) });
    } else {
      setObstacles((obs) =>
        obs.map((o, i) =>
          i === d.i
            ? {
                ...o,
                x: clamp(x - d.dx, 32, 688 - o.w),
                y: clamp(y - d.dy, 68, 404 - o.h),
              }
            : o,
        ),
      );
    }
  };
  const endDrag = () => {
    if (dragRef.current) {
      dragRef.current = null;
      setK(0); // regrow from the same seed against the new scene
      setAcc(0);
    }
  };

  const reset = () => {
    setK(0);
    setAcc(0);
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 6.3 · RRT: a tree reaching for the goal"
      ariaLabel={`A rapidly-exploring random tree of ${nodes.length} nodes growing from the start toward a draggable goal, around draggable obstacles; ${reached ? "goal reached" : "still growing"}`}
      svgProps={{
        onPointerMove: onMove,
        onPointerUp: endDrag,
        onPointerLeave: endDrag,
      }}
      controls={
        <>
          <Transport playing={playing} onPlay={toggle} onStep={() => setK((c) => Math.min(N, c + 1))} onReset={reset} />
          <Slider label="goal bias" min={0} max={0.6} step={0.05} value={goalBias} onChange={(v) => { setGoalBias(v); setK(0); }} fmt={(v) => `${Math.round(v * 100)}%`} />
          <Btn onClick={() => { setNonholo((v) => !v); setK(0); }} active={nonholo}>
            {nonholo ? "✓ nonholonomic" : "nonholonomic"}
          </Btn>
          <span className="font-mono text-[13px] text-[var(--muted)]">drag goal / obstacles</span>
        </>
      }
    >
      <Readout
        x={24}
        y={20}
        rows={[
          { label: "samples", value: `${shown} / ${N}` },
          {
            label: "tree nodes",
            value: `${nodes.length}${reached ? " · reached" : " · growing"}`,
            color: reached ? R.goal : R.ink,
          },
        ]}
      />
      <Legend
        x={438}
        y={20}
        items={[
          { color: R.signal, label: "tree edge" },
          { color: R.goal, label: "found path" },
        ]}
      />
      <Legend
        x={578}
        y={20}
        items={[
          { color: R.plan, label: "sample", dash: true },
          { color: R.error, label: "rejected" },
        ]}
      />

      {/* world box */}
      <rect x={BOX_6_3.x} y={BOX_6_3.y} width={BOX_6_3.w} height={BOX_6_3.h} rx={6} fill="none" stroke={R.line} strokeWidth={1.5} />

      {/* obstacles (draggable) */}
      {obstacles.map((o, i) => (
        <rect
          key={i}
          x={o.x}
          y={o.y}
          width={o.w}
          height={o.h}
          rx={5}
          fill="#e6e6e3"
          stroke={R.world}
          strokeWidth={2}
          style={{ cursor: "grab" }}
          onPointerDown={(e) => {
            e.preventDefault();
            const [x, y] = svgPoint(e);
            dragRef.current = { kind: "obs", i, dx: x - o.x, dy: y - o.y };
          }}
        />
      ))}
      {/* goal region (draggable) */}
      <circle
        cx={goal.x}
        cy={goal.y}
        r={GOAL_R_6_3}
        fill={R.fillGreen}
        stroke={R.goal}
        strokeWidth={2}
        strokeDasharray="5 5"
        opacity={0.75}
        style={{ cursor: "grab" }}
        onPointerDown={(e) => {
          e.preventDefault();
          dragRef.current = { kind: "goal" };
        }}
      />
      <text x={goal.x} y={goal.y + 4} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>
        goal
      </text>

      {/* tree edges */}
      {nodes.map((n, i) =>
        n.parent < 0 ? null : (
          <line key={i} x1={nodes[n.parent].x} y1={nodes[n.parent].y} x2={n.x} y2={n.y} stroke={R.signal} strokeWidth={2} opacity={0.85} />
        ),
      )}
      {nodes.map((n, i) => (
        <circle key={`n${i}`} cx={n.x} cy={n.y} r={2.6} fill={R.signal} />
      ))}

      {/* solution path */}
      {path.length > 1 &&
        path.map((n, i) =>
          i === 0 ? null : (
            <line key={`p${i}`} x1={path[i - 1].x} y1={path[i - 1].y} x2={n.x} y2={n.y} stroke={R.goal} strokeWidth={4} strokeLinecap="round" />
          ),
        )}

      {/* the latest sample + rejected extension */}
      {lastEv && !reached && (
        <circle cx={lastEv.sx} cy={lastEv.sy} r={5} fill="none" stroke={R.plan} strokeWidth={2} strokeDasharray="3 3" />
      )}
      {lastEv && !lastEv.ok && !reached && (
        <>
          <line x1={lastEv.x - 7} y1={lastEv.y - 7} x2={lastEv.x + 7} y2={lastEv.y + 7} stroke={R.error} strokeWidth={2.5} />
          <line x1={lastEv.x - 7} y1={lastEv.y + 7} x2={lastEv.x + 7} y2={lastEv.y - 7} stroke={R.error} strokeWidth={2.5} />
        </>
      )}

      {/* start */}
      <circle cx={START_6_3.x} cy={START_6_3.y} r={7} fill={R.plan} stroke="var(--background)" strokeWidth={2} />
      <text x={START_6_3.x} y={START_6_3.y + 22} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.plan}>
        start
      </text>

      <text x={360} y={426} textAnchor="middle" fontFamily={MONO} fontSize={12.5} fill={reached ? R.goal : R.world}>
        {reached
          ? `path found: ${path.length} nodes, ${Math.round(trace.pathLen)} px — feasible, jagged, and RRT is happy with that`
          : "extend the nearest node toward each sample: big empty regions win the pull"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 6.4 · RRT vs RRT*: jagged vs smooth  (toggle-compare stepper)
// Left runs RRT and freezes its first-found path. Right runs RRT* with real
// choose-best-parent + rewire steps on the *same seeded samples*: scrub the
// iteration counter and its path straightens while the rewire counter ticks.
// The goal is draggable (both panels share it; recompute on drop).
// ===========================================================================

const OBST_6_4: Rect[] = [
  { x: 225, y: 36, w: 48, h: 118 },
  { x: 225, y: 196, w: 48, h: 88 },
];
const PW_6_4 = 336;
const PH_6_4 = 300;
const OY_6_4 = 96;
const START_6_4 = { x: 48, y: 150 };
const N_6_4 = 300;

type Node4 = { x: number; y: number; parent: number; cost: number };

function pathOf(nodes: Node4[], goalIdx: number) {
  const path: Node4[] = [];
  let len = 0;
  let idx = goalIdx;
  while (idx >= 0) {
    path.push(nodes[idx]);
    const p = nodes[idx].parent;
    if (p >= 0) len += Math.hypot(nodes[idx].x - nodes[p].x, nodes[idx].y - nodes[p].y);
    idx = p;
  }
  return { path, len };
}

// Rebuild the tree deterministically up to iteration `upto` (both variants
// consume the identical sample stream). RRT* really rewires: `rewires` counts
// every re-parenting that shortened somebody's route.
function treeAt(rewire: boolean, upto: number, goal: { x: number; y: number }) {
  const rng = mulberry32(0xf00d1234);
  const nodes: Node4[] = [{ x: START_6_4.x, y: START_6_4.y, parent: -1, cost: 0 }];
  const step = 26;
  const radius = 55;
  const hit = (ax: number, ay: number, bx: number, by: number) =>
    segHitsObstacle(ax, ay, bx, by, OBST_6_4);
  let bestGoal = -1;
  let frozen = -1; // RRT: freeze first path
  let rewires = 0;
  for (let it = 0; it < upto; it++) {
    let sx = 24 + rng() * (PW_6_4 - 44);
    let sy = 20 + rng() * (PH_6_4 - 40);
    if (rng() < 0.08) {
      sx = goal.x;
      sy = goal.y;
    }
    let ni = 0;
    let nd = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const d = Math.hypot(nodes[i].x - sx, nodes[i].y - sy);
      if (d < nd) {
        nd = d;
        ni = i;
      }
    }
    const near = nodes[ni];
    const ang = Math.atan2(sy - near.y, sx - near.x);
    const nx = clamp(near.x + Math.cos(ang) * step, 18, PW_6_4 - 16);
    const ny = clamp(near.y + Math.sin(ang) * step, 14, PH_6_4 - 12);
    if (hit(near.x, near.y, nx, ny)) continue;
    let parent = ni;
    let bestCost = near.cost + Math.hypot(nx - near.x, ny - near.y);
    if (rewire) {
      // choose-best-parent: cheapest collision-free connection in the ball
      for (let i = 0; i < nodes.length; i++) {
        const d = Math.hypot(nodes[i].x - nx, nodes[i].y - ny);
        if (d <= radius && !hit(nodes[i].x, nodes[i].y, nx, ny)) {
          const c = nodes[i].cost + d;
          if (c < bestCost) {
            bestCost = c;
            parent = i;
          }
        }
      }
    }
    const newIdx = nodes.length;
    nodes.push({ x: nx, y: ny, parent, cost: bestCost });
    if (rewire) {
      // rewire the neighborhood through the new node where it's cheaper
      for (let i = 0; i < nodes.length - 1; i++) {
        const d = Math.hypot(nodes[i].x - nx, nodes[i].y - ny);
        if (d <= radius && !hit(nx, ny, nodes[i].x, nodes[i].y)) {
          if (bestCost + d < nodes[i].cost - 1e-6) {
            nodes[i].parent = newIdx;
            nodes[i].cost = bestCost + d;
            rewires++;
          }
        }
      }
    }
    if (Math.hypot(nx - goal.x, ny - goal.y) < 24) {
      if (!rewire) {
        if (frozen < 0) frozen = newIdx; // RRT freezes its first path
      } else if (bestGoal < 0 || nodes[newIdx].cost < nodes[bestGoal].cost) {
        bestGoal = newIdx;
      }
    }
  }
  const goalIdx = rewire ? bestGoal : frozen;
  const { path, len } = goalIdx >= 0 ? pathOf(nodes, goalIdx) : { path: [] as Node4[], len: NaN };
  return { nodes, path, len, rewires };
}

export function RbRrtVsRrtStar() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [iter, setIter] = useState(0);
  const [goal, setGoal] = useState({ x: 300, y: 150 }); // panel-local coords
  const [goalDraft, setGoalDraft] = useState<{ x: number; y: number } | null>(null);
  const [, setAcc] = useState(0);

  useRafLoop(
    (dt) => {
      setAcc((a) => {
        const next = a + dt * 40; // ~40 iters/sec
        const adv = Math.floor(next);
        if (adv > 0) setIter((c) => Math.min(N_6_4, c + adv));
        return next - adv;
      });
    },
    { playing: playing && inView && !reduced && iter < N_6_4 },
  );

  const upto = reduced ? N_6_4 : iter;
  const left = useMemo(() => treeAt(false, upto, goal), [upto, goal]);
  const right = useMemo(() => treeAt(true, upto, goal), [upto, goal]);

  const shownGoal = goalDraft ?? goal;

  const onMove = (e: ReactPointerEvent<SVGElement>) => {
    if (!goalDraft) return;
    const [sx, sy] = svgPoint(e);
    const lx = sx >= 372 ? sx - 372 : sx - 12;
    setGoalDraft({ x: clamp(lx, 28, PW_6_4 - 20), y: clamp(sy - OY_6_4, 22, PH_6_4 - 16) });
  };
  const endDrag = () => {
    if (goalDraft) {
      setGoal(goalDraft); // recompute both trees deterministically on drop
      setGoalDraft(null);
    }
  };

  const panel = (
    data: { nodes: Node4[]; path: Node4[]; len: number },
    ox: number,
    label: string,
  ) => (
    <g>
      <text x={ox + PW_6_4 / 2} y={88} textAnchor="middle" fontFamily={MONO} fontSize={13.5} fill={R.ink} fontWeight={600}>
        {label}
      </text>
      {OBST_6_4.map((o, i) => (
        <rect key={i} x={ox + o.x} y={o.y + OY_6_4} width={o.w} height={o.h} rx={5} fill="#e6e6e3" stroke={R.world} strokeWidth={2} />
      ))}
      {data.nodes.map((n, i) =>
        n.parent < 0 ? null : (
          <line key={i} x1={ox + data.nodes[n.parent].x} y1={data.nodes[n.parent].y + OY_6_4} x2={ox + n.x} y2={n.y + OY_6_4} stroke={R.signal} strokeWidth={1.4} opacity={0.5} />
        ),
      )}
      {data.path.length > 1 &&
        data.path.map((n, i) =>
          i === 0 ? null : (
            <line key={`p${i}`} x1={ox + data.path[i - 1].x} y1={data.path[i - 1].y + OY_6_4} x2={ox + n.x} y2={n.y + OY_6_4} stroke={R.goal} strokeWidth={4} strokeLinecap="round" />
          ),
        )}
      <circle cx={ox + START_6_4.x} cy={START_6_4.y + OY_6_4} r={7} fill={R.plan} stroke="var(--background)" strokeWidth={2} />
      {/* goal (draggable; shared by both panels) */}
      <circle
        cx={ox + shownGoal.x}
        cy={shownGoal.y + OY_6_4}
        r={10}
        fill={R.fillGreen}
        stroke={R.goal}
        strokeWidth={2.5}
        strokeDasharray={goalDraft ? "4 3" : "none"}
        style={{ cursor: "grab" }}
        onPointerDown={(e) => {
          e.preventDefault();
          setGoalDraft(shownGoal);
        }}
      />
    </g>
  );

  const gap =
    Number.isFinite(left.len) && Number.isFinite(right.len)
      ? Math.max(0, Math.round(left.len - right.len))
      : null;

  return (
    <Stage
      innerRef={ref}
      title="Fig 6.4 · RRT vs RRT*: jagged vs smooth"
      ariaLabel={`RRT keeps its first found path of length ${Number.isFinite(left.len) ? Math.round(left.len) : "unknown"} while RRT* rewires ${right.rewires} times down to length ${Number.isFinite(right.len) ? Math.round(right.len) : "unknown"} at iteration ${upto}`}
      svgProps={{
        onPointerMove: onMove,
        onPointerUp: endDrag,
        onPointerLeave: endDrag,
      }}
      controls={
        <>
          <Transport
            playing={playing}
            onPlay={toggle}
            onStep={() => setIter((c) => Math.min(N_6_4, c + 5))}
            onReset={() => {
              setIter(0);
              setAcc(0);
            }}
          />
          <Slider label="iterations" min={0} max={N_6_4} value={reduced ? N_6_4 : iter} onChange={setIter} />
          <span className="font-mono text-[13px] text-[var(--muted)]">iter {upto} / {N_6_4} · drag the goal</span>
        </>
      }
    >
      <Readout
        x={24}
        y={20}
        rows={[
          {
            label: "RRT length",
            value: Number.isFinite(left.len) ? `${Math.round(left.len)} px` : "—",
            color: R.plan,
          },
          {
            label: "RRT* length",
            value: Number.isFinite(right.len) ? `${Math.round(right.len)} px` : "—",
            color: R.goal,
          },
          { label: "rewires", value: `${right.rewires}`, color: R.signal },
        ]}
      />
      <Legend
        x={540}
        y={20}
        items={[
          { color: R.signal, label: "tree edge" },
          { color: R.goal, label: "best path" },
        ]}
      />
      {panel(left, 12, "RRT (first path, frozen)")}
      {panel(right, 372, "RRT* (keeps rewiring)")}
      <line x1={360} y1={80} x2={360} y2={OY_6_4 + PH_6_4} stroke={R.line} strokeWidth={1.5} strokeDasharray="4 6" />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12.5} fill={gap !== null ? R.error : R.world}>
        {gap !== null
          ? `same samples, same map — rewiring alone made the path ${gap} px shorter`
          : "same seeded samples feed both trees; only RRT* re-parents nodes"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 6.5 · Global route, local dodge  (honest two-layer simulation)
// The global layer runs real A* over a coarse grid of the known walls (then
// line-of-sight shortcutting). The local layer is a real Dynamic Window
// Approach: every tick it samples only the (v, ω) pairs reachable under the
// robot's acceleration limits, forward-simulates each arc, scores heading /
// clearance / speed, and drives the winner. Drag the person onto the route
// and watch the window's feasible arcs reroute the robot.
// ===========================================================================

const WALLS_6_5: Rect[] = [
  { x: 150, y: 118, w: 170, h: 44 },
  { x: 330, y: 205, w: 190, h: 44 },
];
const START_6_5 = { x: 64, y: 388 };
const GOAL_6_5 = { x: 656, y: 128 };
const ROBOT_R = 11;
const PERSON_R = 14;
const INFLATE_6_5 = ROBOT_R + 4;
const BOUNDS_6_5 = { x0: 28, y0: 66, x1: 692, y1: 414 };

// --- global planner: A* on a coarse grid over the walls, then shortcutting --
function planGlobal(): { x: number; y: number }[] {
  const cs = 20;
  const x0 = 30;
  const y0 = 70;
  const cols = 33;
  const rows = 17;
  const blocked = (i: number, j: number) =>
    WALLS_6_5.some((w) => distRect(x0 + i * cs, y0 + j * cs, w) <= INFLATE_6_5);
  const toCell = (p: { x: number; y: number }): [number, number] => [
    clamp(Math.round((p.x - x0) / cs), 0, cols - 1),
    clamp(Math.round((p.y - y0) / cs), 0, rows - 1),
  ];
  const [sx, sy] = toCell(START_6_5);
  const [gx, gy] = toCell(GOAL_6_5);
  const key = (i: number, j: number) => `${i},${j}`;
  const g = new Map<string, number>([[key(sx, sy), 0]]);
  const parent = new Map<string, string>();
  const closed = new Set<string>();
  const open: [number, number][] = [[sx, sy]];
  const h = (i: number, j: number) => Math.hypot(i - gx, j - gy);
  while (open.length) {
    let bi = 0;
    let bf = Infinity;
    for (let i = 0; i < open.length; i++) {
      const [ci, cj] = open[i];
      const f = (g.get(key(ci, cj)) ?? Infinity) + h(ci, cj);
      if (f < bf - 1e-9) {
        bf = f;
        bi = i;
      }
    }
    const [ci, cj] = open.splice(bi, 1)[0];
    const ck = key(ci, cj);
    if (closed.has(ck)) continue;
    closed.add(ck);
    if (ci === gx && cj === gy) break;
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        if (di === 0 && dj === 0) continue;
        const ni = ci + di;
        const nj = cj + dj;
        if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue;
        if (blocked(ni, nj) || closed.has(key(ni, nj))) continue;
        const ng = (g.get(ck) ?? Infinity) + Math.hypot(di, dj);
        if (ng < (g.get(key(ni, nj)) ?? Infinity)) {
          g.set(key(ni, nj), ng);
          parent.set(key(ni, nj), ck);
          open.push([ni, nj]);
        }
      }
    }
  }
  // recover cell path
  const cells: [number, number][] = [];
  let cur = key(gx, gy);
  if (!closed.has(cur)) return [START_6_5, GOAL_6_5];
  while (cur) {
    const [i, j] = cur.split(",").map(Number);
    cells.push([i, j]);
    const p = parent.get(cur);
    if (!p) break;
    cur = p;
  }
  cells.reverse();
  const raw = [
    START_6_5,
    ...cells.map(([i, j]) => ({ x: x0 + i * cs, y: y0 + j * cs })),
    GOAL_6_5,
  ];
  // line-of-sight shortcutting against the same inflated walls
  const clear = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(2, Math.ceil(d / 10));
    for (let s = 0; s <= n; s++) {
      const px = lerp(a.x, b.x, s / n);
      const py = lerp(a.y, b.y, s / n);
      if (WALLS_6_5.some((w) => distRect(px, py, w) < INFLATE_6_5)) return false;
    }
    return true;
  };
  const out = [raw[0]];
  let i = 0;
  while (i < raw.length - 1) {
    let j = raw.length - 1;
    while (j > i + 1 && !clear(raw[i], raw[j])) j--;
    out.push(raw[j]);
    i = j;
  }
  return out;
}

type Rob = { x: number; y: number; th: number; v: number; w: number; done: boolean };
type Cand = { v: number; w: number; pts: [number, number][]; blocked: boolean; score: number };

const V_MAX = 110;
const A_V = 140; // px/s²
const W_MAX = 2.6;
const A_W = 8; // rad/s²
const DT_WIN = 0.35; // the "next instant" the window covers
const T_SIM = 1.1;
const SIM_STEPS = 8;

// Closest arc-length parameter of point p along the route polyline.
function routeParam(
  route: { x: number; y: number }[],
  cum: number[],
  px: number,
  py: number,
) {
  let bestS = 0;
  let bestD = Infinity;
  for (let i = 0; i < route.length - 1; i++) {
    const ax = route[i].x;
    const ay = route[i].y;
    const bx = route[i + 1].x;
    const by = route[i + 1].y;
    const L = Math.hypot(bx - ax, by - ay) || 1;
    const t = clamp(((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / (L * L), 0, 1);
    const qx = ax + t * (bx - ax);
    const qy = ay + t * (by - ay);
    const d = Math.hypot(px - qx, py - qy);
    if (d < bestD) {
      bestD = d;
      bestS = cum[i] + t * L;
    }
  }
  return bestS;
}

function routePoint(route: { x: number; y: number }[], cum: number[], s: number) {
  const total = cum[cum.length - 1];
  const sc = clamp(s, 0, total);
  for (let i = 0; i < route.length - 1; i++) {
    if (sc <= cum[i + 1]) {
      const L = cum[i + 1] - cum[i] || 1;
      const t = (sc - cum[i]) / L;
      return { x: lerp(route[i].x, route[i + 1].x, t), y: lerp(route[i].y, route[i + 1].y, t) };
    }
  }
  return route[route.length - 1];
}

// One honest DWA evaluation: reachable (v, ω) set → simulated arcs → scores.
// Each arc is scored on route progress (arc length gained), heading toward a
// lookahead just past the arc's end, clearance, and speed.
function dwa(
  rob: Rob,
  person: { x: number; y: number },
  route: { x: number; y: number }[],
  cum: number[],
): { cands: Cand[]; best: number; look: { x: number; y: number } } {
  const sNow = routeParam(route, cum, rob.x, rob.y);
  const goal = route[route.length - 1];
  const dGoalNow = Math.hypot(rob.x - goal.x, rob.y - goal.y);
  // far from the goal, progress = arc length gained along the route (lets
  // sideways dodges still count); on final approach, progress = straight-line
  // closure on the goal so the robot rolls onto it instead of stalling short.
  const nearGoal = dGoalNow < 140;
  const look = routePoint(route, cum, sNow + 60); // for display / recovery
  const cands: Cand[] = [];
  const vLo = Math.max(0, rob.v - A_V * DT_WIN);
  const vHi = Math.min(V_MAX, rob.v + A_V * DT_WIN);
  const wLo = Math.max(-W_MAX, rob.w - A_W * DT_WIN);
  const wHi = Math.min(W_MAX, rob.w + A_W * DT_WIN);
  let best = -1;
  let bestScore = -Infinity;
  for (let iv = 0; iv < 4; iv++) {
    for (let iw = 0; iw < 9; iw++) {
      const v = lerp(vLo, vHi, iv / 3);
      const w = lerp(wLo, wHi, iw / 8);
      // forward-simulate the arc
      let x = rob.x;
      let y = rob.y;
      let th = rob.th;
      const pts: [number, number][] = [];
      let minClear = Infinity;
      let blockedArc = false;
      const dt = T_SIM / SIM_STEPS;
      for (let s = 0; s < SIM_STEPS; s++) {
        th += w * dt;
        x += v * Math.cos(th) * dt;
        y += v * Math.sin(th) * dt;
        const wallD = Math.min(...WALLS_6_5.map((o) => distRect(x, y, o))) - ROBOT_R;
        const personD = Math.hypot(x - person.x, y - person.y) - PERSON_R - ROBOT_R;
        const boundD = Math.min(x - BOUNDS_6_5.x0, BOUNDS_6_5.x1 - x, y - BOUNDS_6_5.y0, BOUNDS_6_5.y1 - y);
        minClear = Math.min(minClear, wallD, personD, boundD);
        pts.push([x, y]);
        if (minClear < 2) {
          blockedArc = true;
          break; // truncate at the collision — the arc is infeasible past here
        }
      }
      let score = -Infinity;
      if (!blockedArc) {
        const end = pts[pts.length - 1] ?? [rob.x, rob.y];
        const sEnd = routeParam(route, cum, end[0], end[1]);
        const gained = nearGoal
          ? dGoalNow - Math.hypot(end[0] - goal.x, end[1] - goal.y)
          : sEnd - sNow;
        const progress = clamp(gained, 0, V_MAX * T_SIM) / (V_MAX * T_SIM);
        const ahead = routePoint(route, cum, sEnd + 60);
        const dLook = Math.hypot(ahead.x - end[0], ahead.y - end[1]);
        const angErr =
          dLook < 1 ? 0 : Math.abs(angNorm(Math.atan2(ahead.y - end[1], ahead.x - end[0]) - th));
        const headScore = 1 - angErr / Math.PI;
        const clearScore = clamp(minClear, 0, 40) / 40;
        const velScore = v / V_MAX;
        score =
          (nearGoal ? 3.2 : 1.6) * progress + 1.2 * headScore + 1.0 * clearScore + 0.3 * velScore;
        if (score > bestScore) {
          bestScore = score;
          best = cands.length;
        }
      }
      cands.push({ v, w, pts, blocked: blockedArc, score });
    }
  }
  return { cands, best, look };
}

function stepRobot(
  rob: Rob,
  person: { x: number; y: number },
  route: { x: number; y: number }[],
  cum: number[],
  dt: number,
): Rob {
  if (rob.done) return rob;
  if (Math.hypot(rob.x - GOAL_6_5.x, rob.y - GOAL_6_5.y) < 21) {
    return { ...rob, v: 0, w: 0, done: true };
  }
  const { cands, best, look } = dwa(rob, person, route, cum);
  let v: number;
  let w: number;
  if (best >= 0) {
    v = cands[best].v;
    w = cands[best].w;
  } else {
    // recovery: brake and rotate toward the lookahead
    const angErr = angNorm(Math.atan2(look.y - rob.y, look.x - rob.x) - rob.th);
    v = Math.max(0, rob.v - A_V * dt);
    w = Math.sign(angErr) * 1.4;
  }
  const th = rob.th + w * dt;
  const x = clamp(rob.x + v * Math.cos(th) * dt, BOUNDS_6_5.x0 + ROBOT_R, BOUNDS_6_5.x1 - ROBOT_R);
  const y = clamp(rob.y + v * Math.sin(th) * dt, BOUNDS_6_5.y0 + ROBOT_R, BOUNDS_6_5.y1 - ROBOT_R);
  return { x, y, th, v, w, done: false };
}

const ROB_INIT: Rob = { x: START_6_5.x, y: START_6_5.y, th: -0.5, v: 0, w: 0, done: false };

export function RbGlobalLocal() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [speed, setSpeed] = useState(1);
  const [showFan, setShowFan] = useState(true);
  const [person, setPerson] = useState({ x: 250, y: 345 });
  const [drag, setDrag] = useState(false);
  const [rob, setRob] = useState<Rob>(ROB_INIT);
  const [trail, setTrail] = useState<[number, number][]>([[START_6_5.x, START_6_5.y]]);

  // the global plan: real A* + shortcutting over the known walls, computed once
  const route = useMemo(() => planGlobal(), []);
  const cum = useMemo(() => {
    const c = [0];
    for (let i = 1; i < route.length; i++) {
      c.push(c[i - 1] + Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y));
    }
    return c;
  }, [route]);

  const advance = (dt: number) => {
    setRob((r) => {
      const nr = stepRobot(r, person, route, cum, dt);
      setTrail((t) => {
        const last = t[t.length - 1];
        if (Math.hypot(nr.x - last[0], nr.y - last[1]) > 4) {
          const nt = [...t, [nr.x, nr.y] as [number, number]];
          return nt.length > 300 ? nt.slice(nt.length - 300) : nt;
        }
        return t;
      });
      return nr;
    });
  };

  useRafLoop((dt) => advance(Math.min(dt, 0.05) * speed), {
    playing: playing && inView && !reduced && !rob.done,
  });

  const resetRun = () => {
    setRob(ROB_INIT);
    setTrail([[START_6_5.x, START_6_5.y]]);
  };

  const onMove = (e: ReactPointerEvent<SVGElement>) => {
    if (!drag) return;
    const [x, y] = svgPoint(e);
    setPerson({ x: clamp(x, 46, 674), y: clamp(y, 86, 396) });
  };

  // Reduced motion: run the exact same simulation for up to 12 s
  // deterministically and show the resulting snapshot (honest, not animated).
  const reducedRun = useMemo(() => {
    if (!reduced) return null;
    const t: [number, number][] = [[START_6_5.x, START_6_5.y]];
    const acc = { r: ROB_INIT };
    for (let i = 0; i < 360 && !acc.r.done; i++) {
      acc.r = stepRobot(acc.r, person, route, cum, 1 / 30);
      const last = t[t.length - 1];
      if (Math.hypot(acc.r.x - last[0], acc.r.y - last[1]) > 4) t.push([acc.r.x, acc.r.y]);
    }
    return { rob: acc.r, trail: t };
  }, [reduced, person, route, cum]);

  const robot = reducedRun ? reducedRun.rob : rob;
  const shownTrail = reducedRun ? reducedRun.trail : trail;

  // the fan is a pure function of (robot, person): recompute for rendering
  const fan = robot.done ? null : dwa(robot, person, route, cum);
  const kept = fan ? fan.cands.filter((c) => !c.blocked).length : 0;

  return (
    <Stage
      innerRef={ref}
      title="Fig 6.5 · Global route, local dodge"
      ariaLabel={`A robot driving a global A-star route at ${Math.round(robot.v)} px/s while a real dynamic-window planner simulates ${fan ? fan.cands.length : 0} candidate arcs and dodges a draggable person`}
      svgProps={{
        onPointerMove: onMove,
        onPointerUp: () => setDrag(false),
        onPointerLeave: () => setDrag(false),
      }}
      controls={
        <>
          <Transport playing={playing} onPlay={toggle} onStep={() => advance(1 / 30)} stepLabel="tick" onReset={resetRun} />
          <Btn onClick={() => setShowFan((v) => !v)} active={showFan}>
            {showFan ? "✓ velocity fan" : "show velocity fan"}
          </Btn>
          <Slider label="speed" min={0.25} max={2.5} step={0.25} value={speed} onChange={setSpeed} fmt={(v) => `${v}×`} />
          <span className="font-mono text-[13px] text-[var(--muted)]">drag the person</span>
        </>
      }
    >
      <Readout
        x={24}
        y={20}
        rows={[
          { label: "v", value: `${Math.round(robot.v)} px/s`, color: R.signal },
          { label: "ω", value: `${robot.w.toFixed(2)} rad/s`, color: R.signal },
          {
            label: "feasible arcs",
            value: fan ? `${kept} / ${fan.cands.length}` : "goal reached",
            color: fan ? R.ink : R.goal,
          },
        ]}
      />
      <Legend
        x={524}
        y={20}
        items={[
          { color: R.plan, label: "global route", dash: true },
          { color: R.signal, label: "driven path" },
          { color: R.goal, label: "best arc" },
          { color: R.error, label: "person" },
        ]}
      />

      {/* known map walls */}
      {WALLS_6_5.map((o, i) => (
        <rect key={i} x={o.x} y={o.y} width={o.w} height={o.h} rx={5} fill="#e6e6e3" stroke={R.world} strokeWidth={2} />
      ))}

      {/* the amber global route (real A* output) */}
      <polyline
        points={route.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke={R.plan}
        strokeWidth={3}
        strokeDasharray="7 6"
        opacity={0.9}
      />
      <circle cx={START_6_5.x} cy={START_6_5.y} r={7} fill={R.plan} />
      <text x={START_6_5.x + 4} y={START_6_5.y + 24} fontFamily={MONO} fontSize={12} fill={R.plan}>start</text>
      <circle cx={GOAL_6_5.x} cy={GOAL_6_5.y} r={11} fill={R.fillGreen} stroke={R.goal} strokeWidth={3} />
      <text x={GOAL_6_5.x} y={GOAL_6_5.y - 18} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>goal</text>

      {/* the driven path: what the local planner actually executed */}
      {shownTrail.length > 1 && (
        <polyline
          points={shownTrail.map((p) => `${p[0]},${p[1]}`).join(" ")}
          fill="none"
          stroke={R.signal}
          strokeWidth={2.5}
          opacity={0.8}
        />
      )}

      {/* DWA candidate arcs, truncated where they collide */}
      {showFan &&
        fan &&
        fan.cands.map((c, i) =>
          c.pts.length < 2 ? null : (
            <polyline
              key={i}
              points={c.pts.map((p) => `${p[0]},${p[1]}`).join(" ")}
              fill="none"
              stroke={c.blocked ? R.error : i === fan.best ? R.goal : R.line}
              strokeWidth={i === fan.best ? 3 : 1.2}
              opacity={c.blocked ? 0.3 : i === fan.best ? 0.95 : 0.55}
            />
          ),
        )}

      {/* the person (dynamic obstacle, unknown to the global plan) */}
      <circle cx={person.x} cy={person.y} r={PERSON_R + ROBOT_R} fill="none" stroke={R.error} strokeWidth={1.2} strokeDasharray="4 4" opacity={0.6} />
      <circle
        cx={person.x}
        cy={person.y}
        r={PERSON_R}
        fill={R.fillRed}
        stroke={R.error}
        strokeWidth={3}
        style={{ cursor: "grab" }}
        onPointerDown={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
      />
      <text x={person.x} y={person.y + PERSON_R + 16} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.error}>person</text>

      {/* the robot */}
      <circle cx={robot.x} cy={robot.y} r={ROBOT_R} fill={R.fillBlue} stroke={R.signal} strokeWidth={3} />
      {svgArrow(robot.x, robot.y, robot.x + Math.cos(robot.th) * 24, robot.y + Math.sin(robot.th) * 24, R.signal, 2.5, 8)}

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12.5} fill={robot.done ? R.goal : R.world}>
        {robot.done
          ? "goal reached — the route was planned once; every dodge was the window's choice"
          : "the window holds only velocities reachable this instant — drag the person onto the route"}
      </text>
    </Stage>
  );
}
