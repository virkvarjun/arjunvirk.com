"use client";

import { useMemo, useReducer, useState } from "react";
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
} from "./shared";

// ===========================================================================
// Fig 6.1 · Shrink the robot, grow the obstacles  (draggable field + slider)
// Left: a workspace with a draggable disk robot near two polygonal obstacles.
// Right: the same scene in C-space where the robot is a point and every
// obstacle is inflated (Minkowski) by the robot's radius. Growing the radius
// visibly fattens the red C-obstacles and shrinks the green free space.
// ===========================================================================

// Two obstacles, given as axis-aligned-ish rectangles in workspace coords.
const OBS_6_1 = [
  { x: 70, y: 70, w: 70, h: 130 },
  { x: 95, y: 250, w: 130, h: 90 },
];
// Left panel origin box: 30..330 x, 40..400 y. Right panel offset by +360 in x.
const PANEL_DX = 360;

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
    setPos({ x: clamp(x, 34, 326), y: clamp(y, 44, 396) });
  };

  const reset = () => {
    setRadius(26);
    setPos({ x: 250, y: 210 });
  };

  // Is the robot center inside an inflated obstacle? (point-vs-region test)
  const inside = OBS_6_1.some(
    (o) =>
      pos.x > o.x - r &&
      pos.x < o.x + o.w + r &&
      pos.y > o.y - r &&
      pos.y < o.y + o.h + r,
  );

  const cfg = { x: pos.x + PANEL_DX, y: pos.y };

  return (
    <Stage
      innerRef={ref}
      title="Fig 6.1 · Shrink the robot, grow the obstacles"
      ariaLabel={`A disk robot of radius ${Math.round(r)} in a workspace, shown as a single point in configuration space where obstacles are inflated by the robot's radius`}
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
      {/* panel labels + divider */}
      <text x={180} y={30} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={R.world}>
        workspace
      </text>
      <text x={540} y={30} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={R.world}>
        configuration space
      </text>
      <line x1={352} y1={30} x2={352} y2={412} stroke={R.line} strokeWidth={1.5} strokeDasharray="4 6" />

      {/* RIGHT panel: green free space backdrop, then red inflated C-obstacles */}
      <rect x={30 + PANEL_DX} y={40} width={300} height={372} rx={6} fill={R.fillGreen} opacity={0.45} />
      {OBS_6_1.map((o, i) => (
        <rect
          key={`ci${i}`}
          x={o.x - r + PANEL_DX}
          y={o.y - r}
          width={o.w + 2 * r}
          height={o.h + 2 * r}
          rx={r * 0.5}
          fill={R.fillRed}
          stroke={R.error}
          strokeWidth={2}
        />
      ))}
      {/* the original obstacle outline inside the inflated region, for reference */}
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
      <rect x={30 + PANEL_DX} y={40} width={300} height={372} rx={6} fill="none" stroke={R.line} strokeWidth={2} />
      {/* the robot as a single point */}
      <circle cx={cfg.x} cy={cfg.y} r={5.5} fill={R.signal} stroke="var(--background)" strokeWidth={1.5} />
      <text x={cfg.x} y={cfg.y - 12} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={inside ? R.error : R.signal}>
        {inside ? "in C-obstacle" : "the robot, a point"}
      </text>

      {/* LEFT panel: grey original obstacles + draggable disk robot */}
      <rect x={30} y={40} width={300} height={372} rx={6} fill="none" stroke={R.line} strokeWidth={2} />
      {OBS_6_1.map((o, i) => (
        <rect key={`o${i}`} x={o.x} y={o.y} width={o.w} height={o.h} rx={4} fill="#e6e6e3" stroke={R.world} strokeWidth={2} />
      ))}
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

      {/* fixed readout lane, bottom */}
      <text x={30} y={430} fontFamily={MONO} fontSize={13} fill={R.world}>
        a bigger robot fattens every C-obstacle and shrinks the green free space
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 6.2 · Dijkstra vs A*: watch A* aim  (toggle-compare stepper)
// Two identical grid mazes, same start/goal/obstacles. Dijkstra (left) and A*
// (right) expand one cell per step. Live "cells expanded" counters diverge; the
// final path lights when the goal is popped. Both searches are precomputed
// deterministically so play / step / reset replay identically.
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

type SearchTrace = { order: [number, number][]; path: [number, number][] };

// Run a uniform-cost search with a heuristic weight (0 = Dijkstra, 1 = A*).
// Returns the expansion order and the recovered path — fully deterministic.
function runSearch(useHeuristic: boolean): SearchTrace {
  const key = (x: number, y: number) => `${x},${y}`;
  const h = (x: number, y: number) =>
    useHeuristic ? Math.abs(x - GOAL_6_2[0]) + Math.abs(y - GOAL_6_2[1]) : 0;
  const g = new Map<string, number>();
  const parent = new Map<string, string>();
  const order: [number, number][] = [];
  const closed = new Set<string>();
  g.set(key(...START_6_2), 0);
  // open list as an array we scan for the min-f (small grid; deterministic).
  const open: [number, number][] = [START_6_2];
  const dirs: [number, number][] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (open.length) {
    // pick smallest f; tie-break by insertion order (stable) then h.
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
    order.push([cx, cy]);
    if (cx === GOAL_6_2[0] && cy === GOAL_6_2[1]) break;
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= GRID_6_2.cols || ny >= GRID_6_2.rows) continue;
      const nk = key(nx, ny);
      if (OBST_6_2.has(nk) || closed.has(nk)) continue;
      const ng = (g.get(ck) ?? Infinity) + 1;
      if (ng < (g.get(nk) ?? Infinity)) {
        g.set(nk, ng);
        parent.set(nk, ck);
        open.push([nx, ny]);
      }
    }
  }
  // recover path
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
  return { order, path };
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
  const total = Math.max(dij.order.length, astar.order.length);

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

  const renderGrid = (trace: SearchTrace, ox: number, label: string) => {
    const expanded = new Set<string>();
    for (let i = 0; i < Math.min(shown, trace.order.length); i++) {
      const [x, y] = trace.order[i];
      expanded.add(`${x},${y}`);
    }
    const done = shown >= trace.order.length;
    const frontier =
      shown > 0 && shown <= trace.order.length ? trace.order[shown - 1] : null;
    const pathSet = new Set(done ? trace.path.map(([x, y]) => `${x},${y}`) : []);
    const cells: React.ReactNode[] = [];
    for (let y = 0; y < GRID_6_2.rows; y++) {
      for (let x = 0; x < GRID_6_2.cols; x++) {
        const kk = `${x},${y}`;
        const px = ox + x * cell;
        const py = 48 + y * cell;
        const isObst = OBST_6_2.has(kk);
        const isStart = x === START_6_2[0] && y === START_6_2[1];
        const isGoal = x === GOAL_6_2[0] && y === GOAL_6_2[1];
        const onPath = pathSet.has(kk);
        const exp = expanded.has(kk);
        let fill = "var(--background)";
        if (isObst) fill = R.fillRed;
        else if (onPath) fill = R.fillGreen;
        else if (isStart) fill = R.fillAmber;
        else if (isGoal) fill = R.fillGreen;
        else if (exp) fill = "#e7e7e4";
        cells.push(
          <rect key={kk} x={px} y={py} width={cell} height={cell} fill={fill} stroke={R.line} strokeWidth={0.8} />,
        );
        if (isStart)
          cells.push(
            <text key={`${kk}S`} x={px + cell / 2} y={py + cell / 2 + 5} textAnchor="middle" fontFamily={MONO} fontSize={13} fontWeight={600} fill={R.plan}>S</text>,
          );
        if (isGoal)
          cells.push(
            <text key={`${kk}G`} x={px + cell / 2} y={py + cell / 2 + 5} textAnchor="middle" fontFamily={MONO} fontSize={13} fontWeight={600} fill={R.goal}>G</text>,
          );
      }
    }
    if (frontier && !done) {
      const [fx, fy] = frontier;
      cells.push(
        <rect key="fr" x={ox + fx * cell} y={48 + fy * cell} width={cell} height={cell} fill="none" stroke={R.signal} strokeWidth={3} />,
      );
    }
    return (
      <g>
        <text x={ox + gw / 2} y={38} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={R.ink} fontWeight={600}>
          {label}
        </text>
        {cells}
        <text x={ox} y={48 + gh + 22} fontFamily={MONO} fontSize={13} fill={R.world}>
          cells expanded:{" "}
          <tspan fill={R.signal} fontWeight={600}>
            {Math.min(shown, trace.order.length)}
          </tspan>
        </text>
      </g>
    );
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 6.2 · Dijkstra vs A*: watch A* aim"
      ariaLabel={`Two grid searches side by side: Dijkstra expanded ${Math.min(shown, dij.order.length)} cells, A* expanded ${Math.min(shown, astar.order.length)} cells`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Btn onClick={() => setK((c) => Math.min(total, c + 1))} title="one expansion">
            ⏭ step
          </Btn>
          <Btn
            onClick={() => {
              setK(0);
              setAcc(0);
            }}
          >
            ↺ reset
          </Btn>
          <Slider label="speed" min={0.25} max={3} step={0.25} value={speed} onChange={setSpeed} fmt={(v) => `${v}×`} />
          <span className="font-mono text-[13px] text-[var(--muted)]">
            step {Math.min(shown, total)} / {total}
          </span>
        </>
      }
    >
      {renderGrid(dij, 24, "Dijkstra (h=0)")}
      {renderGrid(astar, 24 + gw + 40, "A* (h=Manhattan)")}
      {reduced && (
        <text x={24} y={434} fontFamily={MONO} fontSize={13} fill={R.world}>
          Reduced motion: both searches shown fully expanded with their final paths.
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 6.3 · RRT: a tree reaching for the goal  (stepper on a field)
// A tree grows from the start toward seeded random samples, one extend per
// step, curving around C-obstacles. Goal-bias slider tugs it toward the goal;
// a nonholonomic toggle makes edges car-like arcs. Sampling is seeded so reset
// replays the exact same growth.
// ===========================================================================

const OBST_6_3 = [
  { x: 210, y: 60, w: 60, h: 180 },
  { x: 360, y: 200, w: 190, h: 60 },
  { x: 250, y: 320, w: 60, h: 90 },
];
const START_6_3 = { x: 70, y: 380 };
const GOAL_6_3 = { x: 620, y: 90 };
const GOAL_R_6_3 = 34;
const STEP_6_3 = 34; // extension length

function segHitsObstacle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  obs: { x: number; y: number; w: number; h: number }[],
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

export function RbRrtGrowth() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [goalBias, setGoalBias] = useState(0.1);
  const [nonholo, setNonholo] = useState(false);
  const [, setAcc] = useState(0);
  // tree, deterministic PRNG state, a "last rejected" flash, and the step index.
  const [state, setState] = useState<{
    nodes: TreeNode[];
    step: number;
    reached: number | null;
    reject: { x: number; y: number } | null;
    sample: { x: number; y: number } | null;
  }>({
    nodes: [{ x: START_6_3.x, y: START_6_3.y, parent: -1, h: 0 }],
    step: 0,
    reached: null,
    reject: null,
    sample: null,
  });

  // One RRT extension. Deterministic: PRNG re-seeded from (step) each call, so
  // reset (step→0) replays the identical sequence and slider changes are stable.
  const extend = () => {
    setState((s) => {
      if (s.reached !== null) return s;
      const rng = mulberry32(0x6a3d + s.step * 2654435761);
      // sample (goal-biased)
      let sx: number;
      let sy: number;
      if (rng() < goalBias) {
        sx = GOAL_6_3.x;
        sy = GOAL_6_3.y;
      } else {
        sx = 40 + rng() * 620;
        sy = 40 + rng() * 360;
      }
      // nearest node
      let ni = 0;
      let nd = Infinity;
      for (let i = 0; i < s.nodes.length; i++) {
        const d = Math.hypot(s.nodes[i].x - sx, s.nodes[i].y - sy);
        if (d < nd) {
          nd = d;
          ni = i;
        }
      }
      const near = s.nodes[ni];
      const ang = Math.atan2(sy - near.y, sx - near.x);
      let hNew: number;
      let nx: number;
      let ny: number;
      if (nonholo) {
        // car-like: bounded turn from the parent's heading, then drive.
        const maxTurn = 0.6;
        let dh = ((ang - near.h + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        dh = clamp(dh, -maxTurn, maxTurn);
        hNew = near.h + dh;
        nx = near.x + Math.cos(hNew) * STEP_6_3;
        ny = near.y + Math.sin(hNew) * STEP_6_3;
      } else {
        hNew = ang;
        nx = near.x + Math.cos(ang) * STEP_6_3;
        ny = near.y + Math.sin(ang) * STEP_6_3;
      }
      nx = clamp(nx, 30, 670);
      ny = clamp(ny, 30, 410);
      const step = s.step + 1;
      if (segHitsObstacle(near.x, near.y, nx, ny, OBST_6_3)) {
        return { ...s, step, reject: { x: nx, y: ny }, sample: { x: sx, y: sy } };
      }
      const nodes = [...s.nodes, { x: nx, y: ny, parent: ni, h: hNew }];
      const reached =
        Math.hypot(nx - GOAL_6_3.x, ny - GOAL_6_3.y) < GOAL_R_6_3 ? nodes.length - 1 : null;
      return { nodes, step, reached, reject: null, sample: { x: sx, y: sy } };
    });
  };

  useRafLoop(
    (dt) => {
      setAcc((a) => {
        const next = a + dt / 0.7; // ~one extend per 700ms
        if (next >= 1) {
          extend();
          return next - 1;
        }
        return next;
      });
    },
    { playing: playing && inView && !reduced && state.reached === null },
  );

  const reset = () =>
    setState({
      nodes: [{ x: START_6_3.x, y: START_6_3.y, parent: -1, h: 0 }],
      step: 0,
      reached: null,
      reject: null,
      sample: null,
    });

  // recover solution path if reached
  const solPath: TreeNode[] = [];
  if (state.reached !== null) {
    let idx: number = state.reached;
    while (idx >= 0) {
      solPath.push(state.nodes[idx]);
      idx = state.nodes[idx].parent;
    }
  }

  // Under reduced motion, run the whole search once so the figure is complete.
  const displayNodes = useMemo(() => {
    if (!reduced) return null;
    let nodes: TreeNode[] = [{ x: START_6_3.x, y: START_6_3.y, parent: -1, h: 0 }];
    let reached: number | null = null;
    for (let step = 0; step < 600 && reached === null; step++) {
      const rng = mulberry32(0x6a3d + step * 2654435761);
      let sx: number;
      let sy: number;
      if (rng() < goalBias) {
        sx = GOAL_6_3.x;
        sy = GOAL_6_3.y;
      } else {
        sx = 40 + rng() * 620;
        sy = 40 + rng() * 360;
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
      let hNew = ang;
      let nx = near.x + Math.cos(ang) * STEP_6_3;
      let ny = near.y + Math.sin(ang) * STEP_6_3;
      if (nonholo) {
        const maxTurn = 0.6;
        let dh = ((ang - near.h + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        dh = clamp(dh, -maxTurn, maxTurn);
        hNew = near.h + dh;
        nx = near.x + Math.cos(hNew) * STEP_6_3;
        ny = near.y + Math.sin(hNew) * STEP_6_3;
      }
      nx = clamp(nx, 30, 670);
      ny = clamp(ny, 30, 410);
      if (segHitsObstacle(near.x, near.y, nx, ny, OBST_6_3)) continue;
      nodes = [...nodes, { x: nx, y: ny, parent: ni, h: hNew }];
      if (Math.hypot(nx - GOAL_6_3.x, ny - GOAL_6_3.y) < GOAL_R_6_3) reached = nodes.length - 1;
    }
    const path: TreeNode[] = [];
    if (reached !== null) {
      let idx: number = reached;
      while (idx >= 0) {
        path.push(nodes[idx]);
        idx = nodes[idx].parent;
      }
    }
    return { nodes, path };
  }, [reduced, goalBias, nonholo]);

  const nodes = reduced && displayNodes ? displayNodes.nodes : state.nodes;
  const path = reduced && displayNodes ? displayNodes.path : solPath;

  return (
    <Stage
      innerRef={ref}
      title="Fig 6.3 · RRT: a tree reaching for the goal"
      ariaLabel={`A rapidly-exploring random tree of ${nodes.length} nodes growing from the start toward the goal, around obstacles`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Btn onClick={extend} title="one sample + extend">
            ⏭ step
          </Btn>
          <Btn onClick={reset}>↺ reset</Btn>
          <Slider label="goal bias" min={0} max={0.6} step={0.05} value={goalBias} onChange={setGoalBias} fmt={(v) => `${Math.round(v * 100)}%`} />
          <Btn onClick={() => { setNonholo((v) => !v); reset(); }} active={nonholo}>
            {nonholo ? "✓ nonholonomic" : "nonholonomic"}
          </Btn>
        </>
      }
    >
      {/* obstacles */}
      {OBST_6_3.map((o, i) => (
        <rect key={i} x={o.x} y={o.y} width={o.w} height={o.h} rx={5} fill="#e6e6e3" stroke={R.world} strokeWidth={2} />
      ))}
      {/* goal region */}
      <circle cx={GOAL_6_3.x} cy={GOAL_6_3.y} r={GOAL_R_6_3} fill={R.fillGreen} stroke={R.goal} strokeWidth={2} strokeDasharray="5 5" opacity={0.7} />
      <text x={GOAL_6_3.x} y={GOAL_6_3.y - GOAL_R_6_3 - 6} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>goal</text>

      {/* tree edges */}
      {nodes.map((n, i) =>
        n.parent < 0 ? null : (
          <line key={i} x1={nodes[n.parent].x} y1={nodes[n.parent].y} x2={n.x} y2={n.y} stroke={R.signal} strokeWidth={2} opacity={0.85} />
        ),
      )}
      {/* nodes */}
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

      {/* current sample + rejected extension (motion only) */}
      {!reduced && state.sample && (
        <circle cx={state.sample.x} cy={state.sample.y} r={5} fill="none" stroke={R.plan} strokeWidth={2} strokeDasharray="3 3" />
      )}
      {!reduced && state.reject && (
        <>
          <line x1={state.reject.x - 7} y1={state.reject.y - 7} x2={state.reject.x + 7} y2={state.reject.y + 7} stroke={R.error} strokeWidth={2.5} />
          <line x1={state.reject.x - 7} y1={state.reject.y + 7} x2={state.reject.x + 7} y2={state.reject.y - 7} stroke={R.error} strokeWidth={2.5} />
        </>
      )}

      {/* start */}
      <circle cx={START_6_3.x} cy={START_6_3.y} r={7} fill={R.plan} stroke="var(--background)" strokeWidth={2} />
      <text x={START_6_3.x} y={START_6_3.y + 24} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.plan}>start</text>

      {/* fixed readout lane */}
      <text x={24} y={30} fontFamily={MONO} fontSize={13} fill={R.world}>
        nodes: <tspan fill={R.signal} fontWeight={600}>{nodes.length}</tspan>
        {"   "}
        {state.reached !== null || (reduced && path.length > 1) ? (
          <tspan fill={R.goal} fontWeight={600}>· goal reached</tspan>
        ) : (
          <tspan fill={R.world}>· growing…</tspan>
        )}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 6.4 · RRT vs RRT*: jagged vs smooth  (toggle-compare stepper)
// Left runs RRT and freezes its first-found path (jagged). Right runs RRT* and
// keeps rewiring: scrub / play the iteration counter and its path straightens
// and its length ticks down toward optimal. Both seeded identically so the two
// share the same samples; a live path-length readout for each.
// ===========================================================================

const OBST_6_4 = [
  { x: 250, y: 70, w: 55, h: 150 },
  { x: 250, y: 260, w: 55, h: 110 },
];
const START_6_4 = { x: 60, y: 220 };
const GOAL_6_4 = { x: 320, y: 220 }; // per-panel local coords (panel width 340)

type Node4 = { x: number; y: number; parent: number; cost: number };

function pathLen(nodes: Node4[], goal: number) {
  let len = 0;
  let idx = goal;
  while (idx >= 0 && nodes[idx].parent >= 0) {
    const p = nodes[idx].parent;
    len += Math.hypot(nodes[idx].x - nodes[p].x, nodes[idx].y - nodes[p].y);
    idx = p;
  }
  return len;
}

// For scrubbing, we need the tree/path AS OF iteration `it`. Cheapest robust
// approach: rebuild deterministically up to `it`. Small N so this is fine.
function treeAt(rewire: boolean, panelW: number, panelH: number, upto: number) {
  const rng = mulberry32(0xf00d1234);
  const nodes: Node4[] = [{ x: START_6_4.x, y: START_6_4.y, parent: -1, cost: 0 }];
  const step = 30;
  const radius = 60;
  const hit = (ax: number, ay: number, bx: number, by: number) =>
    segHitsObstacle(ax, ay, bx, by, OBST_6_4);
  let bestGoal = -1;
  let frozen = -1; // RRT: freeze first path
  for (let it = 0; it < upto; it++) {
    let sx = 30 + rng() * (panelW - 40);
    let sy = 30 + rng() * (panelH - 40);
    if (rng() < 0.08) {
      sx = GOAL_6_4.x;
      sy = GOAL_6_4.y;
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
    const nx = clamp(near.x + Math.cos(ang) * step, 24, panelW - 4);
    const ny = clamp(near.y + Math.sin(ang) * step, 24, panelH - 4);
    if (hit(near.x, near.y, nx, ny)) continue;
    let parent = ni;
    let bestCost = near.cost + step;
    if (rewire) {
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
      for (let i = 0; i < nodes.length - 1; i++) {
        const d = Math.hypot(nodes[i].x - nx, nodes[i].y - ny);
        if (d <= radius && !hit(nx, ny, nodes[i].x, nodes[i].y)) {
          if (bestCost + d < nodes[i].cost - 1e-6) {
            nodes[i].parent = newIdx;
            nodes[i].cost = bestCost + d;
          }
        }
      }
    }
    if (Math.hypot(nx - GOAL_6_4.x, ny - GOAL_6_4.y) < 26) {
      if (!rewire) {
        if (frozen < 0) frozen = newIdx; // RRT freezes first found path
      } else if (bestGoal < 0 || nodes[newIdx].cost < nodes[bestGoal].cost) {
        bestGoal = newIdx;
      }
    }
  }
  const goalIdx = rewire ? bestGoal : frozen;
  const path: Node4[] = [];
  if (goalIdx >= 0) {
    let idx = goalIdx;
    while (idx >= 0) {
      path.push(nodes[idx]);
      idx = nodes[idx].parent;
    }
  }
  return { nodes, path, len: goalIdx >= 0 ? pathLen(nodes, goalIdx) : NaN };
}

export function RbRrtVsRrtStar() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [iter, setIter] = useState(reduced ? 260 : 0);
  const [, setAcc] = useState(0);
  const N = 260;
  const PW = 340;
  const PH = 380;

  useRafLoop(
    (dt) => {
      setAcc((a) => {
        const next = a + dt * 40; // ~40 iters/sec
        const adv = Math.floor(next);
        if (adv > 0) setIter((c) => Math.min(N, c + adv));
        return next - adv;
      });
    },
    { playing: playing && inView && !reduced && iter < N },
  );

  const upto = reduced ? N : iter;
  const left = useMemo(() => treeAt(false, PW, PH, upto), [upto]);
  const right = useMemo(() => treeAt(true, PW, PH, upto), [upto]);

  const panel = (
    data: { nodes: Node4[]; path: Node4[]; len: number },
    ox: number,
    label: string,
  ) => (
    <g>
      <text x={ox + PW / 2} y={30} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={R.ink} fontWeight={600}>
        {label}
      </text>
      {/* obstacles */}
      {OBST_6_4.map((o, i) => (
        <rect key={i} x={ox + o.x} y={o.y + 20} width={o.w} height={o.h} rx={5} fill="#e6e6e3" stroke={R.world} strokeWidth={2} />
      ))}
      {/* edges */}
      {data.nodes.map((n, i) =>
        n.parent < 0 ? null : (
          <line key={i} x1={ox + data.nodes[n.parent].x} y1={data.nodes[n.parent].y + 20} x2={ox + n.x} y2={n.y + 20} stroke={R.signal} strokeWidth={1.4} opacity={0.55} />
        ),
      )}
      {/* best path */}
      {data.path.length > 1 &&
        data.path.map((n, i) =>
          i === 0 ? null : (
            <line key={`p${i}`} x1={ox + data.path[i - 1].x} y1={data.path[i - 1].y + 20} x2={ox + n.x} y2={n.y + 20} stroke={R.goal} strokeWidth={4} strokeLinecap="round" />
          ),
        )}
      {/* start + goal */}
      <circle cx={ox + START_6_4.x} cy={START_6_4.y + 20} r={7} fill={R.plan} stroke="var(--background)" strokeWidth={2} />
      <circle cx={ox + GOAL_6_4.x} cy={GOAL_6_4.y + 20} r={9} fill={R.fillGreen} stroke={R.goal} strokeWidth={2.5} />
      {/* length readout */}
      <text x={ox + 8} y={PH + 34} fontFamily={MONO} fontSize={13} fill={R.world}>
        path length:{" "}
        <tspan fill={R.plan} fontWeight={600}>
          {Number.isFinite(data.len) ? Math.round(data.len) : "—"}
        </tspan>
      </text>
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
      ariaLabel={`RRT keeps its first found path of length ${Number.isFinite(left.len) ? Math.round(left.len) : "unknown"} while RRT* rewires to length ${Number.isFinite(right.len) ? Math.round(right.len) : "unknown"} at iteration ${upto}`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Btn onClick={() => setIter((c) => Math.min(N, c + 5))}>⏭ step</Btn>
          <Btn onClick={() => { setIter(0); setAcc(0); }}>↺ reset</Btn>
          <Slider label="iterations" min={0} max={N} value={reduced ? N : iter} onChange={setIter} />
          <span className="font-mono text-[13px] text-[var(--muted)]">iter {upto} / {N}</span>
        </>
      }
    >
      {panel(left, 12, "RRT (first path, frozen)")}
      {panel(right, 372, "RRT* (rewiring)")}
      <line x1={360} y1={26} x2={360} y2={PH + 20} stroke={R.line} strokeWidth={1.5} strokeDasharray="4 6" />
      {/* length-gap readout, red */}
      {gap !== null && (
        <text x={360} y={PH + 34} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.error} fontWeight={600}>
          Δlen = {gap}
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 6.5 · Global route, local dodge  (draggable field + live loop)
// A robot follows a global A*-style route from start to goal. Drop / drag a
// "person" onto the path and the local planner (DWA) bulges around it, then
// snaps back to the global line. A toggle shows DWA's dynamic-window velocity
// fan being scored each tick.
// ===========================================================================

const ROUTE_6_5: { x: number; y: number }[] = [
  { x: 70, y: 360 },
  { x: 170, y: 340 },
  { x: 270, y: 300 },
  { x: 360, y: 230 },
  { x: 460, y: 170 },
  { x: 560, y: 120 },
  { x: 650, y: 80 },
];

// Cumulative arc length for parameterizing progress along the route.
function routeAt(s: number) {
  // s in [0,1]
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < ROUTE_6_5.length; i++) {
    const d = Math.hypot(ROUTE_6_5[i].x - ROUTE_6_5[i - 1].x, ROUTE_6_5[i].y - ROUTE_6_5[i - 1].y);
    segs.push(d);
    total += d;
  }
  let target = s * total;
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i]) {
      const t = segs[i] === 0 ? 0 : target / segs[i];
      return {
        x: lerp(ROUTE_6_5[i].x, ROUTE_6_5[i + 1].x, t),
        y: lerp(ROUTE_6_5[i].y, ROUTE_6_5[i + 1].y, t),
      };
    }
    target -= segs[i];
  }
  return { ...ROUTE_6_5[ROUTE_6_5.length - 1] };
}

export function RbGlobalLocal() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [speed, setSpeed] = useState(1);
  const [showFan, setShowFan] = useState(true);
  const [person, setPerson] = useState({ x: 360, y: 232 });
  const [drag, setDrag] = useState(false);
  const [rob, setRob] = useState({ s: 0, x: ROUTE_6_5[0].x, y: ROUTE_6_5[0].y });

  useRafLoop(
    (dt) => {
      setRob((p) => {
        let s = p.s + dt * 0.08 * speed;
        if (s >= 1) s = 0;
        const base = routeAt(s);
        // local dodge: push away from the person if close to the path point.
        const dx = base.x - person.x;
        const dy = base.y - person.y;
        const d = Math.hypot(dx, dy);
        const R0 = 70;
        let x = base.x;
        let y = base.y;
        if (d < R0 && d > 0.001) {
          const push = (R0 - d) * 0.9;
          x += (dx / d) * push;
          y += (dy / d) * push;
        }
        return { s, x, y };
      });
    },
    { playing: playing && inView && !reduced },
  );

  const onMove = (e: ReactPointerEvent<SVGElement>) => {
    if (!drag) return;
    const [x, y] = svgPoint(e);
    setPerson({ x: clamp(x, 40, 680), y: clamp(y, 40, 400) });
  };

  const replan = () => setRob({ s: 0, x: ROUTE_6_5[0].x, y: ROUTE_6_5[0].y });

  // Under reduced motion, park the robot mid-route near the person.
  const robot = reduced
    ? (() => {
        const base = routeAt(0.42);
        const dx = base.x - person.x;
        const dy = base.y - person.y;
        const d = Math.hypot(dx, dy) || 1;
        const R0 = 70;
        const push = d < R0 ? (R0 - d) * 0.9 : 0;
        return { x: base.x + (dx / d) * push, y: base.y + (dy / d) * push };
      })()
    : rob;

  // DWA velocity fan: a set of candidate arcs from the robot toward the route,
  // scored by clearance from the person. Deterministic angles.
  const heading = useMemo(() => {
    const ahead = reduced ? routeAt(0.5) : routeAt(clamp(rob.s + 0.03, 0, 1));
    return Math.atan2(ahead.y - robot.y, ahead.x - robot.x);
  }, [rob.s, robot.x, robot.y, reduced]);

  const fan = Array.from({ length: 7 }).map((_, i) => {
    const a = heading + (i - 3) * 0.28;
    const ex = robot.x + Math.cos(a) * 62;
    const ey = robot.y + Math.sin(a) * 62;
    const clear = Math.hypot(ex - person.x, ey - person.y);
    return { ex, ey, clear };
  });
  const best = fan.reduce((b, c, i) => (c.clear > fan[b].clear ? i : b), 0);

  return (
    <Stage
      innerRef={ref}
      title="Fig 6.5 · Global route, local dodge"
      ariaLabel="A robot following a global route while the local planner dodges a draggable person obstacle"
      svgProps={{
        onPointerMove: onMove,
        onPointerUp: () => setDrag(false),
        onPointerLeave: () => setDrag(false),
      }}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Btn onClick={replan} title="recompute the global route">↺ replan global</Btn>
          <Btn onClick={() => setShowFan((v) => !v)} active={showFan}>
            {showFan ? "✓ velocity fan" : "show velocity fan"}
          </Btn>
          <Slider label="speed" min={0.25} max={2.5} step={0.25} value={speed} onChange={setSpeed} fmt={(v) => `${v}×`} />
          <span className="font-mono text-[13px] text-[var(--muted)]">drag the person</span>
        </>
      }
    >
      {/* known map: a couple of static grey walls */}
      <rect x={130} y={90} width={150} height={40} rx={5} fill="#e6e6e3" stroke={R.world} strokeWidth={2} />
      <rect x={470} y={280} width={150} height={40} rx={5} fill="#e6e6e3" stroke={R.world} strokeWidth={2} />

      {/* the amber global path */}
      <polyline
        points={ROUTE_6_5.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke={R.plan}
        strokeWidth={3}
        strokeDasharray="7 6"
        opacity={0.9}
      />
      <circle cx={ROUTE_6_5[0].x} cy={ROUTE_6_5[0].y} r={7} fill={R.plan} />
      <text x={ROUTE_6_5[0].x + 4} y={ROUTE_6_5[0].y + 24} fontFamily={MONO} fontSize={12} fill={R.plan}>start</text>
      <circle cx={ROUTE_6_5[6].x} cy={ROUTE_6_5[6].y} r={11} fill={R.fillGreen} stroke={R.goal} strokeWidth={3} />
      <text x={ROUTE_6_5[6].x} y={ROUTE_6_5[6].y - 18} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>goal</text>

      {/* DWA velocity fan */}
      {showFan &&
        fan.map((c, i) => (
          <line
            key={i}
            x1={robot.x}
            y1={robot.y}
            x2={c.ex}
            y2={c.ey}
            stroke={i === best ? R.goal : R.line}
            strokeWidth={i === best ? 3 : 1.5}
            opacity={i === best ? 0.95 : 0.55}
          />
        ))}
      {showFan && (
        <text x={robot.x} y={robot.y - 26} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>
          best arc
        </text>
      )}

      {/* the person (dynamic obstacle) */}
      <circle cx={person.x} cy={person.y} r={30} fill="none" stroke={R.error} strokeWidth={1.2} strokeDasharray="4 4" opacity={0.6} />
      <circle
        cx={person.x}
        cy={person.y}
        r={13}
        fill={R.fillRed}
        stroke={R.error}
        strokeWidth={3}
        style={{ cursor: "grab" }}
        onPointerDown={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
      />
      <text x={person.x} y={person.y + 30} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.error}>person</text>

      {/* the robot */}
      <circle cx={robot.x} cy={robot.y} r={12} fill={R.fillBlue} stroke={R.signal} strokeWidth={3} />
      {svgArrow(robot.x, robot.y, robot.x + Math.cos(heading) * 26, robot.y + Math.sin(heading) * 26, R.signal, 2.5, 8)}

      {/* fixed readout lane */}
      <text x={24} y={30} fontFamily={MONO} fontSize={13} fill={R.world}>
        <tspan fill={R.plan}>amber</tspan> = global route ·{" "}
        <tspan fill={R.signal}>blue</tspan> = robot ·{" "}
        <tspan fill={R.error}>red</tspan> = person the local planner dodges
      </text>
      {reduced && (
        <text x={24} y={430} fontFamily={MONO} fontSize={13} fill={R.world}>
          Reduced motion: robot parked mid-route, bulged around the person; drag the person to move it.
        </text>
      )}
    </Stage>
  );
}
