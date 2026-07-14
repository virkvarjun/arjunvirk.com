"use client";

import { useMemo, useReducer, useRef, useState } from "react";
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
  v3,
  dot3,
  seg3,
  label3,
  ring3,
  Scene3D,
  useOrbit,
  Legend,
  Readout,
  Transport,
} from "./shared";

// --- small pure math helpers shared by the chapter's figures ----------------

const dotVec = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);

function smax(xs: number[]): number[] {
  const m = Math.max(...xs);
  const ex = xs.map((x) => Math.exp(x - m));
  const z = ex.reduce((a, b) => a + b, 0);
  return ex.map((e) => e / z);
}

// Box–Muller gaussian from a seeded uniform PRNG (deterministic).
function gaussOf(rnd: () => number): () => number {
  return () => {
    const u = Math.max(rnd(), 1e-9);
    const v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

// ===========================================================================
// Fig 8.1 · Query, Key, Value: reading out a weighted sum
// Real Q·K dot products over four 4-dimensional token vectors, a real softmax
// with a √d temperature knob, and the full 4×4 attention-weight matrix as a
// heat grid with the actual values. Hovering or selecting a token recomputes
// every weight; the readout is the true weighted sum of Values.
// ===========================================================================

type QkvTok = { word: string; q: number[]; k: number[]; v: number };
// Hand-designed d=4 query/key vectors: "red" queries for itself and the noun
// it modifies, "mug" for itself and its color, function words for each other.
const QKV_TOKENS: QkvTok[] = [
  { word: "the", q: [0.3, 0.1, 0.4, 1.6], k: [0.1, 0.2, 0.1, 1.8], v: 8 },
  { word: "red", q: [2.0, 1.3, 0.3, 0.1], k: [2.0, 0.4, 0.2, 0.1], v: 90 },
  { word: "mug", q: [1.4, 1.8, 0.5, 0.1], k: [0.5, 1.9, 0.4, 0.1], v: 60 },
  { word: "table", q: [0.4, 0.6, 1.8, 0.3], k: [0.3, 0.5, 1.9, 0.2], v: 25 },
];
// The raw score matrix S[i][j] = q_i · k_j never changes; only the √d
// temperature and the selected row do.
const QKV_S: number[][] = QKV_TOKENS.map((ti) => QKV_TOKENS.map((tj) => dotVec(ti.q, tj.k)));

export function RbAttentionQkv() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [q, setQ] = useState(1); // active query token index ("red")
  const [sqrtD, setSqrtD] = useState(2); // √d temperature (true √4 = 2)
  const [playing, toggle] = useReducer((p) => !p, false);
  const cyc = useRef(0);

  useRafLoop(
    (dt) => {
      if (!playing) return;
      cyc.current += dt;
      if (cyc.current > 1.8) {
        cyc.current = 0;
        setQ((qq) => (qq + 1) % QKV_TOKENS.length);
      }
    },
    { playing: playing && inView && !reduced },
  );

  // the real computation: scale, softmax per row, read out Σ wV for the row
  const W = useMemo(() => QKV_S.map((row) => smax(row.map((s) => s / sqrtD))), [sqrtD]);
  const w = W[q];
  const readout = w.reduce((acc, wi, i) => acc + wi * QKV_TOKENS[i].v, 0);
  const entropy = w.reduce((acc, wi) => acc - (wi > 1e-9 ? wi * Math.log2(wi) : 0), 0);

  // layout lanes
  const cardW = 110;
  const cardGap = 18;
  const x0 = (720 - (4 * cardW + 3 * cardGap)) / 2;
  const cardX = (i: number) => x0 + i * (cardW + cardGap);
  const cardY = 104;
  const cardH = 56;
  const gridX = 118;
  const gridY = 220;
  const cellW = 54;
  const cellH = 44;
  const tabX = [400, 466, 522, 576, 630]; // right-panel table columns

  const maxW = Math.max(...w);
  const hint =
    sqrtD <= 1
      ? "√d too small → scores blow up and softmax saturates: winner-take-all"
      : sqrtD >= 3.5
        ? "√d too large → scores shrink and the weights flatten toward an average"
        : "hover a token — its row of the matrix is the blend it reads out";

  return (
    <Stage
      innerRef={ref}
      title="Fig 8.1 · Query, Key, Value: reading out a weighted sum"
      ariaLabel={`Attention: the query token ${QKV_TOKENS[q].word} reads out a weighted sum of values with softmax weights over all four keys`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ auto-cycle"}
          </Btn>
          <Tabs
            options={QKV_TOKENS.map((t, i) => ({ id: String(i), label: t.word }))}
            value={String(q)}
            onChange={(v) => setQ(+v)}
          />
          <Slider
            label="√d"
            min={0.5}
            max={4}
            step={0.1}
            value={sqrtD}
            onChange={setSqrtD}
            fmt={(v) => v.toFixed(1)}
          />
        </>
      }
    >
      <Readout
        rows={[
          { label: "query", value: `"${QKV_TOKENS[q].word}"`, color: R.plan },
          { label: "√d (temp)", value: sqrtD.toFixed(1), color: R.ink },
          { label: "entropy", value: `${entropy.toFixed(2)} bits`, color: maxW > 0.8 ? R.error : R.ink },
        ]}
      />
      <Legend
        items={[
          { color: R.plan, label: "active query" },
          { color: R.signal, label: "attention weight" },
          { color: R.goal, label: "value readout" },
        ]}
      />

      {/* token cards: hover or click to make one the Query */}
      {QKV_TOKENS.map((t, i) => {
        const active = i === q;
        const cx = cardX(i);
        return (
          <g
            key={t.word}
            style={{ cursor: "pointer" }}
            onPointerEnter={() => setQ(i)}
            onClick={() => setQ(i)}
          >
            {active && (
              <text x={cx + cardW / 2} y={cardY - 8} textAnchor="middle" fontFamily={MONO} fontSize={11.5} fill={R.plan} fontWeight={600}>
                Query
              </text>
            )}
            <rect
              x={cx}
              y={cardY}
              width={cardW}
              height={cardH}
              rx={9}
              fill={active ? R.fillAmber : R.fillBlue}
              stroke={active ? R.plan : R.signal}
              strokeWidth={active ? 3.5 : 2}
            />
            <text x={cx + cardW / 2} y={cardY + 25} textAnchor="middle" fontFamily={MONO} fontSize={16} fontWeight={600} fill={R.ink}>
              {t.word}
            </text>
            <text x={cx + cardW / 2} y={cardY + 45} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
              V = {t.v}
            </text>
          </g>
        );
      })}

      {/* the full weight matrix, computed for real */}
      <text x={gridX} y={198} fontFamily={MONO} fontSize={12.5} fill={R.world}>
        weights = softmax(q·kᵀ / √d)
      </text>
      {QKV_TOKENS.map((t, j) => (
        <text key={`c${t.word}`} x={gridX + j * cellW + cellW / 2} y={214} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
          {t.word}
        </text>
      ))}
      {QKV_TOKENS.map((t, i) => (
        <text key={`r${t.word}`} x={gridX - 8} y={gridY + i * cellH + cellH / 2 + 4} textAnchor="end" fontFamily={MONO} fontSize={12} fill={i === q ? R.plan : R.world} fontWeight={i === q ? 600 : 400}>
          {t.word}
        </text>
      ))}
      {W.map((row, i) =>
        row.map((wij, j) => (
          <g key={`w${i}-${j}`}>
            <rect
              x={gridX + j * cellW + 1.5}
              y={gridY + i * cellH + 1.5}
              width={cellW - 3}
              height={cellH - 3}
              rx={5}
              fill={`rgba(90,120,170,${0.06 + 0.68 * wij})`}
              stroke={R.line}
              strokeWidth={0.8}
            />
            <text
              x={gridX + j * cellW + cellW / 2}
              y={gridY + i * cellH + cellH / 2 + 4.5}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={13}
              fill={R.ink}
              fontWeight={i === q && wij === Math.max(...row) ? 600 : 400}
            >
              {wij.toFixed(2)}
            </text>
          </g>
        )),
      )}
      {/* active row indicator */}
      <rect
        x={gridX - 3}
        y={gridY + q * cellH - 1}
        width={4 * cellW + 6}
        height={cellH + 2}
        rx={7}
        fill="none"
        stroke={R.plan}
        strokeWidth={2.5}
      />

      {/* right panel: the active row worked end to end */}
      <text x={tabX[0]} y={198} fontFamily={MONO} fontSize={12.5} fill={R.world}>
        row &quot;{QKV_TOKENS[q].word}&quot;, worked:
      </text>
      <text x={tabX[0]} y={228} fontFamily={MONO} fontSize={12} fill={R.world}>key</text>
      <text x={tabX[1]} y={228} fontFamily={MONO} fontSize={12} fill={R.world}>q·k</text>
      <text x={tabX[2]} y={228} fontFamily={MONO} fontSize={12} fill={R.world}>/√d</text>
      <text x={tabX[3]} y={228} fontFamily={MONO} fontSize={12} fill={R.world}>w</text>
      <text x={tabX[4]} y={228} fontFamily={MONO} fontSize={12} fill={R.world}>w·V</text>
      {QKV_TOKENS.map((t, j) => {
        const y = 254 + j * 26;
        const strong = w[j] === maxW;
        return (
          <g key={`row${t.word}`}>
            <text x={tabX[0]} y={y} fontFamily={MONO} fontSize={13} fill={R.ink}>{t.word}</text>
            <text x={tabX[1]} y={y} fontFamily={MONO} fontSize={13} fill={R.world}>{QKV_S[q][j].toFixed(2)}</text>
            <text x={tabX[2]} y={y} fontFamily={MONO} fontSize={13} fill={R.world}>{(QKV_S[q][j] / sqrtD).toFixed(2)}</text>
            <text x={tabX[3]} y={y} fontFamily={MONO} fontSize={13} fill={strong ? R.signal : R.world} fontWeight={strong ? 600 : 400}>
              {w[j].toFixed(2)}
            </text>
            <text x={tabX[4]} y={y} fontFamily={MONO} fontSize={13} fill={strong ? R.signal : R.world}>
              {(w[j] * t.v).toFixed(1)}
            </text>
          </g>
        );
      })}
      <rect x={396} y={352} width={280} height={34} rx={8} fill={R.fillGreen} stroke={R.goal} strokeWidth={2.5} />
      <text x={412} y={374} fontFamily={MONO} fontSize={14} fill={R.world}>
        readout Σ wᵢVᵢ =
      </text>
      <text x={618} y={374} textAnchor="middle" fontFamily={MONO} fontSize={16} fontWeight={600} fill={R.goal}>
        {readout.toFixed(1)}
      </text>

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={sqrtD <= 1 || sqrtD >= 3.5 ? R.error : R.world}>
        {reduced ? "Reduced motion: static; hover, tabs, and √d still recompute every weight." : hint}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 8.2 · Patchify: turning an image into a sequence of tokens
// A real (procedurally computed, deterministic) mug scene is re-tiled live by
// the patch-size selector; the token strip carries the actual patch colors and
// each token's positional embedding is a genuinely computed sinusoid,
// PE(pos, 2k) = sin(pos / 10000^(2k/D)), rendered as a heat strip and matrix.
// ===========================================================================

const PATCH_SIZES = [8, 16, 32] as const;
const IMG_PX = 224;
const PE_D = 8;

function sinPE(pos: number, i: number): number {
  const k = Math.floor(i / 2);
  const wl = pos / Math.pow(10000, (2 * k) / PE_D);
  return i % 2 === 0 ? Math.sin(wl) : Math.cos(wl);
}
const peColor = (val: number) =>
  val >= 0 ? `rgba(192,125,22,${Math.min(Math.abs(val), 1)})` : `rgba(80,110,190,${Math.min(Math.abs(val), 1)})`;

// The "photo": a red mug on a table, computed per normalized (u, v) so any
// patch grid re-samples the same underlying scene. Fully deterministic.
function scene82(u: number, v: number): string {
  let c: [number, number, number] = [226 - 16 * v, 229 - 18 * v, 226 - 12 * v]; // wall
  if (v > 0.68) c = [199, 168, 126]; // table
  const sdx = (u - 0.47) / 0.2;
  const sdy = (v - 0.73) / 0.05;
  if (v > 0.68 && sdx * sdx + sdy * sdy < 1) c = [172, 143, 105]; // shadow
  if (u > 0.32 && u < 0.57 && v > 0.36 && v < 0.7) {
    const sh = 0.72 + 0.28 * Math.sin(((u - 0.32) / 0.25) * Math.PI); // cylinder shading
    c = [Math.round(160 + 60 * sh), Math.round(52 * sh + 14), Math.round(52 * sh + 14)];
  }
  const hr = Math.hypot(u - 0.61, (v - 0.52) * 1.15);
  if (u > 0.57 && hr < 0.095 && hr > 0.052 && v < 0.7) c = [196, 66, 62]; // handle
  if (u > 0.32 && u < 0.57 && v > 0.36 && v < 0.39) c = [166, 46, 46]; // rim
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export function RbPatchify() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [patch, setPatch] = useState<number>(16);
  const [showPos, setShowPos] = useState(true);
  const [playing, toggle] = useReducer((p) => !p, true);
  const [t, setT] = useState(0); // 0..1 chop-and-flatten progress

  useRafLoop((dt) => setT((v) => (v + dt * 0.5 > 1 ? 1 : v + dt * 0.5)), {
    playing: inView && !reduced && playing && t < 1,
  });
  const prog = reduced ? 1 : t;

  const perSide = IMG_PX / patch; // 28 / 14 / 7
  const tokens = perSide * perSide;
  const cost = (tokens * tokens) / (196 * 196); // ∝ tokens², vs the 16px case

  // image panel
  const imgX = 40;
  const imgY = 100;
  const imgS = 250;
  const grid = perSide;
  const cell = imgS / grid;
  const cellColors = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < grid * grid; i++) {
      const gx = i % grid;
      const gy = Math.floor(i / grid);
      out.push(scene82((gx + 0.5) / grid, (gy + 0.5) / grid));
    }
    return out;
  }, [grid]);

  // token strip
  const stripX = 390;
  const stripY = 130;
  const chipStep = 38;

  const costLabel = cost >= 1 ? `${cost.toFixed(0)}×` : `${cost.toFixed(2)}×`;

  return (
    <Stage
      innerRef={ref}
      title="Fig 8.2 · Patchify: turning an image into a sequence of tokens"
      ariaLabel={`An image split into ${tokens} patches of size ${patch}, each patch becoming a token with a computed sinusoidal positional embedding, feeding a transformer`}
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
      <Readout
        rows={[
          { label: "patches/side", value: `${perSide} × ${perSide}`, color: R.signal },
          { label: "tokens", value: String(tokens), color: R.goal },
          { label: "attn cost", value: `${costLabel} vs 16px`, color: cost > 1 ? R.error : R.goal },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "patch token" },
          { color: R.plan, label: "positional embedding" },
          { color: R.world, label: "pixels" },
        ]}
      />

      {/* source image with live patch grid */}
      <text x={imgX} y={92} fontFamily={MONO} fontSize={12.5} fill={R.world}>
        224×224 image
      </text>
      <rect x={imgX - 2} y={imgY - 2} width={imgS + 4} height={imgS + 4} rx={6} fill="none" stroke={R.world} strokeWidth={2} />
      {cellColors.map((col, i) => {
        const gx = i % grid;
        const gy = Math.floor(i / grid);
        const order = (gy * grid + gx) / (grid * grid);
        const lifted = prog > order;
        return (
          <rect
            key={i}
            x={imgX + gx * cell + 0.5}
            y={imgY + gy * cell + 0.5}
            width={cell - 1}
            height={cell - 1}
            fill={col}
            stroke={R.signal}
            strokeWidth={0.7}
            opacity={lifted ? 0.45 : 1}
          />
        );
      })}

      {/* arrow: image -> token strip */}
      {svgArrow(imgX + imgS + 14, 152, stripX - 14, 152, R.line, 2.5, 9)}

      {/* the first seven patch tokens, carrying their real patch colors */}
      <text x={stripX} y={118} fontFamily={MONO} fontSize={12.5} fill={R.world}>
        patch tokens (first {Math.min(7, grid)} of {tokens}) →
      </text>
      {Array.from({ length: 7 }).map((_, i) => {
        const bx = stripX + i * chipStep;
        const shown = prog > i / 8;
        return (
          <g key={i} opacity={shown ? 1 : 0.15}>
            <rect x={bx} y={stripY} width={30} height={30} rx={5} fill={cellColors[i % cellColors.length]} stroke={R.signal} strokeWidth={2} />
            {showPos && (
              <>
                {Array.from({ length: PE_D }).map((_, d) => (
                  <rect key={d} x={bx + d * 3.75} y={stripY + 36} width={3.3} height={7} fill={peColor(sinPE(i, d))} />
                ))}
                <text x={bx + 15} y={stripY + 58} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.world}>
                  {i}
                </text>
              </>
            )}
          </g>
        );
      })}
      <text x={stripX + 7 * chipStep + 4} y={stripY + 20} fontFamily={MONO} fontSize={18} fill={R.world}>
        …
      </text>

      {/* the positional-embedding matrix, actually computed */}
      {showPos && (
        <>
          <text x={stripX} y={216} fontFamily={MONO} fontSize={12} fill={R.plan}>
            PE[pos][dim] = sinusoids (computed)
          </text>
          {Array.from({ length: 8 }).map((_, pos) =>
            Array.from({ length: PE_D }).map((_, d) => (
              <rect
                key={`pe${pos}-${d}`}
                x={stripX + d * 14}
                y={224 + pos * 14}
                width={12.5}
                height={12.5}
                rx={2}
                fill={peColor(sinPE(pos, d))}
              />
            )),
          )}
          <text x={stripX} y={352} fontFamily={MONO} fontSize={11.5} fill={R.world}>
            pos ↓ · dim → · amber + / blue −
          </text>
        </>
      )}

      {/* transformer block */}
      <rect x={540} y={260} width={150} height={48} rx={9} fill="#eeeeec" stroke={R.world} strokeWidth={2} />
      <text x={615} y={289} textAnchor="middle" fontFamily={MONO} fontSize={15} fontWeight={600} fill={R.ink}>
        transformer
      </text>
      {svgArrow(615, stripY + 66, 615, 256, R.line, 2.5, 8)}
      <text x={615} y={328} textAnchor="middle" fontFamily={MONO} fontSize={11.5} fill={R.world}>
        attention over {tokens} tokens
      </text>

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={cost > 1 ? R.error : R.world}>
        {reduced
          ? "Reduced motion: static; patch tabs and the PE toggle still recompute everything."
          : `patch ${patch}px → ${tokens} tokens → ${costLabel} the attention cost of the 16px grid`}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 8.3 · The shared embedding space  (true 3D, orbitable)
// Four image embeddings (blue) and four caption embeddings (amber) live on the
// unit sphere. Every "step" runs one real projected-gradient update of the
// symmetric InfoNCE contrastive loss on those eight vectors — matching pairs
// pull together, mismatches push apart — and the readout shows the actual loss
// falling while the 4×4 cosine-similarity grid's diagonal brightens for real.
// ===========================================================================

const EMB_LABELS = ["mug", "box", "cup", "bowl"];
const EMB_TAU = 0.35; // temperature on the similarity logits

function seededSphere(seed: number, n: number): V3[] {
  const g = gaussOf(mulberry32(seed));
  const out: V3[] = [];
  for (let i = 0; i < n; i++) out.push(v3.norm([g(), g(), g()]));
  return out;
}
const EMB_IMG0 = seededSphere(21, 4);
const EMB_TXT0 = seededSphere(57, 4);

// Symmetric InfoNCE loss + exact analytic gradients w.r.t. every embedding.
function contrastiveEval(img: V3[], txt: V3[]) {
  const n = img.length;
  const s = img.map((u) => txt.map((tv) => v3.dot(u, tv) / EMB_TAU));
  const rowP = s.map(smax); // softmax over captions for each image
  const colP = txt.map((_, j) => smax(img.map((_, i) => s[i][j]))); // over images
  const loss = -img.reduce((acc, _, i) => acc + Math.log(rowP[i][i]) + Math.log(colP[i][i]), 0) / (2 * n);
  const dS = img.map((_, i) =>
    txt.map((_, j) => (rowP[i][j] - (i === j ? 1 : 0) + (colP[j][i] - (i === j ? 1 : 0))) / (2 * n)),
  );
  const gImg = img.map((_, i) =>
    txt.reduce<V3>((acc, tj, j) => v3.add(acc, v3.scale(tj, dS[i][j] / EMB_TAU)), [0, 0, 0]),
  );
  const gTxt = txt.map((_, j) =>
    img.reduce<V3>((acc, ui, i) => v3.add(acc, v3.scale(ui, dS[i][j] / EMB_TAU)), [0, 0, 0]),
  );
  return { loss, gImg, gTxt };
}

type EmbState = { img: V3[]; txt: V3[]; step: number };

export function RbSharedSpace() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const orbit = useOrbit(-30, 20);
  const [lr, setLr] = useState(0.3);
  const [playing, setPlaying] = useState(false);
  const [st, setSt] = useState<EmbState>({ img: EMB_IMG0, txt: EMB_TXT0, step: 0 });
  // eased display copies so each gradient jump glides instead of teleporting
  const [dispImg, setDispImg] = useState<V3[]>(EMB_IMG0);
  const [dispTxt, setDispTxt] = useState<V3[]>(EMB_TXT0);
  const acc = useRef(0);

  const doStep = () =>
    setSt((prev) => {
      const { gImg, gTxt } = contrastiveEval(prev.img, prev.txt);
      return {
        img: prev.img.map((u, i) => v3.norm(v3.sub(u, v3.scale(gImg[i], lr * 10)))),
        txt: prev.txt.map((tv, j) => v3.norm(v3.sub(tv, v3.scale(gTxt[j], lr * 10)))),
        step: prev.step + 1,
      };
    });
  const reset = () => {
    setSt({ img: EMB_IMG0, txt: EMB_TXT0, step: 0 });
    setDispImg(EMB_IMG0);
    setDispTxt(EMB_TXT0);
    setPlaying(false);
    orbit.reset();
  };

  useRafLoop(
    (dt) => {
      setDispImg((s) => s.map((p, i) => [
        approach(p[0], st.img[i][0], 0.16, dt),
        approach(p[1], st.img[i][1], 0.16, dt),
        approach(p[2], st.img[i][2], 0.16, dt),
      ] as V3));
      setDispTxt((s) => s.map((p, j) => [
        approach(p[0], st.txt[j][0], 0.16, dt),
        approach(p[1], st.txt[j][1], 0.16, dt),
        approach(p[2], st.txt[j][2], 0.16, dt),
      ] as V3));
      if (playing) {
        acc.current += dt;
        if (acc.current > 0.5) {
          acc.current = 0;
          doStep();
        }
      }
    },
    { playing: inView && !reduced },
  );

  const img = reduced ? st.img : dispImg;
  const txt = reduced ? st.txt : dispTxt;

  // live numbers, always from the true (not eased) state
  const { loss } = useMemo(() => contrastiveEval(st.img, st.txt), [st]);
  const sims = useMemo(() => st.img.map((u) => st.txt.map((tv) => v3.dot(u, tv))), [st]);
  const diag = (sims[0][0] + sims[1][1] + sims[2][2] + sims[3][3]) / 4;
  const off = sims.reduce((a, row, i) => a + row.reduce((b, sv, j) => b + (i === j ? 0 : sv), 0), 0) / 12;

  const cam: Camera3D = { yawDeg: orbit.yawDeg, pitchDeg: orbit.pitchDeg, dist: 4.4, zoom: 138 };
  const prims: Prim3D[] = [
    ...ring3([0, 0, 0], [0, 0, 1], 1, R.line, { width: 1 }),
    ...ring3([0, 0, 0], [1, 0, 0], 1, R.line, { width: 1 }),
    ...ring3([0, 0, 0], [0, 1, 0], 1, R.line, { width: 1 }),
    ...img.flatMap((u, i): Prim3D[] => [
      seg3(u, txt[i], R.goal, { width: 1.5, dash: "3 4", opacity: 0.85 }),
      dot3(u, R.signal, { r: 6 }),
      dot3(txt[i], R.plan, { r: 6 }),
      label3(txt[i], EMB_LABELS[i], R.plan, { dx: 9, dy: -7, size: 12 }),
    ]),
  ];

  // similarity grid overlay (right lane), real cosine values
  const gx0 = 556;
  const gy0 = 140;
  const gc = 30;

  return (
    <Stage
      innerRef={ref}
      title="Fig 8.3 · The shared embedding space"
      ariaLabel={`A shared image-text embedding space on the unit sphere after ${st.step} contrastive gradient steps, loss ${loss.toFixed(2)}. Drag to orbit.`}
      svgProps={orbit.svgProps}
      controls={
        <>
          <Transport playing={playing} onPlay={() => setPlaying((v) => !v)} onStep={doStep} onReset={reset} stepLabel="train step" />
          <Slider label="lr" min={0.05} max={0.8} step={0.05} value={lr} onChange={setLr} fmt={(v) => v.toFixed(2)} />
        </>
      }
    >
      <Scene3D cam={cam} prims={prims} />
      <Readout
        rows={[
          { label: "step", value: String(st.step), color: R.ink },
          { label: "loss", value: loss.toFixed(3), color: loss < 0.2 ? R.goal : R.error },
          { label: "diag cos", value: diag.toFixed(2), color: R.goal },
          { label: "off cos", value: off.toFixed(2), color: R.error },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "image embedding" },
          { color: R.plan, label: "text embedding" },
          { color: R.goal, label: "true pair", dash: true },
        ]}
      />
      <text x={gx0} y={130} fontFamily={MONO} fontSize={12} fill={R.world}>
        cosine similarity
      </text>
      {sims.map((row, i) =>
        row.map((sv, j) => {
          const a = clamp((sv + 1) / 2, 0, 1);
          return (
            <rect
              key={`s${i}-${j}`}
              x={gx0 + j * gc}
              y={gy0 + i * gc}
              width={gc - 3}
              height={gc - 3}
              rx={4}
              fill={i === j ? `rgba(91,214,160,${0.12 + 0.85 * a})` : `rgba(207,59,59,${0.06 + 0.6 * a})`}
              stroke={i === j ? R.goal : R.error}
              strokeWidth={i === j ? 1.8 : 0.7}
            />
          );
        }),
      )}
      <text x={gx0} y={gy0 + 4 * gc + 14} fontFamily={MONO} fontSize={11.5} fill={R.goal}>
        img ↓ txt → · diag = pairs
      </text>
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={st.step === 0 ? R.world : R.goal}>
        {st.step === 0
          ? "▸ train step runs one real gradient update of the contrastive loss · drag to orbit"
          : `diag cos ${diag.toFixed(2)} ↑ · off-diag ${off.toFixed(2)} ↓ — pairs pulled together, mismatches pushed apart`}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 8.4 · CLIP softmax-over-batch vs SigLIP sigmoid pairs  (toggle-compare)
// One seeded pool of 12 (image, caption) embedding pairs in 8-D. The grid shows
// the actual probabilities each loss assigns: CLIP's row-softmax (every cell
// renormalized over the batch) versus SigLIP's independent per-pair sigmoids,
// with both losses computed for real as the batch slider moves.
// ===========================================================================

const CVS_D = 8;
const CVS_SCALE = 6; // logit scale (CLIP's learned temperature, fixed here)
const SIG_A = 6;
const SIG_B = -2.2; // SigLIP's bias: most random pairs should score "no"
const CVS_SIM: number[][] = (() => {
  const g = gaussOf(mulberry32(91));
  const unit = (v: number[]) => {
    const l = Math.hypot(...v) || 1;
    return v.map((x) => x / l);
  };
  const imgs: number[][] = [];
  const txts: number[][] = [];
  for (let i = 0; i < 12; i++) {
    const u = unit(Array.from({ length: CVS_D }, () => g()));
    imgs.push(u);
    txts.push(unit(u.map((x) => x + 0.6 * g()))); // caption = noisy copy of its image
  }
  return imgs.map((u) => txts.map((tv) => dotVec(u, tv)));
})();

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
  const { clipP, sigP, clipLoss, sigLoss } = useMemo(() => {
    const s = Array.from({ length: n }, (_, i) => CVS_SIM[i].slice(0, n));
    const cp = s.map((row) => smax(row.map((x) => x * CVS_SCALE)));
    const sp = s.map((row) => row.map((x) => 1 / (1 + Math.exp(-(SIG_A * x + SIG_B)))));
    const cl = -cp.reduce((a, row, i) => a + Math.log(row[i]), 0) / n;
    const sl =
      -sp.reduce(
        (a, row, i) => a + row.reduce((b, p, j) => b + (i === j ? Math.log(p) : Math.log(1 - p)), 0),
        0,
      ) / (n * n);
    return { clipP: cp, sigP: sp, clipLoss: cl, sigLoss: sl };
  }, [n]);
  const P = mode === "clip" ? clipP : sigP;

  const gx0 = 60;
  const gy0 = 126;
  const gsize = Math.min(42, 276 / n);
  const showNums = gsize >= 36;

  return (
    <Stage
      innerRef={ref}
      title="Fig 8.4 · CLIP softmax-over-batch vs SigLIP sigmoid pairs"
      ariaLabel={`${mode === "clip" ? "CLIP softmax" : "SigLIP sigmoid"} probabilities over a real similarity grid at batch size ${batch}`}
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
      <Readout
        rows={[
          { label: "negatives/img", value: String(n - 1), color: n < 6 ? R.error : R.ink },
          { label: "CLIP loss", value: clipLoss.toFixed(2), color: mode === "clip" ? R.plan : R.world },
          { label: "SigLIP loss", value: sigLoss.toFixed(2), color: mode === "siglip" ? R.goal : R.world },
        ]}
      />
      <Legend
        items={[
          { color: R.goal, label: "true pair (yes)" },
          { color: R.error, label: "mismatch (no)" },
          { color: R.plan, label: "softmax coupling" },
        ]}
      />
      <text x={gx0} y={116} fontFamily={MONO} fontSize={13} fill={R.world}>
        {mode === "clip" ? "P(caption | image), row-softmax" : "P(match), per-pair sigmoid"} · {n}×{n}
      </text>

      {/* coupling links across each row (CLIP only): a row is one softmax */}
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
            opacity={0.5 * coupleOp}
          />
        ))}

      {P.map((row, r) =>
        row.map((p, c) => {
          const diagCell = r === c;
          return (
            <g key={`${r}-${c}`}>
              <rect
                x={gx0 + c * gsize}
                y={gy0 + r * gsize}
                width={gsize - 3}
                height={gsize - 3}
                rx={4}
                fill={diagCell ? `rgba(91,214,160,${0.1 + 0.85 * p})` : `rgba(207,59,59,${0.05 + 0.7 * p})`}
                stroke={diagCell ? R.goal : R.error}
                strokeWidth={diagCell ? 2 : 0.8}
              />
              {showNums && (
                <text
                  x={gx0 + c * gsize + (gsize - 3) / 2}
                  y={gy0 + r * gsize + gsize / 2 + 3}
                  textAnchor="middle"
                  fontFamily={MONO}
                  fontSize={12}
                  fill={R.ink}
                >
                  {p.toFixed(2)}
                </text>
              )}
            </g>
          );
        }),
      )}

      {/* right-lane explainer */}
      <line x1={470} y1={110} x2={470} y2={400} stroke={R.line} strokeWidth={1.5} strokeDasharray="4 6" />
      {mode === "clip" ? (
        <>
          <text x={492} y={140} fontFamily={MONO} fontSize={15} fontWeight={600} fill={R.plan}>
            softmax per row
          </text>
          <text x={492} y={168} fontFamily={MONO} fontSize={13} fill={R.world}>each row sums to 1 —</text>
          <text x={492} y={188} fontFamily={MONO} fontSize={13} fill={R.world}>every cell competes with</text>
          <text x={492} y={208} fontFamily={MONO} fontSize={13} fill={R.world}>the whole batch at once</text>
          <text x={492} y={248} fontFamily={MONO} fontSize={13} fill={n < 6 ? R.error : R.world}>
            {n - 1} negatives per image
          </text>
          <text x={492} y={272} fontFamily={MONO} fontSize={13} fill={n < 6 ? R.error : R.world}>
            {n < 6 ? "tiny batch → loss " + clipLoss.toFixed(2) : "big batch → loss " + clipLoss.toFixed(2)}
          </text>
          <text x={492} y={292} fontFamily={MONO} fontSize={13} fill={n < 6 ? R.error : R.world}>
            {n < 6 ? "→ too easy, weak signal" : "→ hard negatives teach"}
          </text>
        </>
      ) : (
        <>
          <text x={492} y={140} fontFamily={MONO} fontSize={15} fontWeight={600} fill={R.goal}>
            sigmoid per pair
          </text>
          <text x={492} y={168} fontFamily={MONO} fontSize={13} fill={R.world}>each cell answers yes/no</text>
          <text x={492} y={188} fontFamily={MONO} fontSize={13} fill={R.world}>on its own — no batch-</text>
          <text x={492} y={208} fontFamily={MONO} fontSize={13} fill={R.world}>wide normalization</text>
          <text x={492} y={248} fontFamily={MONO} fontSize={13} fill={R.goal}>
            loss {sigLoss.toFixed(2)} at n = {n}
          </text>
          <text x={492} y={272} fontFamily={MONO} fontSize={13} fill={R.goal}>steady at any batch size</text>
          <text x={492} y={292} fontFamily={MONO} fontSize={13} fill={R.goal}>(stable &amp; cheaper)</text>
        </>
      )}

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {mode === "clip"
          ? "shrink the batch: the diagonal brightens because the softmax ran out of competition"
          : "shrink the batch: each cell's value doesn't move — pairs are judged independently"}
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
  const [playing, setPlaying] = useState(true);
  const [t, setT] = useState(0); // 0..3 token position along the pipeline

  useRafLoop((dt) => setT((v) => (v + dt * 0.6 > 3 ? 0 : v + dt * 0.6)), {
    playing: inView && !reduced && playing,
  });
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
  const qWords = ans.q.split(" ").length;
  // type-out: reveal the answer as the token reaches the LLM
  const revealed = reduced ? ans.a.length : Math.floor(clamp((prog - 2) / 1, 0, 1) * ans.a.length);

  return (
    <Stage
      innerRef={ref}
      title="Fig 8.5 · Anatomy of a VLM: vision encoder → projector → LLM"
      ariaLabel="A vision-language model forward pass: encoder to projector to LLM, visual tokens interleaving with prompt tokens"
      controls={
        <>
          <Transport
            playing={playing}
            onPlay={() => setPlaying((v) => !v)}
            onReset={() => {
              setT(0);
              setPlaying(true);
            }}
          />
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
      <Readout
        rows={[
          { label: "visual tokens", value: "196", color: R.signal },
          { label: "text tokens", value: String(qWords), color: R.plan },
          { label: "LLM sees", value: `${196 + qWords} tokens`, color: R.ink },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "visual tokens" },
          { color: R.plan, label: "text tokens" },
          { color: R.goal, label: "generated answer" },
        ]}
      />

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

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {reduced
          ? "Reduced motion: static final state; prompt tabs still change the answer."
          : "same attention as Fig 8.1 — the prompt's \"red\" can attend straight to the red patch"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 8.6 · Diffusion vs flow matching  (steppable, real samplers)
// One seeded standard-normal point cloud, one two-mode data set, two honest
// samplers. Diffusion runs real DDPM ancestral sampling (cosine ᾱ schedule,
// exact mixture posterior x̂0, stochastic σ̃ξ). Flow matching integrates the
// exact marginal velocity field u(x,t) = (E[x₁|x_t] − x)/(1−t) of the straight
// interpolation paths with Euler steps. Step k/N through either trajectory and
// read the actual mean distance to data — same noise draws for both.
// ===========================================================================

const DVF_SC = 78; // stage px per math unit
const DVF_CX = 330;
const DVF_CY = 245;
const dvfX = (p: [number, number]) => DVF_CX + p[0] * DVF_SC;
const dvfY = (p: [number, number]) => DVF_CY - p[1] * DVF_SC;

const DVF_CENTERS: [number, number][] = [
  [1.55, 0.95],
  [1.55, -0.95],
];
const DVF_DATA: [number, number][] = (() => {
  const g = gaussOf(mulberry32(5));
  const out: [number, number][] = [];
  for (const c of DVF_CENTERS)
    for (let i = 0; i < 9; i++)
      out.push([c[0] + clamp(0.2 * g(), -0.4, 0.4), c[1] + clamp(0.2 * g(), -0.4, 0.4)]);
  return out;
})();
const DVF_NOISE: [number, number][] = (() => {
  const g = gaussOf(mulberry32(23));
  return Array.from({ length: 18 }, () => [clamp(g(), -1.9, 1.9), clamp(g(), -1.9, 1.9)] as [number, number]);
})();

// posterior mean E[x1 | x_t] under the straight paths x_t = (1-t)x0 + t x1,
// x0 ~ N(0, I), x1 uniform over the data points. Exact, no training needed.
function dvfMeanX1(x: [number, number], t: number): [number, number] {
  const sd = Math.max(1 - t, 1 / 64);
  const logw = DVF_DATA.map((d) => {
    const dx = x[0] - t * d[0];
    const dy = x[1] - t * d[1];
    return -(dx * dx + dy * dy) / (2 * sd * sd);
  });
  const w = smax(logw);
  return [
    w.reduce((a, wi, i) => a + wi * DVF_DATA[i][0], 0),
    w.reduce((a, wi, i) => a + wi * DVF_DATA[i][1], 0),
  ];
}
function dvfVelocity(x: [number, number], t: number): [number, number] {
  const m = dvfMeanX1(x, t);
  const inv = 1 / Math.max(1 - t, 1 / 64);
  return [(m[0] - x[0]) * inv, (m[1] - x[1]) * inv];
}

// cosine ᾱ schedule (Nichol & Dhariwal), normalized so ᾱ(0) = 1
const DVF_F0 = Math.cos(((0.008 / 1.008) * Math.PI) / 2) ** 2;
const dvfAbar = (u: number) =>
  u <= 0 ? 1 : clamp(Math.cos((((u + 0.008) / 1.008) * Math.PI) / 2) ** 2 / DVF_F0, 1e-4, 0.9999);

// exact mixture posterior mean E[x0 | x_k] for the DDPM reverse step
function dvfX0hat(x: [number, number], ab: number): [number, number] {
  const s = Math.sqrt(ab);
  const varr = Math.max(1 - ab, 1e-4);
  const logw = DVF_DATA.map((d) => {
    const dx = x[0] - s * d[0];
    const dy = x[1] - s * d[1];
    return -(dx * dx + dy * dy) / (2 * varr);
  });
  const w = smax(logw);
  return [
    w.reduce((a, wi, i) => a + wi * DVF_DATA[i][0], 0),
    w.reduce((a, wi, i) => a + wi * DVF_DATA[i][1], 0),
  ];
}

// Both full trajectories, index 0 = noise … index N = final sample.
function dvfTrajectories(N: number) {
  const cl = (p: [number, number]): [number, number] => [clamp(p[0], -2.4, 2.4), clamp(p[1], -2.2, 2.2)];
  // flow matching: Euler on the exact marginal velocity field (deterministic)
  const flow = DVF_NOISE.map((x0) => {
    const path: [number, number][] = [x0];
    let x = x0;
    for (let k = 0; k < N; k++) {
      const u = dvfVelocity(x, k / N);
      x = cl([x[0] + u[0] / N, x[1] + u[1] / N]);
      path.push(x);
    }
    return path;
  });
  // diffusion: DDPM ancestral sampling with the exact score (stochastic, seeded)
  const g = gaussOf(mulberry32(77));
  const diff = DVF_NOISE.map((x0) => {
    const path: [number, number][] = [x0];
    let x = x0;
    for (let k = N; k >= 1; k--) {
      const ab = dvfAbar(k / N);
      const abPrev = dvfAbar((k - 1) / N);
      const a = ab / abPrev;
      const beta = 1 - a;
      const xh = dvfX0hat(x, ab);
      const c0 = (Math.sqrt(abPrev) * beta) / (1 - ab);
      const c1 = (Math.sqrt(a) * (1 - abPrev)) / (1 - ab);
      const sig = Math.sqrt((beta * (1 - abPrev)) / (1 - ab));
      x = cl([c0 * xh[0] + c1 * x[0] + sig * g(), c0 * xh[1] + c1 * x[1] + sig * g()]);
      path.push(x);
    }
    return path;
  });
  const meanDist = (pts: [number, number][]) =>
    pts.reduce((acc, p) => acc + Math.min(...DVF_DATA.map((d) => Math.hypot(p[0] - d[0], p[1] - d[1]))), 0) /
    pts.length;
  const meanLen = (paths: [number, number][][]) =>
    paths.reduce(
      (acc, path) =>
        acc +
        path.reduce((s, p, i) => (i === 0 ? 0 : s + Math.hypot(p[0] - path[i - 1][0], p[1] - path[i - 1][1])), 0),
      0,
    ) / paths.length;
  return {
    flow,
    diff,
    flowFinal: meanDist(flow.map((p) => p[N])),
    diffFinal: meanDist(diff.map((p) => p[N])),
    flowLen: meanLen(flow),
    diffLen: meanLen(diff),
  };
}

export function RbDiffusionVsFlow() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [mode, setMode] = useState<"diffusion" | "flow">("flow");
  const [steps, setSteps] = useState(4);
  const [showField, setShowField] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [kf, setKf] = useState(0); // fractional step position 0..N

  const { flow, diff, flowFinal, diffFinal, flowLen, diffLen } = useMemo(
    () => dvfTrajectories(steps),
    [steps],
  );

  useRafLoop(
    (dt) => {
      setKf((v) => {
        const nv = v + (dt * steps) / 6;
        if (nv >= steps) {
          setPlaying(false);
          return steps;
        }
        return nv;
      });
    },
    { playing: inView && !reduced && playing && kf < steps },
  );
  const kd = reduced ? steps : kf; // displayed fractional step
  const k0 = Math.min(Math.floor(kd), steps);
  const k1 = Math.min(k0 + 1, steps);
  const frac = clamp(kd - k0, 0, 1);

  const traj = mode === "flow" ? flow : diff;
  const pts = traj.map(
    (p) => [lerp(p[k0][0], p[k1][0], frac), lerp(p[k0][1], p[k1][1], frac)] as [number, number],
  );
  const curDist =
    pts.reduce((acc, p) => acc + Math.min(...DVF_DATA.map((d) => Math.hypot(p[0] - d[0], p[1] - d[1]))), 0) /
    pts.length;

  // the actual field at the current time: velocity (flow) or score (diffusion)
  const arrows = useMemo(() => {
    if (!showField) return [];
    const out: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const t = Math.min(k0, steps - 1) / steps;
    const ab = dvfAbar(Math.max(steps - k0, 1) / steps);
    for (const mx of [-2, -1, 0, 1, 2])
      for (const my of [-1.6, -0.8, 0, 0.8, 1.6]) {
        const p: [number, number] = [mx, my];
        let v: [number, number];
        if (mode === "flow") v = dvfVelocity(p, t);
        else {
          const xh = dvfX0hat(p, ab);
          v = [(Math.sqrt(ab) * xh[0] - mx) / (1 - ab), (Math.sqrt(ab) * xh[1] - my) / (1 - ab)];
        }
        const l = Math.hypot(v[0], v[1]) || 1;
        const s = Math.min(l * 9, 24) / l;
        out.push({ x1: dvfX(p), y1: dvfY(p), x2: dvfX(p) + v[0] * s, y2: dvfY(p) - v[1] * s });
      }
    return out;
  }, [showField, mode, k0, steps]);

  return (
    <Stage
      innerRef={ref}
      title="Fig 8.6 · Diffusion vs flow matching"
      ariaLabel={`${mode} transporting a seeded noise cloud to a two-mode data set, step ${Math.floor(kd)} of ${steps}`}
      controls={
        <>
          <Tabs
            options={[
              { id: "diffusion", label: "Diffusion" },
              { id: "flow", label: "Flow matching" },
            ]}
            value={mode}
            onChange={setMode}
          />
          <Transport
            playing={playing}
            onPlay={() => {
              if (kf >= steps) setKf(0);
              setPlaying((v) => !v);
            }}
            onStep={() => {
              setPlaying(false);
              setKf((v) => Math.min(Math.floor(v) + 1, steps));
            }}
            onReset={() => {
              setKf(0);
              setPlaying(false);
            }}
          />
          <Slider
            label="steps N"
            min={2}
            max={32}
            value={steps}
            onChange={(v) => {
              setSteps(v);
              setKf(0);
              setPlaying(false);
            }}
            fmt={(v) => `${v}`}
          />
          <Btn onClick={() => setShowField((v) => !v)} active={showField}>
            {showField ? "✓ field" : "show field"}
          </Btn>
        </>
      }
    >
      <Readout
        rows={[
          { label: "step", value: `${Math.floor(kd)} / ${steps}`, color: R.ink },
          { label: "mean → data", value: curDist.toFixed(2), color: curDist < 0.15 ? R.goal : R.error },
          { label: "path length", value: (mode === "flow" ? flowLen : diffLen).toFixed(2), color: mode === "flow" ? R.goal : R.plan },
          { label: "sampler", value: mode === "flow" ? "ODE, deterministic" : "SDE, stochastic", color: mode === "flow" ? R.goal : R.plan },
        ]}
      />
      <Legend
        items={[
          { color: R.error, label: "noise start" },
          { color: R.signal, label: "samples at step k" },
          { color: R.goal, label: "data (two modes)" },
          { color: R.plan, label: mode === "flow" ? "velocity field" : "score field" },
        ]}
      />

      {/* the actual field, evaluated at the current step's time */}
      {arrows.map((a, i) => (
        <g key={`a${i}`} opacity={0.5}>
          {svgArrow(a.x1, a.y1, a.x2, a.y2, R.plan, 1.6, 6)}
        </g>
      ))}

      {/* data set: two modes */}
      {DVF_CENTERS.map((c, i) => (
        <circle key={`m${i}`} cx={dvfX(c)} cy={dvfY(c)} r={0.42 * DVF_SC} fill="none" stroke={R.goal} strokeWidth={1.5} strokeDasharray="4 4" opacity={0.7} />
      ))}
      {DVF_DATA.map((d, i) => (
        <circle key={`d${i}`} cx={dvfX(d)} cy={dvfY(d)} r={3.5} fill={R.goal} opacity={0.9} />
      ))}
      <text x={dvfX([1.55, 0]) + 46} y={dvfY([1.55, 0]) + 4} fontFamily={MONO} fontSize={12} fill={R.goal}>
        data
      </text>

      {/* noise ghosts (where every sample started) */}
      {DVF_NOISE.map((p, i) => (
        <circle key={`n${i}`} cx={dvfX(p)} cy={dvfY(p)} r={3} fill="none" stroke={R.error} strokeWidth={1.3} opacity={0.55} />
      ))}

      {/* trails: the honest path each sample took so far */}
      {traj.map((path, i) => {
        const upto = path.slice(0, k0 + 1).map((p) => `${dvfX(p)},${dvfY(p)}`);
        return (
          <polyline
            key={`p${i}`}
            points={[...upto, `${dvfX(pts[i])},${dvfY(pts[i])}`].join(" ")}
            fill="none"
            stroke={R.world}
            strokeWidth={1}
            opacity={0.35}
          />
        );
      })}

      {/* the cloud at step k */}
      {pts.map((p, i) => (
        <circle key={`s${i}`} cx={dvfX(p)} cy={dvfY(p)} r={4.5} fill={R.signal} stroke="var(--background)" strokeWidth={1.5} />
      ))}

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={diffFinal > flowFinal * 1.3 ? R.error : R.world}>
        {reduced
          ? `Reduced motion: final state shown. N=${steps}: flow travels ${flowLen.toFixed(1)}, lands ${flowFinal.toFixed(2)} off; diffusion travels ${diffLen.toFixed(1)}, lands ${diffFinal.toFixed(2)} off.`
          : `N=${steps}, same noise: flow rides ${flowLen.toFixed(1)} of near-straight path (lands ${flowFinal.toFixed(2)} off) · diffusion wanders ${diffLen.toFixed(1)} (lands ${diffFinal.toFixed(2)} off)`}
      </text>
    </Stage>
  );
}
