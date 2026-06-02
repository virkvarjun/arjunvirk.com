"use client";

import { useEffect, useRef, useState } from "react";
import { C, MONO } from "../frame";

// One resolution level of the U. `level` 0 is the input/output (224), rising to
// 4 at the bottleneck (14). Encoder box on the left, decoder box on the right
// at the SAME y, joined by a horizontal skip connection.
type Level = {
  id: number; // 0..4, shallow -> deep
  res: string; // spatial size label e.g. "224"
  encCh: number; // encoder channels at this level
  decCh: number; // decoder channels at this level (after up-conv, pre-concat)
};

// Top (shallow, high-res) to bottom (deep, low-res). Level 4 is the bottleneck.
const LEVELS: Level[] = [
  { id: 0, res: "224", encCh: 64, decCh: 64 },
  { id: 1, res: "112", encCh: 128, decCh: 128 },
  { id: 2, res: "56", encCh: 256, decCh: 256 },
  { id: 3, res: "28", encCh: 512, decCh: 512 },
  { id: 4, res: "14", encCh: 1024, decCh: 1024 },
];

export function VisUNet() {
  // Which decoder level is opened to inspect its concatenation. null = none.
  const [openLevel, setOpenLevel] = useState<number | null>(null);
  const [skips, setSkips] = useState<boolean>(true);
  const [playing, setPlaying] = useState<boolean>(false);
  // Flow stage 0..9: 0-4 descend encoder, 5-9 ascend decoder (with skip leaps).
  const [stage, setStage] = useState<number>(0);
  const frame = useRef<number>(0);

  const FLOW_MAX = 9;
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      frame.current += 1;
      if (frame.current % 2 === 0) {
        setStage((s: number): number => (s >= FLOW_MAX ? 0 : s + 1));
      }
    }, 300);
    return () => clearInterval(id);
  }, [playing]);

  // --- Layout ---------------------------------------------------------------
  const W = 520;
  const H = 600;

  const bw = 88; // box width
  const bh = 26; // box height

  // Encoder column shifts right and shrinks slightly as we descend; decoder
  // mirrors it. We keep them simple equal-width boxes for label legibility,
  // but indent each deeper level inward to evoke the contracting "U".
  const encBaseX = 28; // leftmost (shallow) encoder x
  const decBaseX = W - 28 - bw; // rightmost (shallow) decoder x
  const indent = 30; // inward indent per level deeper

  const topY = 78; // top edge of shallowest level boxes
  const vstep = 58; // vertical step per level

  const encX = (lvl: number): number => encBaseX + lvl * indent;
  const decX = (lvl: number): number => decBaseX - lvl * indent;
  const rowY = (lvl: number): number => topY + lvl * vstep;

  // Active level highlighted by the flow animation.
  const flowLevel = (): { side: "enc" | "dec"; lvl: number } | null => {
    if (!playing && stage === 0) return null;
    if (stage <= 4) return { side: "enc", lvl: stage };
    return { side: "dec", lvl: 9 - stage }; // 5->4 ... 9->0
  };
  const flow = flowLevel();

  // Skip "leap" is active for a level when the decoder reaches it during ascent.
  const skipLeapLevel: number | null =
    stage >= 5 ? 9 - stage : null;

  const captionTop = 470; // divider above readout band

  const open: Level | null =
    openLevel !== null ? LEVELS[openLevel] : null;

  // Mask crispness: with skips on -> crisp; off -> blurry (FCN problem).
  const maskBlur = skips ? 0 : 3;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="U-Net: a U-shaped encoder-decoder where each decoder stage receives a skip connection from the matching-resolution encoder stage, concatenating fine spatial detail back into the upsampled features to produce a crisp segmentation mask."
      >
        <defs>
          <filter id="unet-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={maskBlur} />
          </filter>
        </defs>

        {/* ---- Title band ---- */}
        <text
          x={W / 2}
          y={22}
          fontSize={13}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.ink}
          fontWeight={600}
        >
          U-Net
        </text>
        <text
          x={W / 2}
          y={40}
          fontSize={9.5}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          contracting encoder · bottleneck · expanding decoder
        </text>

        {/* Column headers */}
        <text
          x={encBaseX + bw / 2}
          y={62}
          fontSize={9.5}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.coral}
          fontWeight={600}
        >
          encoder ↓
        </text>
        <text
          x={decBaseX + bw / 2}
          y={62}
          fontSize={9.5}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.blue}
          fontWeight={600}
        >
          decoder ↑
        </text>

        {/* ---- Skip connections (drawn first, under boxes) ---- */}
        {LEVELS.slice(0, 4).map((lv: Level): React.ReactNode => {
          const y = rowY(lv.id) + bh / 2;
          const x1 = encX(lv.id) + bw; // encoder right edge
          const x2 = decX(lv.id); // decoder left edge
          const active = skipLeapLevel === lv.id;
          const col = !skips ? C.line : active ? C.green : C.green;
          const op = !skips ? 0.25 : active ? 1 : 0.55;
          const wdt = active ? 2.6 : 1.6;
          const dash = skips ? undefined : "4 4";
          const midX = (x1 + x2) / 2;
          return (
            <g key={`skip-${lv.id}`} opacity={op}>
              <line
                x1={x1 + 2}
                y1={y}
                x2={x2 - 8}
                y2={y}
                stroke={col}
                strokeWidth={wdt}
                strokeDasharray={dash}
              />
              {/* concat node where the skip joins the decoder */}
              <circle
                cx={x2 - 8}
                cy={y}
                r={5.5}
                fill="var(--card)"
                stroke={col}
                strokeWidth={1.6}
              />
              <text
                x={x2 - 8}
                y={y + 3}
                fontSize={9}
                fontFamily={MONO}
                textAnchor="middle"
                fill={col}
                fontWeight={600}
              >
                ⊕
              </text>
              {/* arrowhead into decoder box */}
              {skips && (
                <polygon
                  points={`${x2},${y} ${x2 - 6},${y - 4} ${x2 - 6},${y + 4}`}
                  fill={col}
                />
              )}
              {/* skip label sits ABOVE the line, centered, clear of boxes */}
              <text
                x={midX}
                y={y - 8}
                fontSize={8}
                fontFamily={MONO}
                textAnchor="middle"
                fill={skips ? (active ? C.green : C.muted) : C.muted}
                fontWeight={active ? 600 : 400}
              >
                skip {lv.res}×{lv.res}
              </text>
            </g>
          );
        })}

        {/* ---- Encoder downward arrows (between consecutive enc levels) ---- */}
        {LEVELS.slice(0, 4).map((lv: Level): React.ReactNode => {
          const yTop = rowY(lv.id) + bh;
          const yBot = rowY(lv.id + 1);
          const xTop = encX(lv.id) + bw / 2;
          const xBot = encX(lv.id + 1) + bw / 2;
          return (
            <g key={`enc-arr-${lv.id}`} stroke={C.coral} fill={C.coral}>
              <line
                x1={xTop}
                y1={yTop}
                x2={xBot}
                y2={yBot - 7}
                strokeWidth={1.4}
              />
              <polygon
                points={`${xBot},${yBot} ${xBot - 4},${yBot - 7} ${xBot + 4},${yBot - 7}`}
                stroke="none"
              />
            </g>
          );
        })}

        {/* ---- Decoder upward arrows (between consecutive dec levels) ---- */}
        {LEVELS.slice(0, 4).map((lv: Level): React.ReactNode => {
          const yBot = rowY(lv.id + 1);
          const yTop = rowY(lv.id) + bh;
          const xBot = decX(lv.id + 1) + bw / 2;
          const xTop = decX(lv.id) + bw / 2;
          return (
            <g key={`dec-arr-${lv.id}`} stroke={C.blue} fill={C.blue}>
              <line
                x1={xBot}
                y1={yBot}
                x2={xTop}
                y2={yTop + 7}
                strokeWidth={1.4}
              />
              <polygon
                points={`${xTop},${yTop} ${xTop - 4},${yTop + 7} ${xTop + 4},${yTop + 7}`}
                stroke="none"
              />
            </g>
          );
        })}

        {/* ---- Bottleneck link (encoder L4 -> decoder L4) ---- */}
        {(() => {
          const y = rowY(4) + bh / 2;
          const x1 = encX(4) + bw;
          const x2 = decX(4);
          return (
            <g stroke={C.violet} fill={C.violet} key="bottleneck-link">
              <line x1={x1} y1={y} x2={x2 - 6} y2={y} strokeWidth={1.6} />
              <polygon
                points={`${x2},${y} ${x2 - 6},${y - 4} ${x2 - 6},${y + 4}`}
                stroke="none"
              />
            </g>
          );
        })()}

        {/* ---- Encoder boxes ---- */}
        {LEVELS.map((lv: Level): React.ReactNode => {
          const x = encX(lv.id);
          const y = rowY(lv.id);
          const isFlow = flow?.side === "enc" && flow.lvl === lv.id;
          const isBottle = lv.id === 4;
          const fill = isFlow
            ? C.coral
            : isBottle
              ? "var(--card)"
              : C.coralFill;
          const stroke = isBottle ? C.violet : C.coral;
          const txt = isFlow ? "var(--card)" : isBottle ? C.violet : C.coral;
          return (
            <g key={`enc-box-${lv.id}`}>
              <rect
                x={x}
                y={y}
                width={bw}
                height={bh}
                rx={5}
                fill={fill}
                stroke={stroke}
                strokeWidth={isFlow ? 2.4 : 1.4}
              />
              <text
                x={x + bw / 2}
                y={y + bh / 2 + 3.5}
                fontSize={9}
                fontFamily={MONO}
                textAnchor="middle"
                fill={txt}
                fontWeight={600}
              >
                {`${lv.res}² ×${lv.encCh}`}
              </text>
            </g>
          );
        })}

        {/* ---- Decoder boxes (clickable to inspect concat) ---- */}
        {LEVELS.map((lv: Level): React.ReactNode => {
          const x = decX(lv.id);
          const y = rowY(lv.id);
          const isFlow = flow?.side === "dec" && flow.lvl === lv.id;
          const isBottle = lv.id === 4;
          const isOpen = openLevel === lv.id;
          const fill = isFlow
            ? C.blue
            : isBottle
              ? "var(--card)"
              : C.blueFill;
          const stroke = isBottle ? C.violet : C.blue;
          const txt = isFlow ? "var(--card)" : isBottle ? C.violet : C.blue;
          return (
            <g
              key={`dec-box-${lv.id}`}
              onClick={() => {
                if (isBottle) return;
                setPlaying(false);
                setOpenLevel((p: number | null): number | null =>
                  p === lv.id ? null : lv.id,
                );
              }}
              style={{ cursor: isBottle ? "default" : "pointer" }}
            >
              <rect
                x={x}
                y={y}
                width={bw}
                height={bh}
                rx={5}
                fill={fill}
                stroke={stroke}
                strokeWidth={isFlow || isOpen ? 2.4 : 1.4}
              />
              <text
                x={x + bw / 2}
                y={y + bh / 2 + 3.5}
                fontSize={9}
                fontFamily={MONO}
                textAnchor="middle"
                fill={txt}
                fontWeight={600}
              >
                {`${lv.res}² ×${lv.decCh}`}
              </text>
            </g>
          );
        })}

        {/* Bottleneck label below the deepest pair */}
        <text
          x={W / 2}
          y={rowY(4) + bh + 14}
          fontSize={8.5}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.violet}
          fontWeight={600}
        >
          bottleneck 14² ×1024
        </text>

        {/* ---- 1×1 conv -> class mask, in a clear strip below the U ---- */}
        {(() => {
          const stripY = rowY(4) + bh + 70; // clear band below the bottleneck
          const x0 = encBaseX;
          const convW = 96;
          const convX = x0;
          return (
            <g key="output-head">
              <text
                x={x0}
                y={stripY - 8}
                fontSize={9}
                fontFamily={MONO}
                fill={C.muted}
              >
                output head
              </text>
              <rect
                x={convX}
                y={stripY}
                width={convW}
                height={24}
                rx={5}
                fill={C.greenFill}
                stroke={C.green}
                strokeWidth={1.4}
              />
              <text
                x={convX + convW / 2}
                y={stripY + 16}
                fontSize={9}
                fontFamily={MONO}
                textAnchor="middle"
                fill={C.green}
                fontWeight={600}
              >
                1×1 conv
              </text>
              <g stroke={C.ink} fill={C.ink}>
                <line
                  x1={convX + convW + 2}
                  y1={stripY + 12}
                  x2={convX + convW + 36}
                  y2={stripY + 12}
                  strokeWidth={1.3}
                />
                <polygon
                  points={`${convX + convW + 42},${stripY + 12} ${convX + convW + 36},${stripY + 8} ${convX + convW + 36},${stripY + 16}`}
                  stroke="none"
                />
              </g>
              <text
                x={convX + convW + 48}
                y={stripY + 16}
                fontSize={9}
                fontFamily={MONO}
                fill={C.ink}
                fontWeight={600}
              >
                224² class mask
              </text>
            </g>
          );
        })()}

        {/* ---- Concat inspector OR mask preview band ---- */}
        <line
          x1={12}
          y1={captionTop}
          x2={W - 12}
          y2={captionTop}
          stroke={C.line}
          strokeWidth={1}
        />

        {open ? (
          <ConcatInspector
            level={open}
            skips={skips}
            x={16}
            y={captionTop + 14}
            w={W - 32}
          />
        ) : (
          <MaskPreview
            skips={skips}
            x={16}
            y={captionTop + 14}
            w={W - 32}
            blurId="unet-blur"
          />
        )}

        {/* ---- Caption (bottom band) ---- */}
        <text
          x={W / 2}
          y={H - 22}
          fontSize={8.5}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          Semantics flow down and back up; sharp spatial detail
        </text>
        <text
          x={W / 2}
          y={H - 10}
          fontSize={8.5}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          leaps across the skips. That&apos;s how U-Net gets crisp masks.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => {
            setOpenLevel(null);
            setPlaying((p: boolean): boolean => !p);
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          {playing ? "Pause flow" : "Play flow"}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setStage((s: number): number => (s >= FLOW_MAX ? 0 : s + 1));
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Step
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setStage(0);
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => setSkips((s: boolean): boolean => !s)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={
            skips
              ? { background: C.ink, color: "var(--background)" }
              : undefined
          }
        >
          {skips ? "Skips: on" : "Skips: off (FCN)"}
        </button>
        <span style={{ color: C.muted, fontFamily: MONO }}>
          click a decoder box to inspect concat
        </span>
      </div>
    </div>
  );
}

// Inspector shown in the readout band when a decoder level is clicked.
// Lays out: [up-conv channels] ⊕ [encoder skip channels] -> conv -> merged.
function ConcatInspector({
  level,
  skips,
  x,
  y,
  w,
}: {
  level: Level;
  skips: boolean;
  x: number;
  y: number;
  w: number;
}): React.ReactNode {
  const up = level.decCh; // upsampled channels coming from below
  const enc = level.encCh; // encoder skip channels at this resolution
  const merged = up + (skips ? enc : 0);

  const rowY = y + 26;
  const chW = 92;
  const gap = 18;
  const x0 = x;
  const x1 = x0 + chW + gap + 14; // after ⊕
  const x2 = x1 + chW + gap + 26; // after -> conv

  return (
    <g>
      <text
        x={x}
        y={y + 10}
        fontSize={10}
        fontFamily={MONO}
        fill={C.ink}
        fontWeight={600}
      >
        {`Decoder ${level.res}×${level.res}: concatenate skip, then conv`}
      </text>

      {/* up-sampled block */}
      <rect
        x={x0}
        y={rowY}
        width={chW}
        height={22}
        rx={4}
        fill={C.blueFill}
        stroke={C.blue}
        strokeWidth={1.4}
      />
      <text
        x={x0 + chW / 2}
        y={rowY + 14}
        fontSize={8.5}
        fontFamily={MONO}
        textAnchor="middle"
        fill={C.blue}
        fontWeight={600}
      >
        {`up-conv ×${up}`}
      </text>

      {/* plus / concat symbol */}
      <text
        x={x0 + chW + gap / 2}
        y={rowY + 15}
        fontSize={13}
        fontFamily={MONO}
        textAnchor="middle"
        fill={skips ? C.green : C.muted}
        fontWeight={600}
      >
        ⊕
      </text>

      {/* encoder skip block */}
      <rect
        x={x1}
        y={rowY}
        width={chW}
        height={22}
        rx={4}
        fill={skips ? C.coralFill : "var(--card)"}
        stroke={skips ? C.coral : C.line}
        strokeWidth={1.4}
        strokeDasharray={skips ? undefined : "4 4"}
      />
      <text
        x={x1 + chW / 2}
        y={rowY + 14}
        fontSize={8.5}
        fontFamily={MONO}
        textAnchor="middle"
        fill={skips ? C.coral : C.muted}
        fontWeight={600}
      >
        {skips ? `skip ×${enc}` : "skip OFF"}
      </text>

      {/* arrow -> conv -> merged */}
      <g stroke={C.ink} fill={C.ink}>
        <line
          x1={x1 + chW + 2}
          y1={rowY + 11}
          x2={x2 - 8}
          y2={rowY + 11}
          strokeWidth={1.3}
        />
        <polygon
          points={`${x2 - 2},${rowY + 11} ${x2 - 8},${rowY + 7} ${x2 - 8},${rowY + 15}`}
          stroke="none"
        />
      </g>
      <rect
        x={x2}
        y={rowY}
        width={chW + 6}
        height={22}
        rx={4}
        fill={C.greenFill}
        stroke={C.green}
        strokeWidth={1.4}
      />
      <text
        x={x2 + (chW + 6) / 2}
        y={rowY + 14}
        fontSize={8.5}
        fontFamily={MONO}
        textAnchor="middle"
        fill={C.green}
        fontWeight={600}
      >
        {`conv ×${merged}`}
      </text>

      {/* explanatory line */}
      <text
        x={x}
        y={rowY + 42}
        fontSize={8.5}
        fontFamily={MONO}
        fill={C.muted}
      >
        {skips
          ? `${up} upsampled + ${enc} skip = ${merged} channels into the conv.`
          : `No skip: only ${up} upsampled channels — fine detail is lost.`}
      </text>
    </g>
  );
}

// Default readout band: shows a tiny target shape rendered crisp (skips on)
// or blurred (skips off), illustrating the FCN problem.
function MaskPreview({
  skips,
  x,
  y,
  w,
  blurId,
}: {
  skips: boolean;
  x: number;
  y: number;
  w: number;
  blurId: string;
}): React.ReactNode {
  const boxX = x;
  const boxY = y + 6;
  const boxW = 96;
  const boxH = 60;
  const cx = boxX + boxW / 2;
  const cy = boxY + boxH / 2;

  return (
    <g>
      <text
        x={x}
        y={y + 10}
        fontSize={10}
        fontFamily={MONO}
        fill={C.ink}
        fontWeight={600}
      >
        Output mask
      </text>

      {/* mask frame */}
      <rect
        x={boxX}
        y={boxY}
        width={boxW}
        height={boxH}
        rx={4}
        fill="var(--background)"
        stroke={C.line}
        strokeWidth={1.2}
      />
      {/* the predicted region: crisp polygon if skips, blurred blob if not */}
      <g filter={skips ? undefined : `url(#${blurId})`}>
        <polygon
          points={`${cx - 24},${cy + 16} ${cx - 6},${cy - 18} ${cx + 10},${cy - 4} ${cx + 24},${cy + 16}`}
          fill={C.greenFill}
          stroke={skips ? C.green : "none"}
          strokeWidth={skips ? 1.6 : 0}
        />
      </g>

      {/* status text to the right of the swatch */}
      <text
        x={boxX + boxW + 16}
        y={boxY + 16}
        fontSize={9}
        fontFamily={MONO}
        fill={skips ? C.green : C.coral}
        fontWeight={600}
      >
        {skips ? "crisp edges" : "blurry edges"}
      </text>
      <text
        x={boxX + boxW + 16}
        y={boxY + 32}
        fontSize={8.5}
        fontFamily={MONO}
        fill={C.muted}
      >
        {skips
          ? "skips inject high-res detail,"
          : "without skips the decoder lacks"}
      </text>
      <text
        x={boxX + boxW + 16}
        y={boxY + 46}
        fontSize={8.5}
        fontFamily={MONO}
        fill={C.muted}
      >
        {skips
          ? "so boundaries stay sharp."
          : "fine detail (the FCN problem)."}
      </text>
    </g>
  );
}
