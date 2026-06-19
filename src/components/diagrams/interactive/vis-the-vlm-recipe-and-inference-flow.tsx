"use client";

import { useState, useRef, useEffect } from "react";
import { C, MONO } from "../frame";

// The VLM Recipe and Inference Flow.
// A vision-language model at inference time:
//   image -> Vision Encoder (ViT, CLIP/SigLIP) -> patch tokens
//         -> Projection/Adapter (MLP) -> visual tokens in the LLM's dim
//   prompt text -> Tokenizer -> text tokens
//   [visual tokens][text tokens] -> decoder-only LLM -> answer, token by token.
// The "run" animation walks the data through these stages: the image becomes
// a grid of patch tokens, those get projected, concatenated with the tokenized
// question, fed to the LLM, which then emits an answer one token at a time.

// --- geometry --------------------------------------------------------------
const VB_W = 560;
const VB_H = 380;

const TITLE_Y = 22;
const READOUT_Y = 44; // readout band, its own clear horizontal band

// Stage row geometry (the main drawing sits between the readout and caption).
const STAGE_Y = 96; // top of stage boxes
const STAGE_H = 64;
const STAGE_CY = STAGE_Y + STAGE_H / 2;

// Tokens / generation band below the stage row.
const TOK_Y = 214;

const CAPTION_Y = 332;

const btn =
  "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

// --- the pipeline stages ---------------------------------------------------
type StageId = "image" | "encoder" | "projector" | "concat" | "llm";

type Stage = {
  id: StageId;
  x: number;
  w: number;
  line1: string;
  line2: string;
  color: string;
  fill: string;
  job: string; // one-line job, shown on hover and during its active step
};

// Five boxes laid left to right with >=12px outer margins and clear gaps.
const STAGES: Stage[] = [
  {
    id: "image",
    x: 16,
    w: 78,
    line1: "Image",
    line2: "pixels",
    color: C.violet,
    fill: "var(--card)",
    job: "Raw image: the input we want to describe or reason about.",
  },
  {
    id: "encoder",
    x: 110,
    w: 104,
    line1: "Vision Enc.",
    line2: "ViT / SigLIP",
    color: C.blue,
    fill: C.blueFill,
    job: "Vision encoder splits the image into patches and embeds each one.",
  },
  {
    id: "projector",
    x: 230,
    w: 104,
    line1: "Projector",
    line2: "MLP adapter",
    color: C.green,
    fill: C.greenFill,
    job: "Projector maps patch embeddings into the LLM's token space.",
  },
  {
    id: "concat",
    x: 350,
    w: 96,
    line1: "Concat",
    line2: "[img][text]",
    color: C.muted,
    fill: "var(--card)",
    job: "Visual tokens are concatenated with the tokenized text prompt.",
  },
  {
    id: "llm",
    x: 462,
    w: 82,
    line1: "LLM",
    line2: "decoder",
    color: C.coral,
    fill: C.coralFill,
    job: "Decoder-only LLM attends over all tokens and generates the answer.",
  },
];

function stageById(id: StageId): Stage {
  // STAGES is a fixed const; find is safe and typed.
  const s = STAGES.find((st) => st.id === id);
  return s ?? STAGES[0];
}

// Animation steps. Each step highlights one stage and updates the readout.
type Step = {
  active: StageId;
  label1: string;
  label2: string;
};

const STEPS: Step[] = [
  { active: "image", label1: "Read the image", label2: "(input pixels)" },
  {
    active: "encoder",
    label1: "Encode to patch tokens",
    label2: "(ViT, ~256 patches)",
  },
  {
    active: "projector",
    label1: "Project into LLM space",
    label2: "(MLP adapter)",
  },
  {
    active: "concat",
    label1: "Concatenate with text",
    label2: "([img tokens][text tokens])",
  },
  {
    active: "llm",
    label1: "LLM generates the answer",
    label2: "(one token at a time)",
  },
];

// Decode tokens emitted in the final step (autoregressive output).
const ANSWER_TOKENS = ["A", "red", "kite", "."];

// Patch-grid for the image -> token visual.
const GRID_N = 6; // 6 x 6 = 36 patches drawn (stands in for ~256)

export function VisVlmRecipe() {
  const [step, setStep] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [hover, setHover] = useState<StageId | null>(null);

  // Sub-progress within the final (LLM) step: how many answer tokens emitted.
  const [emitted, setEmitted] = useState<number>(0);

  const stepRef = useRef<number>(step);
  const emittedRef = useRef<number>(emitted);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);
  useEffect(() => {
    emittedRef.current = emitted;
  }, [emitted]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const s = stepRef.current;
      // On the final LLM step, emit answer tokens one by one.
      if (s === STEPS.length - 1) {
        const e = emittedRef.current;
        if (e < ANSWER_TOKENS.length) {
          setEmitted(e + 1);
          return;
        }
        setPlaying(false);
        return;
      }
      setStep(s + 1);
      if (s + 1 === STEPS.length - 1) setEmitted(0);
    }, 720);
    return () => clearInterval(id);
  }, [playing]);

  function onRun(): void {
    if (
      stepRef.current === STEPS.length - 1 &&
      emittedRef.current >= ANSWER_TOKENS.length
    ) {
      // restart from the top
      setStep(0);
      setEmitted(0);
    }
    setPlaying((p) => !p);
  }
  function onReset(): void {
    setPlaying(false);
    setStep(0);
    setEmitted(0);
  }
  function onStep(): void {
    setPlaying(false);
    const s = stepRef.current;
    if (s === STEPS.length - 1) {
      if (emittedRef.current < ANSWER_TOKENS.length) {
        setEmitted(emittedRef.current + 1);
      } else {
        setStep(0);
        setEmitted(0);
      }
      return;
    }
    setStep(s + 1);
    if (s + 1 === STEPS.length - 1) setEmitted(0);
  }

  const cur = STEPS[step];
  const activeStage: StageId = cur.active;

  // A stage counts as "done" once the flow has moved past it.
  function stageState(id: StageId): "future" | "active" | "done" {
    const order: StageId[] = STAGES.map((s) => s.id);
    const ai = order.indexOf(activeStage);
    const si = order.indexOf(id);
    if (si < ai) return "done";
    if (si === ai) return "active";
    return "future";
  }

  // Which readout text to show: hover job overrides the step readout.
  const hoverStage = hover ? stageById(hover) : null;

  return (
    <div>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="The VLM recipe: image to vision encoder to projector to LLM, with concatenated visual and text tokens"
      >
        {/* ---- title band ---- */}
        <text
          x={VB_W / 2}
          y={TITLE_Y}
          fontSize={13}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          The VLM Recipe and Inference Flow
        </text>

        {/* ---- readout band (its own clear band) ---- */}
        <line
          x1={16}
          y1={READOUT_Y + 12}
          x2={VB_W - 16}
          y2={READOUT_Y + 12}
          stroke={C.grid}
          strokeWidth={1}
        />
        {hoverStage ? (
          <text
            x={VB_W / 2}
            y={READOUT_Y + 4}
            fontSize={10}
            fill={hoverStage.color}
            fontFamily={MONO}
            textAnchor="middle"
          >
            {hoverStage.job}
          </text>
        ) : (
          <>
            <text
              x={VB_W / 2}
              y={READOUT_Y}
              fontSize={11}
              fill={stageById(activeStage).color}
              fontFamily={MONO}
              textAnchor="middle"
              fontWeight={600}
            >
              {`${step + 1}/${STEPS.length}  ${cur.label1}`}
            </text>
            <text
              x={VB_W / 2}
              y={READOUT_Y + 13}
              fontSize={9}
              fill={C.muted}
              fontFamily={MONO}
              textAnchor="middle"
            >
              {cur.label2}
            </text>
          </>
        )}

        {/* ---- connectors between stages ---- */}
        {STAGES.slice(0, -1).map((s, i) => {
          const next = STAGES[i + 1];
          const x1 = s.x + s.w;
          const x2 = next.x;
          const lit = stageState(next.id) !== "future";
          return (
            <line
              key={`conn-${s.id}`}
              x1={x1 + 2}
              y1={STAGE_CY}
              x2={x2 - 4}
              y2={STAGE_CY}
              stroke={lit ? C.ink : C.line}
              strokeWidth={lit ? 1.6 : 1}
              markerEnd="url(#vlm-arrow)"
            />
          );
        })}
        <defs>
          <marker
            id="vlm-arrow"
            viewBox="0 0 8 8"
            refX={6}
            refY={4}
            markerWidth={6}
            markerHeight={6}
            orient="auto"
          >
            <path d="M0 0 L8 4 L0 8 z" fill={C.ink} />
          </marker>
        </defs>

        {/* ---- stage boxes ---- */}
        {STAGES.map((s) => {
          const st = stageState(s.id);
          const isActive = st === "active";
          const isDone = st === "done";
          return (
            <g
              key={s.id}
              onMouseEnter={() => setHover(s.id)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={s.x}
                y={STAGE_Y}
                width={s.w}
                height={STAGE_H}
                rx={6}
                fill={isActive || isDone ? s.fill : "var(--card)"}
                stroke={isActive ? s.color : isDone ? s.color : C.line}
                strokeWidth={isActive ? 2 : 1}
                opacity={st === "future" ? 0.6 : 1}
              />
              <text
                x={s.x + s.w / 2}
                y={STAGE_Y + 26}
                fontSize={11}
                fill={isActive || isDone ? s.color : C.ink}
                fontFamily={MONO}
                textAnchor="middle"
                fontWeight={600}
              >
                {s.line1}
              </text>
              <text
                x={s.x + s.w / 2}
                y={STAGE_Y + 42}
                fontSize={9}
                fill={C.muted}
                fontFamily={MONO}
                textAnchor="middle"
              >
                {s.line2}
              </text>
            </g>
          );
        })}

        {/* ================= LOWER BAND: tokens & generation ================= */}

        {/* image patch grid -> under the encoder, illustrating patch tokens */}
        {(() => {
          const enc = stageById("encoder");
          const cell = 9;
          const gap = 2;
          const gridW = GRID_N * cell + (GRID_N - 1) * gap;
          const gx = enc.x + enc.w / 2 - gridW / 2;
          const gy = TOK_Y;
          const show =
            stageState("encoder") === "active" ||
            stageState("encoder") === "done";
          const cells = [];
          for (let r = 0; r < GRID_N; r++) {
            for (let c = 0; c < GRID_N; c++) {
              cells.push({ r, c });
            }
          }
          return (
            <g opacity={show ? 1 : 0.3}>
              {cells.map(({ r, c }) => (
                <rect
                  key={`patch-${r}-${c}`}
                  x={gx + c * (cell + gap)}
                  y={gy + r * (cell + gap)}
                  width={cell}
                  height={cell}
                  rx={1}
                  fill={show ? C.blueFill : "var(--card)"}
                  stroke={C.blue}
                  strokeWidth={0.8}
                />
              ))}
              <text
                x={enc.x + enc.w / 2}
                y={gy + GRID_N * (cell + gap) + 12}
                fontSize={9}
                fill={C.blue}
                fontFamily={MONO}
                textAnchor="middle"
              >
                ~256 patch tokens
              </text>
            </g>
          );
        })()}

        {/* projected visual tokens (a row of squares) under the projector */}
        {(() => {
          const proj = stageById("projector");
          const n = 5;
          const cw = 14;
          const gap = 4;
          const rowW = n * cw + (n - 1) * gap;
          const rx = proj.x + proj.w / 2 - rowW / 2;
          const ry = TOK_Y + 18;
          const show =
            stageState("projector") === "active" ||
            stageState("projector") === "done";
          const idxs = [0, 1, 2, 3, 4];
          return (
            <g opacity={show ? 1 : 0.3}>
              {idxs.map((i) => (
                <rect
                  key={`vis-${i}`}
                  x={rx + i * (cw + gap)}
                  y={ry}
                  width={cw}
                  height={cw}
                  rx={2}
                  fill={show ? C.greenFill : "var(--card)"}
                  stroke={C.green}
                  strokeWidth={1}
                />
              ))}
              <text
                x={proj.x + proj.w / 2}
                y={ry + cw + 12}
                fontSize={9}
                fill={C.green}
                fontFamily={MONO}
                textAnchor="middle"
              >
                LLM-dim visual tokens
              </text>
            </g>
          );
        })()}

        {/* concatenated sequence under concat: [img][img][txt][txt] */}
        {(() => {
          const cc = stageById("concat");
          const seq: { kind: "img" | "txt"; label: string }[] = [
            { kind: "img", label: "v" },
            { kind: "img", label: "v" },
            { kind: "txt", label: "Q" },
            { kind: "txt", label: "?" },
          ];
          const cw = 14;
          const gap = 3;
          const rowW = seq.length * cw + (seq.length - 1) * gap;
          const rx = cc.x + cc.w / 2 - rowW / 2;
          const ry = TOK_Y + 18;
          const show =
            stageState("concat") === "active" ||
            stageState("concat") === "done";
          return (
            <g opacity={show ? 1 : 0.3}>
              {seq.map((t, i) => (
                <g key={`seq-${i}`}>
                  <rect
                    x={rx + i * (cw + gap)}
                    y={ry}
                    width={cw}
                    height={cw}
                    rx={2}
                    fill={
                      show
                        ? t.kind === "img"
                          ? C.greenFill
                          : C.blueFill
                        : "var(--card)"
                    }
                    stroke={t.kind === "img" ? C.green : C.blue}
                    strokeWidth={1}
                  />
                  <text
                    x={rx + i * (cw + gap) + cw / 2}
                    y={ry + cw - 4}
                    fontSize={8}
                    fill={t.kind === "img" ? C.green : C.blue}
                    fontFamily={MONO}
                    textAnchor="middle"
                  >
                    {t.label}
                  </text>
                </g>
              ))}
              <text
                x={cc.x + cc.w / 2}
                y={ry + cw + 12}
                fontSize={9}
                fill={C.muted}
                fontFamily={MONO}
                textAnchor="middle"
              >
                [img][text]
              </text>
            </g>
          );
        })()}

        {/* autoregressive answer under the LLM */}
        {(() => {
          const llm = stageById("llm");
          const onLlm = stageState("llm") === "active";
          const cw = 16;
          const gap = 3;
          const rowW =
            ANSWER_TOKENS.length * cw + (ANSWER_TOKENS.length - 1) * gap;
          // keep answer row inside the right margin
          let rx = llm.x + llm.w / 2 - rowW / 2;
          const maxRight = VB_W - 16;
          if (rx + rowW > maxRight) rx = maxRight - rowW;
          const ry = TOK_Y + 18;
          return (
            <g>
              {ANSWER_TOKENS.map((tk, i) => {
                const lit = onLlm && i < emitted;
                const isCur = onLlm && i === emitted - 1;
                return (
                  <g key={`ans-${i}`}>
                    <rect
                      x={rx + i * (cw + gap)}
                      y={ry}
                      width={cw}
                      height={cw}
                      rx={2}
                      fill={lit ? C.coral : "var(--card)"}
                      stroke={C.coral}
                      strokeWidth={isCur ? 1.8 : 1}
                      opacity={lit ? 1 : 0.4}
                    />
                  </g>
                );
              })}
              <text
                x={rx + rowW / 2}
                y={ry + cw + 12}
                fontSize={9}
                fill={C.coral}
                fontFamily={MONO}
                textAnchor="middle"
              >
                answer tokens
              </text>
            </g>
          );
        })()}

        {/* the decoded answer as words (only on the LLM step) */}
        {stageState("llm") === "active" && emitted > 0 && (
          <text
            x={VB_W / 2}
            y={TOK_Y - 6}
            fontSize={11}
            fill={C.coral}
            fontFamily={MONO}
            textAnchor="middle"
            fontWeight={600}
          >
            {ANSWER_TOKENS.slice(0, emitted).join(" ")}
          </text>
        )}

        {/* ---- caption band (its own clear band at the bottom) ---- */}
        <line
          x1={16}
          y1={CAPTION_Y - 16}
          x2={VB_W - 16}
          y2={CAPTION_Y - 16}
          stroke={C.grid}
          strokeWidth={1}
        />
        <text
          x={VB_W / 2}
          y={CAPTION_Y}
          fontSize={9.5}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          Encode the image to tokens, project them into the LLM's space,
        </text>
        <text
          x={VB_W / 2}
          y={CAPTION_Y + 14}
          fontSize={9.5}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          concatenate with text, and generate, that&apos;s a VLM.
        </text>
      </svg>

      {/* ---- controls ---- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button type="button" className={btn} onClick={onRun}>
          {playing
            ? "Pause"
            : step === STEPS.length - 1 && emitted >= ANSWER_TOKENS.length
              ? "Replay"
              : "Run"}
        </button>
        <button type="button" className={btn} onClick={onStep}>
          Step
        </button>
        <button type="button" className={btn} onClick={onReset}>
          Reset
        </button>
        <span className="font-mono tabular-nums text-[var(--muted)]">
          {`stage ${step + 1}/${STEPS.length}: ${stageById(activeStage).line1}`}
        </span>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Hover any stage to see its job. Run the flow to watch the image become
        patch tokens, get projected, concatenate with the question, and the LLM
        emit an answer token by token.
      </p>
    </div>
  );
}
