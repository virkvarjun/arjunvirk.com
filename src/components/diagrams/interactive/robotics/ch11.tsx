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
// Fig 11.1 · The dreaming loop  (animated pipeline)
// Two MDP loops share a policy. Toggle whether the policy trains in reality
// (expensive, ~1 rollout/s) or in a learned world model (cheap, ~10000/s). A
// token circulates the active loop; the inactive loop dims; a cost meter drops.
// ===========================================================================

const POLICY = { x: 360, y: 220 };
// Real loop (left): POLICY -> ACT -> REAL WORLD -> OBSERVE -> POLICY
const REAL_NODES = [
  { id: "ACT", x: 195, y: 120, color: R.plan, sub: "command" },
  { id: "REAL WORLD", x: 110, y: 300, color: R.world, sub: "reality" },
  { id: "OBSERVE", x: 300, y: 330, color: R.signal, sub: "sense" },
];
// Imagined loop (right): POLICY -> WORLD MODEL -> POLICY
const DREAM_NODES = [
  { id: "WORLD MODEL", x: 560, y: 160, color: R.goal, sub: "dreamed dynamics" },
  { id: "IMAGINED", x: 560, y: 320, color: R.signal, sub: "next state" },
];

export function RbDreamingLoop() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [dream, setDream] = useState(false);
  // phase 0..1 around active loop; cost eases 0(dream)..1(real); flash on real step
  const [st, setSt] = useState({ phase: 0, cost: 1, flash: 0 });

  useRafLoop(
    (dt) => {
      setSt((s) => {
        const speed = dream ? 1.1 : 0.6;
        let p = s.phase + dt * speed;
        let flash = Math.max(0, s.flash - dt * 1.8);
        if (p >= 1) {
          p -= 1;
          if (!dream) flash = 1; // each real loop costs a red step
        }
        const cost = approach(s.cost, dream ? 0 : 1, 0.14, dt);
        return { phase: p, cost, flash };
      });
    },
    { playing: playing && inView && !reduced },
  );

  const rollouts = dream ? 10000 : 1;
  const phase = reduced ? 0.5 : st.phase;

  // Token position along the active loop (piecewise around the ring waypoints).
  const realRing = [POLICY, REAL_NODES[0], REAL_NODES[1], REAL_NODES[2], POLICY];
  const dreamRing = [POLICY, DREAM_NODES[0], DREAM_NODES[1], POLICY];
  const ring = dream ? dreamRing : realRing;
  const segCount = ring.length - 1;
  const fseg = phase * segCount;
  const si = Math.min(Math.floor(fseg), segCount - 1);
  const ft = smooth(fseg - si);
  const tokenX = lerp(ring[si].x, ring[si + 1].x, ft);
  const tokenY = lerp(ring[si].y, ring[si + 1].y, ft);

  const NW = 74;
  const NH = 30;
  const box = (
    n: { id: string; x: number; y: number; color: string; sub: string },
    active: boolean,
  ) => {
    const fill =
      n.color === R.signal
        ? R.fillBlue
        : n.color === R.plan
          ? R.fillAmber
          : n.color === R.goal
            ? R.fillGreen
            : "#eeeeec";
    return (
      <g key={n.id} opacity={active ? 1 : 0.32}>
        <rect
          x={n.x - NW}
          y={n.y - NH}
          width={NW * 2}
          height={NH * 2}
          rx={11}
          fill={fill}
          stroke={n.color}
          strokeWidth={2.5}
        />
        <text x={n.x} y={n.y - 2} textAnchor="middle" fontFamily={MONO} fontSize={14} fontWeight={600} fill={R.ink}>
          {n.id}
        </text>
        <text x={n.x} y={n.y + 15} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
          {n.sub}
        </text>
      </g>
    );
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 11.1 · The dreaming loop"
      ariaLabel={`Policy training in ${dream ? "imagination" : "reality"}, ${rollouts} rollouts per second`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Btn
            onClick={() => setDream((d) => !d)}
            active={dream}
            title="route the policy into the real world or into its own imagination"
          >
            {dream ? "train in imagination" : "train in reality"}
          </Btn>
          <Btn onClick={() => setSt({ phase: 0, cost: dream ? 0 : 1, flash: 0 })}>↺ reset</Btn>
        </>
      }
    >
      {/* readout lane, top */}
      <text x={30} y={40} fontFamily={MONO} fontSize={13} fill={R.world}>
        rollouts / sec
      </text>
      <text x={150} y={40} fontFamily={MONO} fontSize={15} fill={dream ? R.goal : R.plan} fontWeight={600}>
        ~{rollouts.toLocaleString()}
      </text>
      <text x={470} y={40} fontFamily={MONO} fontSize={13} fill={R.world}>
        real-world cost
      </text>
      <rect x={590} y={30} width={100} height={12} rx={6} fill="#e7e7e4" />
      <rect x={590} y={30} width={100 * (reduced ? 1 : st.cost)} height={12} rx={6} fill={R.error} />

      {/* edges: real loop (left) */}
      <g opacity={dream ? 0.28 : 1}>
        {svgArrow(POLICY.x - NW, POLICY.y - 8, REAL_NODES[0].x + 40, REAL_NODES[0].y + 20, R.line, 3, 10)}
        {svgArrow(REAL_NODES[0].x, REAL_NODES[0].y + NH, REAL_NODES[1].x, REAL_NODES[1].y - NH, R.line, 3, 10)}
        {svgArrow(REAL_NODES[1].x + NW, REAL_NODES[1].y, REAL_NODES[2].x - NW, REAL_NODES[2].y, R.line, 3, 10)}
        {svgArrow(REAL_NODES[2].x + NW - 6, REAL_NODES[2].y - NH, POLICY.x - 24, POLICY.y + NH, R.line, 3, 10)}
        <text x={90} y={210} fontFamily={MONO} fontSize={12} fill={R.world}>
          expensive, slow,
        </text>
        <text x={90} y={226} fontFamily={MONO} fontSize={12} fill={R.world}>
          one robot
        </text>
      </g>

      {/* edges: dream loop (right) */}
      <g opacity={dream ? 1 : 0.28}>
        {svgArrow(POLICY.x + NW, POLICY.y - 8, DREAM_NODES[0].x - NW, DREAM_NODES[0].y + 8, R.line, 3, 10)}
        {svgArrow(DREAM_NODES[0].x, DREAM_NODES[0].y + NH, DREAM_NODES[1].x, DREAM_NODES[1].y - NH, R.line, 3, 10)}
        {svgArrow(DREAM_NODES[1].x - NW, DREAM_NODES[1].y - 6, POLICY.x + NW + 4, POLICY.y + NH - 4, R.line, 3, 10)}
        <text x={470} y={392} fontFamily={MONO} fontSize={12} fill={R.goal}>
          cheap, fast, thousands of rollouts
        </text>
      </g>

      {/* shared policy box */}
      {box({ id: "POLICY", x: POLICY.x, y: POLICY.y, color: R.plan, sub: "the learner" }, true)}

      {REAL_NODES.map((n) => box(n, !dream))}
      {DREAM_NODES.map((n) => box(n, dream))}

      {/* red flash on the real world when a real step is paid for */}
      {!dream && (st.flash > 0 || reduced) && (
        <rect
          x={REAL_NODES[1].x - NW}
          y={REAL_NODES[1].y - NH}
          width={NW * 2}
          height={NH * 2}
          rx={11}
          fill="none"
          stroke={R.error}
          strokeWidth={3}
          opacity={reduced ? 0.6 : st.flash}
        />
      )}

      {/* circulating data token */}
      {!reduced && (
        <g>
          <circle cx={tokenX} cy={tokenY} r={12} fill={dream ? R.goal : R.signal} opacity={0.25} />
          <circle cx={tokenX} cy={tokenY} r={7} fill={dream ? R.goal : R.signal} />
        </g>
      )}

      {reduced && (
        <text x={30} y={418} fontFamily={MONO} fontSize={12} fill={R.world}>
          Reduced motion: loop shown static. Toggle still swaps reality ↔ imagination.
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 11.2 · Dreaming in latent space vs pixel space  (toggle-compare)
// Two rollout tracks over a horizon. The pixel track degrades into noise and
// carries a big per-step cost; the latent track stays crisp and cheap, decoded
// only at the end. A horizon slider makes the pixel drift worse.
// ===========================================================================

export function RbLatentVsPixel() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [horizon, setHorizon] = useState(8);
  const [decode, setDecode] = useState(false);
  const [t, setT] = useState(0); // 0..horizon, animated fill

  useRafLoop(
    (dt) => {
      setT((v) => {
        const nv = v + dt * 2.4;
        return nv > horizon + 1.2 ? 0 : nv;
      });
    },
    { playing: playing && inView && !reduced },
  );

  const filled = reduced ? horizon : Math.min(t, horizon);
  const x0 = 70;
  const x1 = 690;
  const cell = (x1 - x0) / 16;
  const rng = mulberry32(9);
  const noiseSeed = Array.from({ length: 20 }, () => rng());

  const pixelY = 150;
  const latentY = 320;
  const size = 40;

  return (
    <Stage
      innerRef={ref}
      title="Fig 11.2 · Dreaming in latent space vs pixel space"
      ariaLabel={`Pixel rollout degrades over ${horizon} steps while the latent rollout stays stable`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Slider label="horizon" min={1} max={16} value={horizon} onChange={setHorizon} fmt={(v) => `${v} steps`} />
          <Btn onClick={() => setDecode((d) => !d)} active={decode}>
            {decode ? "✓ decode to pixels" : "decode to pixels"}
          </Btn>
          <Btn onClick={() => setT(0)}>↺ reset</Btn>
        </>
      }
    >
      {/* track labels + cost bars */}
      <text x={30} y={90} fontFamily={MONO} fontSize={14} fill={R.error} fontWeight={600}>
        predict pixels
      </text>
      <text x={30} y={108} fontFamily={MONO} fontSize={12} fill={R.world}>
        cost/step:
      </text>
      <rect x={110} y={99} width={90} height={10} rx={5} fill="#e7e7e4" />
      <rect x={110} y={99} width={90} height={10} rx={5} fill={R.error} />

      <text x={30} y={262} fontFamily={MONO} fontSize={14} fill={R.goal} fontWeight={600}>
        predict latents
      </text>
      <text x={30} y={280} fontFamily={MONO} fontSize={12} fill={R.world}>
        cost/step:
      </text>
      <rect x={110} y={271} width={90} height={10} rx={5} fill="#e7e7e4" />
      <rect x={110} y={271} width={12} height={10} rx={5} fill={R.goal} />

      {Array.from({ length: horizon }).map((_, i) => {
        const on = i < filled;
        const drift = clamp((i + 1) / horizon, 0, 1); // 0..1 across horizon
        const cx = x0 + i * cell + cell / 2;
        // pixel cell: crisp -> smeary -> noise as drift grows
        const jitter = drift * 10;
        const opacity = on ? 1 : 0.12;
        return (
          <g key={i}>
            {/* pixel track */}
            <rect
              x={cx - size / 2}
              y={pixelY - size / 2}
              width={size}
              height={size}
              rx={5}
              fill={R.fillBlue}
              stroke={lerp(0, 1, drift) > 0.5 ? R.error : R.signal}
              strokeWidth={2}
              opacity={opacity}
            />
            {on &&
              Array.from({ length: 6 }).map((__, k) => {
                const s = noiseSeed[(i * 6 + k) % noiseSeed.length];
                return (
                  <circle
                    key={k}
                    cx={cx - size / 2 + 6 + s * (size - 12)}
                    cy={pixelY - size / 2 + 6 + noiseSeed[(i + k) % noiseSeed.length] * (size - 12)}
                    r={2.2}
                    fill={R.error}
                    opacity={drift * 0.9}
                  />
                );
              })}
            {on && drift > 0.55 && (
              <line
                x1={cx - size / 2 + 3}
                y1={pixelY - size / 2 + jitter * 0.4}
                x2={cx + size / 2 - 3}
                y2={pixelY + size / 2 - jitter * 0.4}
                stroke={R.error}
                strokeWidth={1.4}
                opacity={drift}
              />
            )}

            {/* latent track: small tidy vector-blob, stays crisp */}
            <rect
              x={cx - 13}
              y={latentY - 13}
              width={26}
              height={26}
              rx={13}
              fill={R.fillGreen}
              stroke={R.signal}
              strokeWidth={2}
              opacity={opacity}
            />
            {on &&
              Array.from({ length: 3 }).map((__, k) => (
                <rect
                  key={k}
                  x={cx - 8 + k * 5}
                  y={latentY - 6 + (k % 2) * 4}
                  width={3}
                  height={12 - (k % 2) * 4}
                  fill={R.signal}
                  opacity={0.8}
                />
              ))}
            <text x={cx} y={pixelY + size / 2 + 16} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
              {i + 1}
            </text>
          </g>
        );
      })}

      {/* the decoded clean thumbnail at the end of the latent track */}
      {(decode || reduced) && filled >= horizon && (
        <g>
          <rect
            x={x0 + horizon * cell + 6}
            y={latentY - size / 2}
            width={size}
            height={size}
            rx={5}
            fill={R.fillGreen}
            stroke={R.goal}
            strokeWidth={2.5}
          />
          <text
            x={x0 + horizon * cell + 6 + size / 2}
            y={latentY + size / 2 + 16}
            textAnchor="middle"
            fontFamily={MONO}
            fontSize={12}
            fill={R.goal}
          >
            decode
          </text>
        </g>
      )}

      <text x={30} y={410} fontFamily={MONO} fontSize={13} fill={R.world}>
        the pixel track dissolves into drift (red); the latent track holds and renders only at the end
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 11.3 · Action-conditioned video rollout  (slider-driven diagram)
// One current frame, an action selector, and a strip of generated future frames
// that differ by action: push left slides the block left, lift raises it, etc.
// ===========================================================================

type Act11 = "left" | "lift" | "right" | "none";
const ACTS: { id: Act11; label: string }[] = [
  { id: "left", label: "push left" },
  { id: "lift", label: "lift" },
  { id: "right", label: "push right" },
  { id: "none", label: "do nothing" },
];

export function RbActionVideo() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [act, setAct] = useState<Act11>("left");
  const [steps, setSteps] = useState(4);
  const [playing, toggle] = useReducer((p) => !p, true);
  const [t, setT] = useState(steps); // eased fill count

  useRafLoop(
    (dt) => {
      setT((v) => {
        const nv = v + dt * 2.6;
        return nv > steps + 1.5 ? 0 : nv;
      });
    },
    { playing: playing && inView && !reduced },
  );

  const shown = reduced ? steps : clamp(Math.floor(t), 0, steps);

  const curX = 70;
  const curY = 200;
  const stripX0 = 300;
  const stripW = 92;
  const goalX = stripX0 + (steps - 1) * (stripW + 4) + stripW / 2;

  // block offset per frame given the action
  const blockPos = (frame: number) => {
    const f = frame / Math.max(1, steps - 1);
    if (act === "left") return { dx: -f * 26, dy: 0 };
    if (act === "right") return { dx: f * 26, dy: 0 };
    if (act === "lift") return { dx: 0, dy: -f * 26 };
    return { dx: 0, dy: 0 };
  };

  const frameCell = (fx: number, fy: number, dx: number, dy: number, on: boolean, isCur: boolean) => (
    <g opacity={on ? 1 : 0.14}>
      <rect x={fx} y={fy} width={stripW - 8} height={70} rx={6} fill="#f3f3f0" stroke={R.line} strokeWidth={2} />
      <line x1={fx + 4} y1={fy + 58} x2={fx + stripW - 12} y2={fy + 58} stroke={R.world} strokeWidth={2} />
      {/* gripper (fixed) */}
      <rect x={fx + (stripW - 8) / 2 - 10} y={fy + 8} width={20} height={12} rx={3} fill="#dcdcd8" stroke={R.world} strokeWidth={1.5} />
      {/* red block */}
      <rect
        x={fx + (stripW - 8) / 2 - 9 + dx}
        y={fy + 40 + dy}
        width={18}
        height={16}
        rx={3}
        fill={isCur ? "#eeeeec" : R.fillBlue}
        stroke={isCur ? R.world : R.signal}
        strokeWidth={2}
      />
    </g>
  );

  return (
    <Stage
      innerRef={ref}
      title="Fig 11.3 · Action-conditioned video rollout"
      ariaLabel={`Future frames generated for action ${act}`}
      controls={
        <>
          <Tabs options={ACTS} value={act} onChange={setAct} />
          <Slider label="steps" min={2} max={6} value={steps} onChange={setSteps} fmt={(v) => `${v}`} />
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Btn onClick={() => setT(0)}>↺ reset</Btn>
        </>
      }
    >
      <text x={70} y={140} fontFamily={MONO} fontSize={13} fill={R.world}>
        current frame
      </text>
      {frameCell(curX, curY, 0, 0, true, true)}

      {svgArrow(curX + stripW + 12, curY + 35, stripX0 - 14, curY + 35, R.plan, 3, 10)}
      <text x={curX + stripW + 40} y={curY + 24} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.plan} fontWeight={600}>
        {ACTS.find((a) => a.id === act)!.label}
      </text>

      <text x={300} y={140} fontFamily={MONO} fontSize={13} fill={R.signal} fontWeight={600}>
        generated future: p(o&apos; | o, a)
      </text>
      {Array.from({ length: steps }).map((_, i) => {
        const { dx, dy } = blockPos(i);
        const fx = stripX0 + i * (stripW + 4);
        return frameCell(fx, curY, dx, dy, i < shown, false);
      })}

      {/* goal marker the reader can try to reach */}
      <circle cx={goalX} cy={curY - 14} r={8} fill="none" stroke={R.goal} strokeWidth={2.5} />
      <text x={goalX} y={curY - 24} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>
        goal
      </text>

      <text x={70} y={330} fontFamily={MONO} fontSize={13} fill={R.world}>
        change the action and the future changes; that is what makes it a world model, not a fixed movie
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 11.4 · Reconstruct pixels vs align embeddings  (toggle-compare)
// Two pipelines for the same frame. "reconstruct" must guess every pixel and
// wastes effort (red) on texture/lighting that grows with a clutter slider;
// "align" predicts a small embedding and its cost barely moves.
// ===========================================================================

export function RbReconstructVsAlign() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [mode, setMode] = useState<"reconstruct" | "align">("reconstruct");
  const [clutter, setClutter] = useState(40);
  const [pulse, setPulse] = useState(0);

  useRafLoop((dt) => setPulse((p) => (p + dt) % 2), {
    playing: inView && !reduced && mode === "reconstruct",
  });

  const cl = clutter / 100;
  const reconCost = 0.2 + cl * 0.75; // balloons with clutter
  const alignCost = 0.14; // ~flat
  const wasteOpacity = reduced ? cl : 0.4 + 0.6 * cl * (0.6 + 0.4 * Math.sin(pulse * Math.PI));
  const rng = mulberry32(21);
  const speck = Array.from({ length: 40 }, () => [rng(), rng()] as const);

  const active = mode;

  const pipeline = (
    yPos: number,
    label: string,
    isRecon: boolean,
    on: boolean,
  ) => {
    const boxColor = isRecon ? R.error : R.goal;
    const cost = isRecon ? reconCost : alignCost;
    return (
      <g opacity={on ? 1 : 0.3}>
        <text x={30} y={yPos - 52} fontFamily={MONO} fontSize={14} fill={boxColor} fontWeight={600}>
          {label}
        </text>
        {/* current frame */}
        <rect x={60} y={yPos - 34} width={70} height={68} rx={6} fill="#f3f3f0" stroke={R.line} strokeWidth={2} />
        <text x={95} y={yPos + 52} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
          current
        </text>
        {svgArrow(134, yPos, 200, yPos, R.line, 3, 9)}
        <text x={167} y={yPos - 12} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
          {isRecon ? "predict" : "encode+predict"}
        </text>

        {isRecon ? (
          <>
            {/* full future frame, guessing every pixel */}
            <rect x={210} y={yPos - 34} width={70} height={68} rx={6} fill={R.fillBlue} stroke={R.signal} strokeWidth={2} />
            {on &&
              speck
                .slice(0, Math.round(6 + cl * 30))
                .map(([a, b], k) => (
                  <circle key={k} cx={210 + 6 + a * 58} cy={yPos - 28 + b * 56} r={2} fill={R.error} opacity={wasteOpacity} />
                ))}
            <text x={245} y={yPos + 52} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
              full future frame
            </text>
            <text x={330} y={yPos - 10} fontFamily={MONO} fontSize={12} fill={R.error}>
              must guess every pixel
            </text>
          </>
        ) : (
          <>
            {/* small embedding vector */}
            <rect x={210} y={yPos - 16} width={54} height={32} rx={6} fill={R.fillGreen} stroke={R.goal} strokeWidth={2} />
            {on &&
              Array.from({ length: 5 }).map((_, k) => (
                <rect key={k} x={216 + k * 9} y={yPos - 8} width={5} height={16} fill={R.signal} opacity={0.85} />
              ))}
            <text x={237} y={yPos + 40} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
              future embedding
            </text>
            {svgArrow(268, yPos, 320, yPos, R.line, 3, 9)}
            <rect x={330} y={yPos - 16} width={54} height={32} rx={6} fill="#eef4ef" stroke={R.goal} strokeWidth={2} strokeDasharray="4 4" />
            <text x={357} y={yPos + 40} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>
              true target
            </text>
            <text x={400} y={yPos - 10} fontFamily={MONO} fontSize={12} fill={R.goal}>
              only decision-relevant structure
            </text>
          </>
        )}

        {/* cost tag (fixed right lane) */}
        <text x={560} y={yPos - 20} fontFamily={MONO} fontSize={12} fill={R.world}>
          cost
        </text>
        <rect x={560} y={yPos - 12} width={120} height={14} rx={7} fill="#e7e7e4" />
        <rect x={560} y={yPos - 12} width={120 * clamp(cost, 0, 1)} height={14} rx={7} fill={boxColor} />
      </g>
    );
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 11.4 · Reconstruct pixels vs align embeddings"
      ariaLabel={`${mode} pipeline with scene clutter ${clutter}`}
      controls={
        <>
          <Tabs
            options={[
              { id: "reconstruct", label: "reconstruct pixels (video)" },
              { id: "align", label: "align embeddings (JEPA)" },
            ]}
            value={mode}
            onChange={setMode}
          />
          <Slider label="detail in scene" min={0} max={100} value={clutter} onChange={setClutter} fmt={(v) => `${v}%`} />
        </>
      }
    >
      {pipeline(130, "reconstruct: predict a full future frame", true, active === "reconstruct")}
      {pipeline(300, "align: predict a compact future embedding", false, active === "align")}

      <text x={30} y={410} fontFamily={MONO} fontSize={13} fill={R.world}>
        {active === "reconstruct"
          ? "adding clutter balloons the pixel model's wasted effort (red) on detail it will discard"
          : "the embedding model's cost barely moves as clutter rises; it never had to render the detail"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 11.5 · Domain randomization  (stepper)
// Cycle through randomized episodes: table, light, mass, friction all sampled
// from ranges set by a strength slider. A "real world" frame slots in as just
// one more sample when the range is wide.
// ===========================================================================

const DR_EPISODES = [
  { table: "wood", tint: "#d9c3a0", light: "warm", lightC: "#f2e2c0", mass: 0.2, fric: "med" },
  { table: "metal", tint: "#c7ccd2", light: "cool", lightC: "#cfe0f2", mass: 0.4, fric: "low" },
  { table: "tiled", tint: "#cfd6c8", light: "harsh", lightC: "#ffffff", mass: 0.6, fric: "high" },
  { table: "dark", tint: "#9aa0a8", light: "dim", lightC: "#c8ccd2", mass: 0.3, fric: "med" },
  { table: "matte", tint: "#e0d2c0", light: "soft", lightC: "#efe6d4", mass: 0.5, fric: "high" },
];

export function RbDomainRandomization() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [strength, setStrength] = useState(80);
  const [revealReal, setRevealReal] = useState(false);
  const [, setT] = useState(0); // seconds accumulator (write-only)
  const [idx, setIdx] = useState(0);

  useRafLoop(
    (dt) => {
      setT((v) => {
        const nv = v + dt;
        if (nv > 1.4) {
          setIdx((i) => (i + 1) % DR_EPISODES.length);
          return 0;
        }
        return nv;
      });
    },
    { playing: playing && inView && !reduced },
  );

  const s = strength / 100; // 0 -> all identical, 1 -> wide
  const ep = DR_EPISODES[idx];
  // interpolate every visual toward the base (idx 0) as strength -> 0
  const base = DR_EPISODES[0];
  const tint = s > 0.02 ? ep.tint : base.tint;
  const lightC = s > 0.02 ? ep.lightC : base.lightC;
  const mass = lerp(base.mass, ep.mass, s);
  const fric = s > 0.5 ? ep.fric : base.fric;

  const sceneX = 60;
  const sceneY = 90;
  const sceneW = 380;
  const sceneH = 230;

  return (
    <Stage
      innerRef={ref}
      title="Fig 11.5 · Domain randomization"
      ariaLabel={`Randomized episode ${idx + 1} at strength ${strength}%`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Btn onClick={() => setIdx((i) => (i + 1) % DR_EPISODES.length)}>⏭ step</Btn>
          <Slider label="randomization" min={0} max={100} value={strength} onChange={setStrength} fmt={(v) => `${v}%`} />
          <Btn onClick={() => setRevealReal((v) => !v)} active={revealReal}>
            {revealReal ? "✓ real frame" : "reveal the real frame"}
          </Btn>
        </>
      }
    >
      <text x={60} y={64} fontFamily={MONO} fontSize={14} fill={R.world}>
        episode {idx + 1}: a fresh sample every time
      </text>

      {/* lighting wash */}
      <rect x={sceneX} y={sceneY} width={sceneW} height={sceneH} rx={8} fill={lightC} opacity={0.5} />
      <rect x={sceneX} y={sceneY} width={sceneW} height={sceneH} rx={8} fill="none" stroke={R.line} strokeWidth={2} />
      {/* table surface */}
      <rect x={sceneX + 30} y={sceneY + 150} width={sceneW - 60} height={40} rx={6} fill={tint} stroke={R.world} strokeWidth={2} />
      {/* gripper */}
      <rect x={sceneX + sceneW / 2 - 16} y={sceneY + 40} width={32} height={18} rx={4} fill="#dcdcd8" stroke={R.world} strokeWidth={2} />
      {/* block, size hints at mass */}
      <rect
        x={sceneX + sceneW / 2 - 14 * (0.7 + mass)}
        y={sceneY + 150 - 34 * (0.7 + mass)}
        width={28 * (0.7 + mass)}
        height={34 * (0.7 + mass)}
        rx={4}
        fill={R.fillBlue}
        stroke={R.signal}
        strokeWidth={2.5}
      />
      {/* consistent policy behavior marker */}
      <text x={sceneX + sceneW / 2} y={sceneY + 210} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.signal}>
        same policy, every world
      </text>

      {/* parameter panel (fixed right lane) */}
      <line x1={470} y1={90} x2={470} y2={330} stroke={R.line} strokeWidth={1.5} strokeDasharray="4 6" />
      <text x={500} y={116} fontFamily={MONO} fontSize={14} fill={R.ink} fontWeight={600}>
        sampled params
      </text>
      <text x={500} y={150} fontFamily={MONO} fontSize={13} fill={R.world}>
        table
      </text>
      <text x={640} y={150} fontFamily={MONO} fontSize={13} fill={R.plan} fontWeight={600}>
        {s > 0.02 ? ep.table : base.table}
      </text>
      <text x={500} y={182} fontFamily={MONO} fontSize={13} fill={R.world}>
        light
      </text>
      <text x={640} y={182} fontFamily={MONO} fontSize={13} fill={R.plan} fontWeight={600}>
        {s > 0.02 ? ep.light : base.light}
      </text>
      <text x={500} y={214} fontFamily={MONO} fontSize={13} fill={R.world}>
        mass
      </text>
      <text x={640} y={214} fontFamily={MONO} fontSize={13} fill={R.plan} fontWeight={600}>
        {mass.toFixed(2)} kg
      </text>
      <text x={500} y={246} fontFamily={MONO} fontSize={13} fill={R.world}>
        friction
      </text>
      <text x={640} y={246} fontFamily={MONO} fontSize={13} fill={R.plan} fontWeight={600}>
        {fric}
      </text>
      <text x={500} y={290} fontFamily={MONO} fontSize={12} fill={R.world}>
        {s < 0.05 ? "range→0: every episode identical" : "wide range: reality is one more draw"}
      </text>

      {/* the real-world frame revealed as just another sample */}
      {(revealReal || reduced) && (
        <g>
          <rect x={sceneX} y={sceneY + sceneH + 14} width={sceneW} height={8} rx={4} fill={R.fillGreen} stroke={R.goal} strokeWidth={2} />
          <text x={sceneX} y={sceneY + sceneH + 46} fontFamily={MONO} fontSize={13} fill={R.goal}>
            {s > 0.4 ? "✓ the real frame slots in, just another sample" : "real frame sticks out; range too narrow"}
          </text>
        </g>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 11.6 · NeRF ray-marching vs 3DGS splatting  (toggle-compare)
// Left NeRF: a ray with many labeled MLP-query dots and a ~1 fps meter. Right
// 3DGS: anisotropic Gaussian ellipses projected as 2D splats, ~60 fps. Orbit
// the camera; a Gaussian-count slider sharpens the 3DGS reconstruction.
// ===========================================================================

export function RbNerfVsSplat() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [mode, setMode] = useState<"nerf" | "3dgs">("3dgs");
  const [orbit, setOrbit] = useState(20); // degrees
  const [count, setCount] = useState(60); // Gaussian count %
  const [ray, setRay] = useState(0); // 0..1 nerf sample sweep

  useRafLoop(
    (dt) => {
      setRay((v) => (v + dt * 0.35) % 1); // slow: NeRF chugs
    },
    { playing: inView && !reduced && mode === "nerf" },
  );

  const rad = (d: number) => (d * Math.PI) / 180;
  const cx = 200;
  const cy = 230;
  const nGauss = Math.round(8 + (count / 100) * 44);
  const rng = mulberry32(7);
  const blobs = Array.from({ length: nGauss }, () => {
    const a = rng() * Math.PI * 2;
    const r = rng() * 60;
    return { bx: cx + Math.cos(a) * r, by: cy + Math.sin(a) * r * 0.9, rot: rng() * 180, w: 10 + rng() * 12, h: 5 + rng() * 6, hue: rng() };
  });
  const fps = mode === "nerf" ? 1 : Math.round(58 + (count / 100) * 6);
  const realtime = fps >= 30;

  // camera position (orbits object)
  const camX = cx - Math.cos(rad(orbit)) * 150;
  const camY = cy - Math.sin(rad(orbit)) * 90;

  return (
    <Stage
      innerRef={ref}
      title="Fig 11.6 · NeRF ray-marching vs 3DGS splatting"
      ariaLabel={`${mode === "nerf" ? "NeRF ray marching" : "3D Gaussian splatting"} at ${fps} fps`}
      controls={
        <>
          <Tabs
            options={[
              { id: "nerf", label: "NeRF" },
              { id: "3dgs", label: "3DGS" },
            ]}
            value={mode}
            onChange={setMode}
          />
          <Slider label="orbit" min={0} max={90} value={orbit} onChange={setOrbit} fmt={(v) => `${v}°`} />
          {mode === "3dgs" && (
            <Slider label="Gaussians" min={0} max={100} value={count} onChange={setCount} fmt={(v) => `${v}%`} />
          )}
        </>
      }
    >
      {/* fps readout (fixed top-left lane) */}
      <text x={30} y={44} fontFamily={MONO} fontSize={13} fill={R.world}>
        render
      </text>
      <text x={100} y={44} fontFamily={MONO} fontSize={15} fill={realtime ? R.goal : R.error} fontWeight={600}>
        ~{fps} fps {realtime ? "(real-time)" : "(too slow)"}
      </text>

      {/* the object being reconstructed */}
      {mode === "nerf" ? (
        <g>
          {/* implicit object as a soft grey shape */}
          <ellipse cx={cx} cy={cy} rx={62} ry={54} fill="#e6e6e3" stroke={R.world} strokeWidth={2} />
          {/* camera */}
          <polygon
            points={`${camX},${camY} ${camX - 14},${camY - 9} ${camX - 14},${camY + 9}`}
            fill={R.plan}
            stroke={R.plan}
          />
          {/* one ray with many MLP-query samples */}
          {(() => {
            const ex = cx + Math.cos(rad(orbit)) * 60;
            const ey = cy + Math.sin(rad(orbit)) * 40;
            const n = 12;
            return (
              <>
                <line x1={camX} y1={camY} x2={ex} y2={ey} stroke={R.plan} strokeWidth={2} />
                {Array.from({ length: n }).map((_, i) => {
                  const f = i / (n - 1);
                  const px = lerp(camX, ex, f);
                  const py = lerp(camY, ey, f);
                  const lit = reduced ? true : f <= ray;
                  return <circle key={i} cx={px} cy={py} r={3.5} fill={lit ? R.plan : "#dcdcd8"} />;
                })}
                <text x={cx + 90} y={cy - 40} fontFamily={MONO} fontSize={12} fill={R.plan}>
                  each dot = one MLP query
                </text>
                <text x={cx + 90} y={cy - 22} fontFamily={MONO} fontSize={12} fill={R.error}>
                  dozens per pixel → slow
                </text>
              </>
            );
          })()}
          <text x={cx} y={cy + 90} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>
            implicit MLP, ray-marched
          </text>
        </g>
      ) : (
        <g>
          {blobs.map((b, i) => (
            <ellipse
              key={i}
              cx={b.bx}
              cy={b.by}
              rx={b.w}
              ry={b.h}
              transform={`rotate(${b.rot + orbit * 0.4} ${b.bx} ${b.by})`}
              fill={b.hue > 0.5 ? R.fillBlue : R.fillGreen}
              stroke={R.signal}
              strokeWidth={1.2}
              opacity={0.72}
            />
          ))}
          <text x={cx} y={cy + 96} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.signal}>
            {nGauss} explicit Gaussians, projected &amp; blended
          </text>
          <text x={cx + 92} y={cy - 40} fontFamily={MONO} fontSize={12} fill={R.goal}>
            no per-ray queries
          </text>
          <text x={cx + 92} y={cy - 22} fontFamily={MONO} fontSize={12} fill={R.goal}>
            just project + blend → fast
          </text>
        </g>
      )}

      {/* comparison lane (right) */}
      <line x1={470} y1={70} x2={470} y2={370} stroke={R.line} strokeWidth={1.5} strokeDasharray="4 6" />
      <text x={500} y={110} fontFamily={MONO} fontSize={14} fill={R.ink} fontWeight={600}>
        {mode === "nerf" ? "NeRF" : "3D Gaussian Splatting"}
      </text>
      <text x={500} y={148} fontFamily={MONO} fontSize={13} fill={R.world}>
        representation
      </text>
      <text x={500} y={168} fontFamily={MONO} fontSize={13} fill={mode === "nerf" ? R.plan : R.signal} fontWeight={600}>
        {mode === "nerf" ? "implicit MLP field" : "explicit 3D Gaussians"}
      </text>
      <text x={500} y={204} fontFamily={MONO} fontSize={13} fill={R.world}>
        render
      </text>
      <text x={500} y={224} fontFamily={MONO} fontSize={13} fill={mode === "nerf" ? R.error : R.goal} fontWeight={600}>
        {mode === "nerf" ? "march + sample MLP" : "splat + blend"}
      </text>
      <text x={500} y={260} fontFamily={MONO} fontSize={13} fill={R.world}>
        training
      </text>
      <text x={500} y={280} fontFamily={MONO} fontSize={13} fill={R.ink} fontWeight={600}>
        {mode === "nerf" ? "hours" : "minutes"}
      </text>
      <text x={500} y={316} fontFamily={MONO} fontSize={13} fill={R.world}>
        edit scene
      </text>
      <text x={500} y={336} fontFamily={MONO} fontSize={13} fill={R.ink} fontWeight={600}>
        {mode === "nerf" ? "hard (baked in weights)" : "move/delete blobs"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 11.7 · The Real2Sim2Real loop, physics-grounded  (animated pipeline)
// A five-stage ring. A token circulates. Stage 3 (IDENTIFY PHYSICS) is the
// hero: a VLM prior (broad amber band) that real interaction narrows to a tight
// estimate. Toggle blind vs grounded; measurement quality tightens the band.
// ===========================================================================

const RING_STAGES = [
  { id: "CAPTURE\nREAL", angle: -90 },
  { id: "BUILD\nTWIN", angle: -18 },
  { id: "IDENTIFY\nPHYSICS", angle: 54 },
  { id: "TRAIN", angle: 126 },
  { id: "DEPLOY", angle: 198 },
];

export function RbReal2Sim2Real() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [grounded, setGrounded] = useState(true);
  const [quality, setQuality] = useState(70);
  const [phase, setPhase] = useState(0); // 0..5 around ring
  const [band, setBand] = useState(0.5); // eased current band width

  const targetBand = grounded ? clamp(1 - quality / 100, 0.08, 0.9) : 0.9;

  useRafLoop(
    (dt) => {
      setPhase((p) => (p + dt * 0.7) % 5);
      setBand((b) => approach(b, targetBand, 0.12, dt));
    },
    { playing: playing && inView && !reduced },
  );

  const rad = (d: number) => (d * Math.PI) / 180;
  const cx = 260;
  const cy = 220;
  const rr = 150;
  const stagePos = (a: number) => ({ x: cx + Math.cos(rad(a)) * rr, y: cy + Math.sin(rad(a)) * rr });

  const activeStage = reduced ? 2 : Math.floor(phase);
  const tokA = reduced ? RING_STAGES[2].angle : lerp(RING_STAGES[Math.floor(phase)].angle, RING_STAGES[Math.floor(phase)].angle + 72, phase - Math.floor(phase));
  const tok = stagePos(tokA);

  const bandW = reduced ? targetBand : band;
  const success = Math.round(clamp((grounded ? 0.62 + (quality / 100) * 0.33 : 0.5) * 100, 0, 99));

  return (
    <Stage
      innerRef={ref}
      title="Fig 11.7 · The Real2Sim2Real loop, physics-grounded"
      ariaLabel={`Real2Sim2Real ring, ${grounded ? "physics-grounded" : "blind randomization"} mode`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Btn onClick={() => setGrounded((g) => !g)} active={grounded}>
            {grounded ? "physics-grounded" : "blind randomization"}
          </Btn>
          <Slider label="measurement" min={0} max={100} value={quality} onChange={setQuality} fmt={(v) => `${v}%`} />
        </>
      }
    >
      {/* ring backbone */}
      <circle cx={cx} cy={cy} r={rr} fill="none" stroke={R.line} strokeWidth={2} strokeDasharray="4 7" />

      {RING_STAGES.map((sg, i) => {
        const p = stagePos(sg.angle);
        const hero = i === 2;
        const on = i === activeStage;
        return (
          <g key={sg.id}>
            <rect
              x={p.x - 56}
              y={p.y - 24}
              width={112}
              height={48}
              rx={9}
              fill={hero ? R.fillGreen : on ? R.fillBlue : "#eeeeec"}
              stroke={hero ? R.goal : on ? R.signal : R.world}
              strokeWidth={hero ? 3 : 2}
            />
            {sg.id.split("\n").map((ln, k) => (
              <text
                key={k}
                x={p.x}
                y={p.y - 3 + k * 15}
                textAnchor="middle"
                fontFamily={MONO}
                fontSize={12}
                fontWeight={600}
                fill={R.ink}
              >
                {ln}
              </text>
            ))}
          </g>
        );
      })}

      {/* circulating token */}
      {!reduced && (
        <>
          <circle cx={tok.x} cy={tok.y} r={11} fill={R.plan} opacity={0.25} />
          <circle cx={tok.x} cy={tok.y} r={6} fill={R.plan} />
        </>
      )}

      {/* hero stage 3 detail: parameter band (right lane) */}
      <line x1={470} y1={70} x2={470} y2={380} stroke={R.line} strokeWidth={1.5} strokeDasharray="4 6" />
      <text x={500} y={104} fontFamily={MONO} fontSize={13} fill={R.goal} fontWeight={600}>
        identify physics
      </text>
      <text x={500} y={128} fontFamily={MONO} fontSize={12} fill={R.world}>
        center-of-mass estimate
      </text>
      {/* band: broad amber (guessed) shrinking to tight measured */}
      {(() => {
        const bx0 = 500;
        const bx1 = 690;
        const mid = (bx0 + bx1) / 2;
        const half = (bandW * (bx1 - bx0)) / 2;
        return (
          <>
            <line x1={bx0} y1={160} x2={bx1} y2={160} stroke={R.line} strokeWidth={2} />
            <rect x={mid - half} y={150} width={half * 2} height={20} rx={4} fill={R.fillAmber} stroke={R.plan} strokeWidth={2} />
            <line x1={mid} y1={144} x2={mid} y2={176} stroke={R.goal} strokeWidth={3} />
            <text x={500} y={200} fontFamily={MONO} fontSize={12} fill={R.plan}>
              {grounded ? "VLM prior → narrowed by interaction" : "wide guessed cloud (blind)"}
            </text>
            <text x={500} y={222} fontFamily={MONO} fontSize={12} fill={R.world}>
              uncertainty: {Math.round(bandW * 100)}%
            </text>
          </>
        );
      })()}

      {/* deploy success readout */}
      <text x={500} y={280} fontFamily={MONO} fontSize={13} fill={R.world}>
        real-world success
      </text>
      <rect x={500} y={292} width={190} height={16} rx={8} fill="#e7e7e4" />
      <rect x={500} y={292} width={190 * (success / 100)} height={16} rx={8} fill={R.goal} />
      <text x={500} y={334} fontFamily={MONO} fontSize={15} fill={R.goal} fontWeight={600}>
        {success}%
      </text>
      <text x={500} y={362} fontFamily={MONO} fontSize={12} fill={R.error}>
        reality gap shrinks as physics grounding improves
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 11.8 · Reliability, not realism: the drift demo  (stepper)
// Scrub a 20-step rollout. Early steps coherent (green), middle degrading
// (amber), late hallucinated (red). A draggable trust marker; toggling to the
// grounded model pushes the coherent band much further right.
// ===========================================================================

const N_STEPS = 20;

export function RbDriftDemo() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [grounded, setGrounded] = useState(false);
  const [step, setStep] = useState(6);
  const [trust, setTrust] = useState(10);
  const [drag, setDrag] = useState(false);
  const [t, setT] = useState(6);

  useRafLoop(
    (dt) => {
      setT((v) => {
        const nv = v + dt * 3;
        return nv > N_STEPS + 2 ? 1 : nv;
      });
    },
    { playing: playing && inView && !reduced },
  );

  const cur = reduced ? step : clamp(Math.round(t), 1, N_STEPS);
  // trust horizon: where reliability crosses the line (later when grounded)
  const horizon = grounded ? 15 : 8;

  const x0 = 60;
  const x1 = 690;
  const cellW = (x1 - x0) / N_STEPS;
  const rowY = 150;

  const bandColor = (i: number) => {
    const frac = i / horizon;
    if (frac < 0.6) return R.goal;
    if (frac < 1.0) return R.plan;
    return R.error;
  };

  const trustX = x0 + (clamp(trust, 1, N_STEPS) - 0.5) * cellW;
  const inHallucination = trust > horizon;

  const onMove = (e: ReactPointerEvent<SVGElement>) => {
    if (!drag) return;
    const [x] = svgPoint(e);
    const idx = clamp(Math.round((x - x0) / cellW + 0.5), 1, N_STEPS);
    setTrust(idx);
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 11.8 · Reliability, not realism: the drift demo"
      ariaLabel={`World-model rollout at step ${cur} of ${N_STEPS}; trust horizon ${horizon}`}
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
          <Slider label="step" min={1} max={N_STEPS} value={step} onChange={(v) => { setStep(v); setT(v); }} fmt={(v) => `${v}/${N_STEPS}`} />
          <Btn onClick={() => setGrounded((g) => !g)} active={grounded}>
            {grounded ? "grounded model" : "naive model"}
          </Btn>
        </>
      }
    >
      <text x={30} y={44} fontFamily={MONO} fontSize={13} fill={R.world}>
        world-model rollout: {grounded ? "grounded" : "naive"}
      </text>

      {/* coherence band legend (fixed top-right lane) */}
      <g>
        <circle cx={470} cy={40} r={6} fill={R.goal} />
        <text x={482} y={45} fontFamily={MONO} fontSize={12} fill={R.world}>coherent</text>
        <circle cx={560} cy={40} r={6} fill={R.plan} />
        <text x={572} y={45} fontFamily={MONO} fontSize={12} fill={R.world}>drifting</text>
        <circle cx={648} cy={40} r={6} fill={R.error} />
        <text x={660} y={45} fontFamily={MONO} fontSize={12} fill={R.world}>hallucinated</text>
      </g>

      {/* rollout cells */}
      {Array.from({ length: N_STEPS }).map((_, i) => {
        const idx = i + 1;
        const on = idx <= cur;
        const c = bandColor(idx);
        const cxx = x0 + i * cellW + cellW / 2;
        const degrade = clamp(idx / horizon, 0, 1.4);
        return (
          <g key={i} opacity={on ? 1 : 0.12}>
            <rect
              x={x0 + i * cellW + 2}
              y={rowY - 30}
              width={cellW - 4}
              height={60}
              rx={4}
              fill={c === R.goal ? R.fillGreen : c === R.plan ? R.fillAmber : R.fillRed}
              stroke={c}
              strokeWidth={2}
            />
            {/* object dot: teleports/melts as degrade rises */}
            {on && (
              <circle
                cx={cxx + (degrade > 1 ? (((i * 37) % 11) - 5) * 2.4 : 0)}
                cy={rowY + (degrade > 0.6 ? Math.sin(i * 1.7) * degrade * 8 : 0)}
                r={clamp(6 - (degrade > 1 ? (degrade - 1) * 5 : 0), 1.5, 6)}
                fill={c}
              />
            )}
          </g>
        );
      })}

      {/* step ticks */}
      <text x={x0} y={rowY + 52} fontFamily={MONO} fontSize={11} fill={R.world}>1</text>
      <text x={x0 + (N_STEPS - 1) * cellW} y={rowY + 52} fontFamily={MONO} fontSize={11} fill={R.world}>{N_STEPS}</text>

      {/* the (model's) trust horizon boundary */}
      {(() => {
        const hx = x0 + horizon * cellW;
        return (
          <g>
            <line x1={hx} y1={rowY - 48} x2={hx} y2={rowY + 40} stroke={R.error} strokeWidth={2} strokeDasharray="5 4" />
            <text x={hx} y={rowY - 54} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.error}>
              reliability line
            </text>
          </g>
        );
      })()}

      {/* draggable "horizon you trust" marker */}
      <g>
        <line x1={trustX} y1={rowY + 62} x2={trustX} y2={rowY - 44} stroke={R.signal} strokeWidth={2.5} />
        <polygon
          points={`${trustX - 9},${rowY + 78} ${trustX + 9},${rowY + 78} ${trustX},${rowY + 62}`}
          fill={R.signal}
          style={{ cursor: "grab" }}
          onPointerDown={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
        />
        <text x={trustX} y={rowY + 100} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.signal}>
          horizon you trust: {trust}
        </text>
      </g>

      {/* warning when trust extends past reliability */}
      <text x={30} y={410} fontFamily={MONO} fontSize={13} fill={inHallucination ? R.error : R.goal} fontWeight={600}>
        {inHallucination
          ? "⚠ past the line; a policy would learn garbage from these hallucinated steps"
          : "within the trustworthy horizon; predictions are coherent and executable here"}
      </text>
    </Stage>
  );
}
