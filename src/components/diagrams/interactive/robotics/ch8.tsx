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
// Fig 8.1 · Query, Key, Value: reading out a weighted sum  (draggable field)
// A row of token cards, each advertising a Key. One token is the active Query.
// Its Query is dotted against every Key, scaled by 1/√d, softmaxed into weights,
// and the readout box shows the resulting weighted sum of Values. A √d slider
// sharpens or flattens the softmax; an auto-cycle steps the Query through tokens.
// ===========================================================================

type QkvTok = { word: string; key: number; val: number };
// Fixed toy vectors: `key` is the raw match affinity for each token, `val` is a
// 1-D stand-in for the Value content each token would hand over.
const QKV_TOKENS: QkvTok[] = [
  { word: "red", key: 8, val: 90 },
  { word: "mug", key: 6, val: 60 },
  { word: "table", key: 2, val: 25 },
  { word: "the", key: 1, val: 8 },
];
// The active Query's affinity toward each Key (the QKᵀ row, pre-scaling).
const QUERY_ROW: Record<number, number[]> = {
  0: [8, 5, 2, 1], // "red" asks: strong to red, some to mug
  1: [5, 8, 3, 1], // "mug"
  2: [2, 3, 8, 2], // "table"
  3: [1, 1, 2, 6], // "the"
};

const softmaxWeights = (scores: number[]) => {
  const m = Math.max(...scores);
  const ex = scores.map((s) => Math.exp(s - m));
  const z = ex.reduce((a, b) => a + b, 0);
  return ex.map((e) => e / z);
};

export function RbAttentionQkv() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [q, setQ] = useState(0); // active query token index
  const [sqrtD, setSqrtD] = useState(2.8); // the √d scaling knob
  const [playing, toggle] = useReducer((p) => !p, false);
  // eased display weights + a cycle timer for the auto-stepper
  const [disp, setDisp] = useState<number[]>(() => [1, 0, 0, 0]);
  const [, setCyc] = useState(0);

  const raw = QUERY_ROW[q];
  const scaled = raw.map((s) => s / sqrtD);
  const target = softmaxWeights(scaled);
  const readout = target.reduce((acc, w, i) => acc + w * QKV_TOKENS[i].val, 0);

  useRafLoop(
    (dt) => {
      setDisp((s) => s.map((v, i) => approach(v, target[i], 0.18, dt)));
      if (playing) {
        setCyc((c) => {
          const n = c + dt;
          if (n > 1.6) {
            setQ((qq) => (qq + 1) % QKV_TOKENS.length);
            return 0;
          }
          return n;
        });
      }
    },
    { playing: inView && !reduced },
  );

  const w = reduced ? target : disp;
  const roVal = reduced
    ? readout
    : w.reduce((acc, v, i) => acc + v * QKV_TOKENS[i].val, 0);

  // layout
  const cardW = 118;
  const gap = 24;
  const rowW = QKV_TOKENS.length * cardW + (QKV_TOKENS.length - 1) * gap;
  const x0 = (720 - rowW) / 2;
  const cardX = (i: number) => x0 + i * (cardW + gap);
  const cardY = 150;
  const cardH = 78;
  const queryX = cardX(q) + cardW / 2;

  const barBase = 356;
  const barMaxH = 92;

  return (
    <Stage
      innerRef={ref}
      title="Fig 8.1 · Query, Key, Value: reading out a weighted sum"
      ariaLabel={`Attention: the query token ${QKV_TOKENS[q].word} reads out a weighted sum of values`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ auto-cycle"}
          </Btn>
          <Tabs
            options={QKV_TOKENS.map((t, i) => ({ id: String(i), label: t.word }))}
            value={String(q)}
            onChange={(v) => {
              setQ(+v);
            }}
          />
          <Slider
            label="√d"
            min={0.8}
            max={8}
            step={0.1}
            value={sqrtD}
            onChange={setSqrtD}
            fmt={(v) => v.toFixed(1)}
          />
        </>
      }
    >
      {/* Query token, floating above the row */}
      <text x={queryX} y={64} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.plan}>
        Query
      </text>
      <rect
        x={queryX - 62}
        y={72}
        width={124}
        height={44}
        rx={9}
        fill={R.fillAmber}
        stroke={R.plan}
        strokeWidth={3}
      />
      <text x={queryX} y={99} textAnchor="middle" fontFamily={MONO} fontSize={16} fontWeight={600} fill={R.ink}>
        &quot;{QKV_TOKENS[q].word}&quot;
      </text>
      {/* connector down to the row it is scoring against */}
      <line
        x1={queryX}
        y1={116}
        x2={queryX}
        y2={cardY - 6}
        stroke={R.plan}
        strokeWidth={2}
        strokeDasharray="4 5"
      />

      {/* the row of Key cards */}
      {QKV_TOKENS.map((t, i) => {
        const weight = w[i];
        const lit = weight > 0.06;
        const cx = cardX(i);
        return (
          <g key={t.word}>
            <rect
              x={cx}
              y={cardY}
              width={cardW}
              height={cardH}
              rx={9}
              fill={lit ? R.fillBlue : "#eeeeec"}
              stroke={lit ? R.signal : R.world}
              strokeWidth={2 + 3 * weight}
            />
            <text
              x={cx + cardW / 2}
              y={cardY + 28}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={16}
              fontWeight={600}
              fill={R.ink}
            >
              {t.word}
            </text>
            <text x={cx + cardW / 2} y={cardY + 50} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
              Key
            </text>
            <text x={cx + cardW / 2} y={cardY + 68} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
              raw {raw[i]} → {(raw[i] / sqrtD).toFixed(1)}
            </text>

            {/* attention-weight bar */}
            <rect
              x={cx + cardW / 2 - 26}
              y={barBase - barMaxH}
              width={52}
              height={barMaxH}
              rx={4}
              fill="#eeeeec"
            />
            <rect
              x={cx + cardW / 2 - 26}
              y={barBase - barMaxH * weight}
              width={52}
              height={barMaxH * weight}
              rx={4}
              fill={weight > 0.25 ? R.goal : R.signal}
            />
            <text
              x={cx + cardW / 2}
              y={barBase + 18}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={13}
              fill={weight > 0.25 ? R.goal : R.world}
              fontWeight={weight > 0.25 ? 600 : 400}
            >
              {weight.toFixed(2)}
            </text>
          </g>
        );
      })}

      {/* weight-bar lane label */}
      <text x={x0} y={barBase - barMaxH - 10} fontFamily={MONO} fontSize={13} fill={R.world}>
        attention weights = softmax(QKᵀ / √d)
      </text>

      {/* readout box (fixed lane, bottom) */}
      <rect x={230} y={392} width={260} height={38} rx={8} fill={R.fillGreen} stroke={R.goal} strokeWidth={2.5} />
      <text x={244} y={416} fontFamily={MONO} fontSize={14} fill={R.world}>
        readout Σ wᵢVᵢ =
      </text>
      <text x={440} y={416} textAnchor="middle" fontFamily={MONO} fontSize={16} fontWeight={600} fill={R.goal}>
        {roVal.toFixed(1)}
      </text>

      {reduced && (
        <text x={x0} y={432} fontFamily={MONO} fontSize={12} fill={R.world}>
          Reduced motion: static; tabs and √d still recompute the weights.
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 8.2 · Patchify: turning an image into a sequence of tokens
// (slider-driven diagram): a patch-size selector re-tiles a sample image live
// and reports patches-per-side, total tokens, and the ∝ tokens² attention cost.
// A "show positional embeddings" toggle stamps each token with a position badge.
// ===========================================================================

const PATCH_SIZES = [8, 16, 32] as const;
const IMG_PX = 224;

export function RbPatchify() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [patch, setPatch] = useState<number>(16);
  const [showPos, setShowPos] = useState(true);
  const [playing, toggle] = useReducer((p) => !p, true);
  const [t, setT] = useState(0); // 0..1 chop-and-flatten progress

  useRafLoop(
    (dt) => setT((v) => (v + dt * 0.5 > 1 ? 1 : v + dt * 0.5)),
    { playing: inView && !reduced && playing && t < 1 },
  );
  const prog = reduced ? 1 : t;

  const perSide = IMG_PX / patch; // 28 / 14 / 7
  const tokens = perSide * perSide;
  const baseTokens = 196; // patch 16 reference
  const cost = (tokens * tokens) / (baseTokens * baseTokens); // ∝ tokens²

  // image panel
  const imgX = 40;
  const imgY = 70;
  const imgS = 260;
  const grid = perSide;
  const cell = imgS / grid;
  const rng = mulberry32(7);
  // a fixed decorative scene tint per cell so re-tiling looks like a real image
  const cellTint = Array.from({ length: 64 }, () => 0.25 + rng() * 0.5);

  // token strip panel
  const stripX = 400;
  const stripY = 96;

  return (
    <Stage
      innerRef={ref}
      title="Fig 8.2 · Patchify: turning an image into a sequence of tokens"
      ariaLabel={`An image split into ${tokens} patches of size ${patch}, feeding a transformer`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ animate"}
          </Btn>
          <Tabs
            options={PATCH_SIZES.map((p) => ({ id: String(p), label: `${p}px` }))}
            value={String(patch)}
            onChange={(v) => {
              setPatch(+v);
              setT(0);
            }}
          />
          <Btn onClick={() => setShowPos((v) => !v)} active={showPos}>
            {showPos ? "✓ positional embeddings" : "show positional embeddings"}
          </Btn>
          <Btn onClick={() => setT(0)}>↺ reset</Btn>
        </>
      }
    >
      {/* source image with patch grid */}
      <text x={imgX} y={54} fontFamily={MONO} fontSize={13} fill={R.world}>
        224×224 image
      </text>
      <rect x={imgX} y={imgY} width={imgS} height={imgS} rx={6} fill="#e6e6e3" stroke={R.world} strokeWidth={2} />
      {Array.from({ length: grid * grid }).map((_, i) => {
        const gx = i % grid;
        const gy = Math.floor(i / grid);
        const tint = cellTint[i % 64];
        // patches lift off in reading order as prog advances
        const order = (gy * grid + gx) / (grid * grid);
        const lifted = prog > order;
        return (
          <rect
            key={i}
            x={imgX + gx * cell + (lifted ? 0.6 : 0)}
            y={imgY + gy * cell + (lifted ? 0.6 : 0)}
            width={cell - 1.2}
            height={cell - 1.2}
            fill={`rgba(90,120,170,${tint})`}
            stroke={R.signal}
            strokeWidth={0.8}
            opacity={lifted ? 0.4 : 1}
          />
        );
      })}

      {/* arrow from image to token strip */}
      {svgArrow(imgX + imgS + 12, imgY + imgS / 2, stripX - 14, imgY + imgS / 2, R.line, 2.5, 9)}

      {/* resulting token sequence (show up to 8 as representative) */}
      <text x={stripX} y={80} fontFamily={MONO} fontSize={13} fill={R.world}>
        sequence of patch tokens →
      </text>
      {Array.from({ length: 7 }).map((_, i) => {
        const bx = stripX + i * 40;
        const shown = prog > i / 8;
        return (
          <g key={i} opacity={shown ? 1 : 0.15}>
            <rect x={bx} y={stripY} width={30} height={34} rx={5} fill={R.fillBlue} stroke={R.signal} strokeWidth={2} />
            {showPos && (
              <>
                <circle cx={bx + 30} cy={stripY} r={7} fill={R.fillAmber} stroke={R.plan} strokeWidth={1.5} />
                <text x={bx + 30} y={stripY + 3.5} textAnchor="middle" fontFamily={MONO} fontSize={9} fill={R.plan}>
                  {i + 1}
                </text>
              </>
            )}
          </g>
        );
      })}
      <text x={stripX + 280} y={stripY + 22} fontFamily={MONO} fontSize={18} fill={R.world}>
        …
      </text>
      {showPos && (
        <text x={stripX} y={stripY + 62} fontFamily={MONO} fontSize={12} fill={R.plan}>
          amber badge = positional embedding (&quot;you were here&quot;)
        </text>
      )}

      {/* transformer block */}
      <rect x={stripX + 30} y={168} width={230} height={44} rx={8} fill="#eeeeec" stroke={R.world} strokeWidth={2} />
      <text x={stripX + 145} y={195} textAnchor="middle" fontFamily={MONO} fontSize={15} fontWeight={600} fill={R.ink}>
        transformer
      </text>
      {svgArrow(stripX + 145, 148, stripX + 145, 166, R.line, 2.5, 8)}

      {/* readout lane (fixed, bottom) */}
      <text x={imgX} y={372} fontFamily={MONO} fontSize={14} fill={R.world}>
        patches/side
      </text>
      <text x={imgX + 140} y={372} fontFamily={MONO} fontSize={14} fontWeight={600} fill={R.signal}>
        {perSide} × {perSide}
      </text>
      <text x={imgX} y={398} fontFamily={MONO} fontSize={14} fill={R.world}>
        total tokens
      </text>
      <text x={imgX + 140} y={398} fontFamily={MONO} fontSize={14} fontWeight={600} fill={R.goal}>
        {tokens}
      </text>
      <text x={imgX} y={424} fontFamily={MONO} fontSize={14} fill={R.world}>
        attn cost ∝ tokens²
      </text>
      <text x={imgX + 200} y={424} fontFamily={MONO} fontSize={14} fontWeight={600} fill={cost > 1 ? R.error : R.goal}>
        {cost >= 1 ? `${cost.toFixed(0)}×` : `${cost.toFixed(2)}×`} (vs 16px)
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 8.3 · The shared embedding space  (draggable field)
// A 2D projection with image dots and caption chips. "train step" runs one
// contrastive update: the true (image, caption) pair slides together while
// mismatches drift apart, and the similarity grid's diagonal lights up green.
// ===========================================================================

type Emb = { label: string; ix: number; iy: number; tx: number; ty: number };
// random-init positions (…x0) and trained targets (…x1) for each concept
const PAIRS: { label: string; ix0: number; iy0: number; tx0: number; ty0: number; hx: number; hy: number }[] = [
  { label: "red mug", ix0: 120, iy0: 120, tx0: 300, ty0: 300, hx: 170, hy: 130 },
  { label: "blue box", ix0: 320, iy0: 110, tx0: 130, ty0: 250, hx: 320, hy: 250 },
  { label: "green cup", ix0: 140, iy0: 300, tx0: 330, ty0: 130, hx: 130, hy: 340 },
];

export function RbSharedSpace() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [progress, setProgress] = useState(0); // 0 = random init, 1 = trained
  const [target, setTarget] = useState(0);
  const [disp, setDisp] = useState<Emb[]>(() =>
    PAIRS.map((p) => ({ label: p.label, ix: p.ix0, iy: p.iy0, tx: p.tx0, ty: p.ty0 })),
  );

  useRafLoop(
    (dt) => {
      setProgress((v) => approach(v, target, 0.12, dt));
      setDisp((s) =>
        s.map((e, i) => {
          const p = PAIRS[i];
          const g = reduced ? 1 : progress;
          return {
            label: e.label,
            ix: lerp(p.ix0, p.hx, g),
            iy: lerp(p.iy0, p.hy, g),
            tx: lerp(p.tx0, p.hx + 42, g),
            ty: lerp(p.ty0, p.hy + 8, g),
          };
        }),
      );
    },
    { playing: inView && !reduced },
  );

  const g = reduced ? 1 : progress;
  const pts = disp.map((e, i) => {
    const p = PAIRS[i];
    return {
      label: e.label,
      ix: lerp(p.ix0, p.hx, g),
      iy: lerp(p.iy0, p.hy, g),
      tx: lerp(p.tx0, p.hx + 42, g),
      ty: lerp(p.ty0, p.hy + 8, g),
    };
  });

  const trainStep = () => setTarget((v) => clamp(v + 0.34, 0, 1));
  const reset = () => {
    setTarget(0);
    setProgress(0);
  };

  // similarity grid (right lane): diagonal brightens as g -> 1
  const gx0 = 470;
  const gy0 = 110;
  const gcell = 62;
  const n = PAIRS.length;

  return (
    <Stage
      innerRef={ref}
      title="Fig 8.3 · The shared embedding space"
      ariaLabel={`A shared image-text embedding space, training progress ${Math.round(g * 100)} percent`}
      controls={
        <>
          <Btn onClick={trainStep} title="run one contrastive update">
            ▸ train step
          </Btn>
          <Tabs
            options={[
              { id: "0", label: "random init" },
              { id: "1", label: "trained" },
            ]}
            value={g > 0.5 ? "1" : "0"}
            onChange={(v) => setTarget(v === "1" ? 1 : 0)}
          />
          <Btn onClick={reset}>↺ reset</Btn>
        </>
      }
    >
      {/* embedding-space panel */}
      <text x={40} y={54} fontFamily={MONO} fontSize={13} fill={R.world}>
        shared embedding space
      </text>
      <rect x={40} y={66} width={400} height={330} rx={8} fill="none" stroke={R.line} strokeWidth={2} />

      {pts.map((p, i) => (
        <g key={p.label}>
          {/* pull line between the true pair */}
          <line
            x1={p.ix}
            y1={p.iy}
            x2={p.tx}
            y2={p.ty}
            stroke={R.goal}
            strokeWidth={1.5}
            strokeDasharray="3 4"
            opacity={0.3 + 0.6 * g}
          />
          {/* image embedding (blue) */}
          <circle cx={p.ix} cy={p.iy} r={11} fill={R.fillBlue} stroke={R.signal} strokeWidth={3} />
          <text x={p.ix} y={p.iy - 16} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.signal}>
            img
          </text>
          {/* text embedding (amber chip) */}
          <rect x={p.tx - 34} y={p.ty - 12} width={68} height={24} rx={6} fill={R.fillAmber} stroke={R.plan} strokeWidth={2} />
          <text x={p.tx} y={p.ty + 4} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.ink}>
            {["red mug", "blue box", "green cup"][i]}
          </text>
        </g>
      ))}

      {/* similarity grid */}
      <text x={gx0} y={94} fontFamily={MONO} fontSize={13} fill={R.world}>
        similarity grid
      </text>
      {Array.from({ length: n * n }).map((_, k) => {
        const r = Math.floor(k / n);
        const c = k % n;
        const diag = r === c;
        const val = diag ? 0.2 + 0.8 * g : 0.6 * (1 - g) + 0.05;
        const fill = diag
          ? `rgba(91,214,160,${val})`
          : `rgba(207,59,59,${clamp(val, 0.05, 0.55)})`;
        return (
          <g key={k}>
            <rect
              x={gx0 + c * gcell}
              y={gy0 + r * gcell}
              width={gcell - 4}
              height={gcell - 4}
              rx={5}
              fill={fill}
              stroke={diag ? R.goal : R.error}
              strokeWidth={diag ? 2.5 : 1}
            />
          </g>
        );
      })}
      <text x={gx0} y={gy0 + n * gcell + 22} fontFamily={MONO} fontSize={12} fill={R.goal}>
        green diagonal = true pairs pulled together
      </text>
      <text x={gx0} y={gy0 + n * gcell + 40} fontFamily={MONO} fontSize={12} fill={R.error}>
        red off-diagonal = mismatches pushed apart
      </text>

      {/* progress readout */}
      <text x={40} y={422} fontFamily={MONO} fontSize={13} fill={R.world}>
        training progress
      </text>
      <rect x={160} y={412} width={160} height={11} rx={5} fill="#e7e7e4" />
      <rect x={160} y={412} width={160 * g} height={11} rx={5} fill={R.goal} />
      <text x={330} y={422} fontFamily={MONO} fontSize={13} fill={R.ink}>
        {Math.round(g * 100)}%
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 8.4 · CLIP's softmax-over-batch vs SigLIP's independent sigmoid pairs
// (toggle-compare): the same batch grid two ways. CLIP mode draws the softmax
// coupling links across each row; shrinking the batch dims CLIP's contrast while
// SigLIP's per-cell yes/no decisions stay crisp.
// ===========================================================================

export function RbClipVsSiglip() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [mode, setMode] = useState<"clip" | "siglip">("clip");
  const [batch, setBatch] = useState(6);
  const [showCoupling, setShowCoupling] = useState(true);
  const [couple, setCouple] = useState(1); // eased coupling-link opacity

  useRafLoop(
    (dt) => setCouple((v) => approach(v, mode === "clip" && showCoupling ? 1 : 0, 0.2, dt)),
    { playing: inView && !reduced },
  );
  const coupleOp = reduced ? (mode === "clip" && showCoupling ? 1 : 0) : couple;

  const n = batch;
  const gx0 = 60;
  const gy0 = 90;
  const gsize = Math.min(46, 300 / n);
  // contrast: CLIP degrades with small batch (fewer negatives); SigLIP steady.
  const clipContrast = clamp((batch - 2) / 10, 0.15, 1);
  const contrast = mode === "clip" ? clipContrast : 1;

  return (
    <Stage
      innerRef={ref}
      title="Fig 8.4 · CLIP softmax-over-batch vs SigLIP sigmoid pairs"
      ariaLabel={`${mode === "clip" ? "CLIP softmax" : "SigLIP sigmoid"} similarity grid at batch size ${batch}`}
      controls={
        <>
          <Tabs
            options={[
              { id: "clip", label: "CLIP (softmax)" },
              { id: "siglip", label: "SigLIP (sigmoid)" },
            ]}
            value={mode}
            onChange={setMode}
          />
          <Slider label="batch" min={2} max={12} value={batch} onChange={setBatch} fmt={(v) => `${v}`} />
          <Btn onClick={() => setShowCoupling((v) => !v)} active={showCoupling}>
            {showCoupling ? "✓ highlight coupling" : "highlight coupling"}
          </Btn>
        </>
      }
    >
      <text x={gx0} y={70} fontFamily={MONO} fontSize={14} fill={R.world}>
        batch similarity grid ({n} images × {n} captions)
      </text>

      {/* coupling links across each row (CLIP only) */}
      {coupleOp > 0.01 &&
        Array.from({ length: n }).map((_, r) => (
          <line
            key={`c${r}`}
            x1={gx0 + gsize / 2}
            y1={gy0 + r * gsize + gsize / 2}
            x2={gx0 + (n - 0.5) * gsize}
            y2={gy0 + r * gsize + gsize / 2}
            stroke={R.plan}
            strokeWidth={2}
            opacity={0.55 * coupleOp}
          />
        ))}

      {Array.from({ length: n * n }).map((_, k) => {
        const r = Math.floor(k / n);
        const c = k % n;
        const diag = r === c;
        const cx = gx0 + c * gsize;
        const cy = gy0 + r * gsize;
        const fill = diag
          ? `rgba(91,214,160,${0.25 + 0.7 * contrast})`
          : `rgba(207,59,59,${0.12 + 0.28 * contrast})`;
        return (
          <rect
            key={k}
            x={cx}
            y={cy}
            width={gsize - 3}
            height={gsize - 3}
            rx={4}
            fill={fill}
            stroke={diag ? R.goal : R.error}
            strokeWidth={diag ? 2 : 0.8}
          />
        );
      })}

      {/* right-lane explainer (fixed) */}
      <line x1={470} y1={80} x2={470} y2={400} stroke={R.line} strokeWidth={1.5} strokeDasharray="4 6" />
      {mode === "clip" ? (
        <>
          <text x={492} y={120} fontFamily={MONO} fontSize={15} fontWeight={600} fill={R.plan}>
            softmax per row
          </text>
          <text x={492} y={150} fontFamily={MONO} fontSize={13} fill={R.world}>
            each image normalized
          </text>
          <text x={492} y={170} fontFamily={MONO} fontSize={13} fill={R.world}>
            over the whole batch,
          </text>
          <text x={492} y={190} fontFamily={MONO} fontSize={13} fill={R.plan}>
            couples every cell (amber)
          </text>
          <text x={492} y={230} fontFamily={MONO} fontSize={13} fill={batch < 6 ? R.error : R.world}>
            small batch → weak signal
          </text>
          <text x={492} y={250} fontFamily={MONO} fontSize={13} fill={batch < 6 ? R.error : R.world}>
            (needs huge batches)
          </text>
        </>
      ) : (
        <>
          <text x={492} y={120} fontFamily={MONO} fontSize={15} fontWeight={600} fill={R.goal}>
            sigmoid per pair
          </text>
          <text x={492} y={150} fontFamily={MONO} fontSize={13} fill={R.world}>
            each cell is an
          </text>
          <text x={492} y={170} fontFamily={MONO} fontSize={13} fill={R.world}>
            independent yes / no,
          </text>
          <text x={492} y={190} fontFamily={MONO} fontSize={13} fill={R.goal}>
            no cross-cell coupling
          </text>
          <text x={492} y={230} fontFamily={MONO} fontSize={13} fill={R.goal}>
            small batch → still crisp
          </text>
          <text x={492} y={250} fontFamily={MONO} fontSize={13} fill={R.goal}>
            (stable & cheaper)
          </text>
        </>
      )}
      <circle cx={500} cy={300} r={7} fill={R.goal} />
      <text x={514} y={305} fontFamily={MONO} fontSize={12} fill={R.world}>
        match (yes)
      </text>
      <circle cx={500} cy={326} r={7} fill={R.error} />
      <text x={514} y={331} fontFamily={MONO} fontSize={12} fill={R.world}>
        mismatch (no)
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 8.5 · Anatomy of a VLM: vision encoder → projector → LLM
// (animated pipeline): an image flows through VISION ENCODER (SigLIP) →
// PROJECTOR → LLM; projected visual tokens interleave with prompt tokens and the
// LLM types out an answer. A prompt selector changes the emitted answer.
// ===========================================================================

type VlmBox = { id: string; x: number; label: string; sub: string; color: string; fill: string };
const VLM_BOXES: VlmBox[] = [
  { id: "enc", x: 130, label: "VISION", sub: "SigLIP encoder", color: R.signal, fill: R.fillBlue },
  { id: "proj", x: 360, label: "PROJECTOR", sub: "align spaces", color: R.world, fill: "#eeeeec" },
  { id: "llm", x: 590, label: "LLM", sub: "attend + generate", color: R.plan, fill: R.fillAmber },
];
const VLM_PROMPTS: { id: string; q: string; a: string }[] = [
  { id: "what", q: "What is this?", a: "a red mug on a table" },
  { id: "point", q: "Point to the red mug", a: "(0.62, 0.41)" },
  { id: "chip", q: "Is the left one chipped?", a: "no, the left one is fine" },
];

export function RbVlmAnatomy() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [prompt, setPrompt] = useState("what");
  const [showTokens, setShowTokens] = useState(true);
  const [playing, toggle] = useReducer((p) => !p, true);
  const [t, setT] = useState(0); // 0..3 token position along the pipeline

  useRafLoop(
    (dt) => setT((v) => (v + dt * 0.6 > 3 ? 0 : v + dt * 0.6)),
    { playing: inView && !reduced && playing },
  );
  const prog = reduced ? 3 : t;

  const boxY = 120;
  const boxW = 150;
  const boxH = 76;
  const tokenX = reduced
    ? VLM_BOXES[2].x
    : lerp(VLM_BOXES[0].x, VLM_BOXES[2].x, clamp(prog / 3, 0, 1));

  const active = (i: number) => {
    if (reduced) return 0.8;
    const d = Math.abs(VLM_BOXES[i].x - tokenX);
    return clamp(1 - d / 120, 0, 1);
  };

  const ans = VLM_PROMPTS.find((p) => p.id === prompt)!;
  // type-out: reveal the answer as the token reaches the LLM
  const revealed = reduced ? ans.a.length : Math.floor(clamp((prog - 2) / 1, 0, 1) * ans.a.length);

  return (
    <Stage
      innerRef={ref}
      title="Fig 8.5 · Anatomy of a VLM: vision encoder → projector → LLM"
      ariaLabel="A vision-language model forward pass: encoder to projector to LLM"
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Tabs
            options={VLM_PROMPTS.map((p) => ({ id: p.id, label: p.q }))}
            value={prompt}
            onChange={setPrompt}
          />
          <Btn onClick={() => setShowTokens((v) => !v)} active={showTokens}>
            {showTokens ? "✓ show token sequence" : "show token sequence"}
          </Btn>
        </>
      }
    >
      {/* image entering the encoder */}
      <rect x={26} y={boxY + 10} width={44} height={44} rx={5} fill="#e6e6e3" stroke={R.world} strokeWidth={2} />
      <circle cx={40} cy={boxY + 40} r={7} fill={R.error} />
      <text x={48} y={boxY - 6} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.world}>
        image
      </text>

      {/* pipeline arrows */}
      {svgArrow(72, boxY + boxH / 2, VLM_BOXES[0].x - boxW / 2 - 4, boxY + boxH / 2, R.line, 2.5, 8)}
      {svgArrow(VLM_BOXES[0].x + boxW / 2 + 2, boxY + boxH / 2, VLM_BOXES[1].x - boxW / 2 - 4, boxY + boxH / 2, R.line, 2.5, 8)}
      {svgArrow(VLM_BOXES[1].x + boxW / 2 + 2, boxY + boxH / 2, VLM_BOXES[2].x - boxW / 2 - 4, boxY + boxH / 2, R.line, 2.5, 8)}

      {/* three boxes */}
      {VLM_BOXES.map((b, i) => {
        const a = active(i);
        return (
          <g key={b.id}>
            <rect
              x={b.x - boxW / 2}
              y={boxY}
              width={boxW}
              height={boxH}
              rx={10}
              fill={b.fill}
              stroke={b.color}
              strokeWidth={2 + 3 * a}
            />
            <text x={b.x} y={boxY + 34} textAnchor="middle" fontFamily={MONO} fontSize={16} fontWeight={600} fill={R.ink}>
              {b.label}
            </text>
            <text x={b.x} y={boxY + 56} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
              {b.sub}
            </text>
          </g>
        );
      })}

      {/* travelling token */}
      {!reduced && (
        <>
          <circle cx={tokenX} cy={boxY + boxH / 2} r={12} fill={R.signal} opacity={0.25} />
          <circle cx={tokenX} cy={boxY + boxH / 2} r={7} fill={R.signal} />
        </>
      )}

      {/* interleaved token sequence into the LLM */}
      {showTokens && (
        <>
          <text x={40} y={252} fontFamily={MONO} fontSize={13} fill={R.world}>
            LLM input sequence (visual tokens + prompt tokens):
          </text>
          {Array.from({ length: 4 }).map((_, i) => (
            <g key={`v${i}`}>
              <rect x={40 + i * 40} y={264} width={32} height={30} rx={5} fill={R.fillBlue} stroke={R.signal} strokeWidth={2} />
              <text x={56 + i * 40} y={284} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.signal}>
                v{i + 1}
              </text>
            </g>
          ))}
          {ans.q.split(" ").slice(0, 4).map((wd, i) => (
            <g key={`t${i}`}>
              <rect x={210 + i * 60} y={264} width={54} height={30} rx={5} fill={R.fillAmber} stroke={R.plan} strokeWidth={2} />
              <text x={237 + i * 60} y={284} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.ink}>
                {wd}
              </text>
            </g>
          ))}
        </>
      )}

      {/* emitted answer (green, types out) */}
      <text x={40} y={340} fontFamily={MONO} fontSize={13} fill={R.world}>
        answer →
      </text>
      <text x={130} y={340} fontFamily={MONO} fontSize={15} fontWeight={600} fill={R.goal}>
        {ans.a.slice(0, revealed)}
        {revealed < ans.a.length ? "▌" : ""}
      </text>

      {/* provenance note */}
      <text x={40} y={392} fontFamily={MONO} fontSize={12} fill={R.world}>
        π0 uses PaliGemma; OpenVLA uses DINOv2 + SigLIP
      </text>

      {reduced && (
        <text x={40} y={416} fontFamily={MONO} fontSize={12} fill={R.world}>
          Reduced motion: static final state; prompt tabs still change the answer.
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 8.6 · Diffusion vs flow matching  (toggle-compare)
// Two ways to transport noise (left, red) to a data target (right, green).
// Diffusion: a sample stutters along a wiggly path over many steps. Flow
// matching: the same sample glides along a near-straight velocity field in a
// few. Dropping the step count breaks diffusion but flow matching still lands.
// ===========================================================================

export function RbDiffusionVsFlow() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [mode, setMode] = useState<"diffusion" | "flow">("flow");
  const [steps, setSteps] = useState(6);
  const [showField, setShowField] = useState(true);
  const [playing, toggle] = useReducer((p) => !p, true);
  const [t, setT] = useState(0); // 0..1 journey progress

  useRafLoop(
    (dt) => setT((v) => (v + dt * 0.28 > 1 ? 0 : v + dt * 0.28)),
    { playing: inView && !reduced && playing },
  );
  const prog = reduced ? 1 : t;

  const startX = 120;
  const endX = 600;
  const midY = 220;
  const rng = mulberry32(11);
  // per-step jitter for the diffusion path (seeded, deterministic)
  const jitter = Array.from({ length: 40 }, () => (rng() - 0.5) * 2);

  // accuracy: too few steps derails diffusion; flow stays on target
  const flowLands = true;
  const diffLands = steps >= 8;

  // sample position
  const k = Math.floor(prog * steps); // current integration step
  let sampleX: number;
  let sampleY: number;
  if (mode === "flow") {
    sampleX = lerp(startX, endX, prog);
    sampleY = midY + Math.sin(prog * Math.PI) * 6; // barely any curvature
  } else {
    sampleX = lerp(startX, endX, prog);
    const wig = diffLands ? 30 : 70;
    sampleY = midY + (jitter[k % 40] || 0) * wig - (diffLands ? 0 : (1 - prog) * 40);
  }
  return (
    <Stage
      innerRef={ref}
      title="Fig 8.6 · Diffusion vs flow matching"
      ariaLabel={`${mode} transporting noise to data over ${steps} steps`}
      controls={
        <>
          <Tabs
            options={[
              { id: "diffusion", label: "Diffusion" },
              { id: "flow", label: "Flow matching" },
            ]}
            value={mode}
            onChange={(m) => {
              setMode(m);
              setT(0);
            }}
          />
          <Slider label="steps" min={1} max={40} value={steps} onChange={setSteps} fmt={(v) => `${v}`} />
          <Btn onClick={() => setShowField((v) => !v)} active={showField}>
            {showField ? "✓ velocity field" : "show velocity field"}
          </Btn>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Btn onClick={() => setT(0)}>↺ reset</Btn>
        </>
      }
    >
      {/* noise cloud (left, red) */}
      <text x={startX} y={70} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.error}>
        noise (t=0)
      </text>
      {Array.from({ length: 12 }).map((_, i) => (
        <circle
          key={i}
          cx={startX + (mulberry32(i + 1)() - 0.5) * 60}
          cy={midY + (mulberry32(i + 50)() - 0.5) * 120}
          r={3}
          fill={R.error}
          opacity={0.5}
        />
      ))}

      {/* data target (right, green) */}
      <text x={endX} y={70} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.goal}>
        data (t=1)
      </text>
      <circle cx={endX} cy={midY} r={26} fill={R.fillGreen} stroke={R.goal} strokeWidth={3} />
      <text x={endX} y={midY + 5} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>
        target
      </text>

      {/* velocity field arrows (flow mode) */}
      {mode === "flow" && showField &&
        Array.from({ length: 6 }).map((_, col) =>
          [-70, 0, 70].map((dy, row) => {
            const ax = startX + 40 + col * 78;
            const ay = midY + dy;
            const ax2 = ax + 46;
            const ay2 = ay + -dy * 0.14; // arrows converge gently toward center
            return (
              <g key={`f${col}-${row}`}>{svgArrow(ax, ay, ax2, ay2, R.plan, 1.8, 6)}</g>
            );
          }),
        )}

      {/* the path taken */}
      {mode === "flow" ? (
        <line x1={startX} y1={midY} x2={endX} y2={midY} stroke={R.world} strokeWidth={2} strokeDasharray="4 5" opacity={0.6} />
      ) : (
        <polyline
          points={Array.from({ length: steps + 1 }, (_, i) => {
            const f = i / steps;
            const wig = diffLands ? 26 : 60;
            return `${lerp(startX, endX, f)},${midY + (jitter[i % 40] || 0) * wig}`;
          }).join(" ")}
          fill="none"
          stroke={R.world}
          strokeWidth={2}
          opacity={0.5}
        />
      )}

      {/* integration step ticks */}
      {Array.from({ length: steps + 1 }).map((_, i) => {
        const f = i / steps;
        return <circle key={i} cx={lerp(startX, endX, f)} cy={midY - 150} r={2.4} fill={R.world} />;
      })}
      <text x={startX} y={midY - 158} fontFamily={MONO} fontSize={12} fill={R.world}>
        {steps} integration steps
      </text>

      {/* the moving sample (blue) */}
      <circle cx={sampleX} cy={sampleY} r={9} fill={R.signal} stroke="var(--background)" strokeWidth={2} />

      {/* readout lane (bottom) */}
      <text x={120} y={392} fontFamily={MONO} fontSize={14} fill={R.world}>
        mode
      </text>
      <text x={200} y={392} fontFamily={MONO} fontSize={14} fontWeight={600} fill={mode === "flow" ? R.goal : R.plan}>
        {mode === "flow" ? "near-straight ODE" : "wiggly stochastic walk"}
      </text>
      <text x={120} y={418} fontFamily={MONO} fontSize={14} fill={R.world}>
        arrival
      </text>
      <text
        x={200}
        y={418}
        fontFamily={MONO}
        fontSize={14}
        fontWeight={600}
        fill={(mode === "flow" ? flowLands : diffLands) ? R.goal : R.error}
      >
        {mode === "flow"
          ? "lands cleanly in a few steps ✓"
          : diffLands
            ? "lands, but needs many steps"
            : "too few steps → lands off-target ✗"}
      </text>

      {reduced && (
        <text x={120} y={70} fontFamily={MONO} fontSize={12} fill={R.world}>
          Reduced motion: static final state; the tab, steps, and field toggle still work.
        </text>
      )}
    </Stage>
  );
}
