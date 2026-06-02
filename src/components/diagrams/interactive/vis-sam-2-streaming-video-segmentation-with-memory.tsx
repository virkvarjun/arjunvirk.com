"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// SAM 2 streams video frames left to right. Each frame is encoded (Hiera),
// then memory attention conditions it on a memory bank of past frame+mask
// features, a mask decoder predicts the mask, and that mask is encoded and
// pushed back into the memory bank for future frames.
//
// We hard-code a short 6-frame clip. The tracked object (target, a small
// blob) moves rightward and is briefly OCCLUDED at frame 4. A distractor
// object sits elsewhere. With memory ON, the target is re-acquired after the
// occlusion (temporal consistency). With memory OFF (per-frame SAM), the
// prediction at the occluded frame jumps to the distractor.

const NUM_FRAMES = 6; // frames in the clip (1..6)

type FrameDatum = {
  // target (tracked object) center inside the frame box, in [0,1]
  tx: number;
  ty: number;
  // distractor center inside the frame box, in [0,1]
  dx: number;
  dy: number;
  // is the target occluded on this frame?
  occluded: boolean;
};

// Deterministic, hand-authored trajectory. Target drifts right and down a
// little; occluded at frame index 3 (4th frame). Distractor stays upper-right.
const FRAMES: FrameDatum[] = [
  { tx: 0.26, ty: 0.42, dx: 0.74, dy: 0.3, occluded: false },
  { tx: 0.38, ty: 0.48, dx: 0.74, dy: 0.3, occluded: false },
  { tx: 0.5, ty: 0.54, dx: 0.74, dy: 0.3, occluded: false },
  { tx: 0.6, ty: 0.58, dx: 0.74, dy: 0.3, occluded: true },
  { tx: 0.7, ty: 0.56, dx: 0.74, dy: 0.3, occluded: false },
  { tx: 0.8, ty: 0.52, dx: 0.74, dy: 0.3, occluded: false },
];

// viewBox
const VB_W = 520;
const VB_H = 470;

// filmstrip geometry
const STRIP_X = 16;
const STRIP_Y = 64;
const FRAME_W = 76;
const FRAME_H = 58;
const FRAME_GAP = 6.4;

export function VisSam2Video() {
  const [frame, setFrame] = useState<number>(1); // 1..NUM_FRAMES (current)
  const [memoryOn, setMemoryOn] = useState<boolean>(true);

  const idx = frame - 1;
  const cur = FRAMES[idx];

  // What the model predicts for the CURRENT frame's target mask center.
  // memory ON  -> follows the true target even through occlusion.
  // memory OFF -> on the occluded frame it has no temporal anchor and locks
  //               onto the distractor instead (loses the object).
  const predOnTarget = memoryOn || !cur.occluded;
  const predX = predOnTarget ? cur.tx : cur.dx;
  const predY = predOnTarget ? cur.ty : cur.dy;

  // memory bank holds features for frames 1..frame-1 (past) — the prompted
  // first frame plus every frame already processed.
  const memCount = memoryOn ? frame - 1 : 0;

  // helper: pixel position of a normalized point inside a frame box
  const ptX = (fx: number, norm: number): number => fx + norm * FRAME_W;
  const ptY = (norm: number): number => STRIP_Y + norm * FRAME_H;

  return (
    <div>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="SAM 2 streaming video segmentation: each frame is conditioned on a memory bank of past frames so a prompted object is tracked across the clip"
      >
        {/* ---------- Title band ---------- */}
        <text
          x={16}
          y={22}
          fontSize={13}
          fill={C.ink}
          fontFamily={MONO}
          fontWeight={700}
        >
          SAM 2: Streaming Video Segmentation
        </text>
        <text x={16} y={38} fontSize={9.5} fill={C.muted} fontFamily={MONO}>
          frame {frame}/{NUM_FRAMES} · memory {memoryOn ? "ON" : "OFF"} · prompt
          on frame 1 tracks across the clip
        </text>

        {/* ---------- Filmstrip header ---------- */}
        <text x={STRIP_X} y={56} fontSize={9} fill={C.muted} fontFamily={MONO}>
          stream of frames →
        </text>

        {/* ---------- Filmstrip: 6 frames ---------- */}
        {FRAMES.map((f, i) => {
          const fx = STRIP_X + i * (FRAME_W + FRAME_GAP);
          const isCur = i === frame - 1;
          const isPast = i < frame - 1;
          const dim = i > frame - 1 ? 0.32 : 1; // future frames dimmed
          // mask shown on a frame: past+current use the model's chosen center
          // for the current; past frames show their (correct) tracked target.
          const showMask = i <= frame - 1;
          const maskOnTarget = i < frame - 1 ? true : predOnTarget;
          const mcx = ptX(fx, maskOnTarget ? f.tx : f.dx);
          const mcy = ptY(maskOnTarget ? f.ty : f.dy);
          return (
            <g key={`frame-${i}`} opacity={dim}>
              {/* frame box */}
              <rect
                x={fx}
                y={STRIP_Y}
                width={FRAME_W}
                height={FRAME_H}
                rx={4}
                fill="var(--card)"
                stroke={isCur ? C.blue : C.line}
                strokeWidth={isCur ? 2 : 1}
              />
              {/* distractor object (gray blob) */}
              <circle
                cx={ptX(fx, f.dx)}
                cy={ptY(f.dy)}
                r={8}
                fill="var(--background)"
                stroke={C.muted}
                strokeWidth={1.2}
              />
              {/* occluder bar when target is hidden */}
              {f.occluded && (
                <rect
                  x={ptX(fx, f.tx) - 10}
                  y={STRIP_Y + 6}
                  width={20}
                  height={FRAME_H - 12}
                  rx={2}
                  fill={C.muted}
                  opacity={0.45}
                />
              )}
              {/* true target object */}
              <circle
                cx={ptX(fx, f.tx)}
                cy={ptY(f.ty)}
                r={7}
                fill={C.green}
                opacity={f.occluded ? 0.25 : 1}
              />
              {/* predicted mask outline (only up to current frame) */}
              {showMask && (
                <circle
                  cx={mcx}
                  cy={mcy}
                  r={11}
                  fill={maskOnTarget ? C.greenFill : C.coralFill}
                  stroke={maskOnTarget ? C.green : C.coral}
                  strokeWidth={2}
                  opacity={0.85}
                />
              )}
              {/* frame number */}
              <text
                x={fx + FRAME_W / 2}
                y={STRIP_Y + FRAME_H + 11}
                fontSize={8.5}
                fill={isCur ? C.blue : C.muted}
                fontFamily={MONO}
                textAnchor="middle"
                fontWeight={isCur ? 700 : 400}
              >
                f{i + 1}
                {isCur ? " ◄" : i === 0 ? " ★" : isPast ? "" : ""}
              </text>
            </g>
          );
        })}

        {/* ---------- Pipeline (for current frame) ---------- */}
        {/* boxes: encoder -> mem attn -> mask decoder -> mask */}
        {(() => {
          const py = 168; // top of pipeline boxes
          const bh = 38;
          const bw = 96;
          const boxes: { x: number; label1: string; label2: string }[] = [
            { x: 16, label1: "image enc", label2: "(Hiera)" },
            { x: 152, label1: "memory attn", label2: "attend past" },
            { x: 288, label1: "mask decoder", label2: "predict" },
            { x: 424, label1: "mask", label2: `frame ${frame}` },
          ];
          const cy = py + bh / 2;
          return (
            <g>
              {/* current-frame caption above pipeline */}
              <text
                x={16}
                y={150}
                fontSize={9.5}
                fill={C.ink}
                fontFamily={MONO}
                fontWeight={700}
              >
                processing frame {frame}:
              </text>
              {/* connectors */}
              {boxes.slice(0, -1).map((b, i) => {
                const x1 = b.x + bw;
                const x2 = boxes[i + 1].x;
                return (
                  <g key={`conn-${i}`} stroke={C.ink} fill={C.ink}>
                    <line
                      x1={x1}
                      y1={cy}
                      x2={x2 - 6}
                      y2={cy}
                      strokeWidth={1.6}
                    />
                    <polygon
                      stroke="none"
                      points={`${x2},${cy} ${x2 - 6},${cy - 3.5} ${x2 - 6},${cy + 3.5}`}
                    />
                  </g>
                );
              })}
              {/* boxes */}
              {boxes.map((b, i) => {
                const isMask = i === 3;
                const isMem = i === 1;
                return (
                  <g key={`box-${i}`}>
                    <rect
                      x={b.x}
                      y={py}
                      width={bw}
                      height={bh}
                      rx={5}
                      fill={
                        isMask
                          ? predOnTarget
                            ? C.greenFill
                            : C.coralFill
                          : isMem
                            ? memoryOn
                              ? C.blueFill
                              : "var(--card)"
                            : "var(--card)"
                      }
                      stroke={
                        isMask
                          ? predOnTarget
                            ? C.green
                            : C.coral
                          : isMem
                            ? memoryOn
                              ? C.blue
                              : C.line
                            : C.line
                      }
                      strokeWidth={isMem || isMask ? 2 : 1}
                      strokeDasharray={isMem && !memoryOn ? "3 2" : undefined}
                    />
                    <text
                      x={b.x + bw / 2}
                      y={py + 16}
                      fontSize={9.5}
                      fill={C.ink}
                      fontFamily={MONO}
                      textAnchor="middle"
                      fontWeight={700}
                    >
                      {b.label1}
                    </text>
                    <text
                      x={b.x + bw / 2}
                      y={py + 29}
                      fontSize={8}
                      fill={C.muted}
                      fontFamily={MONO}
                      textAnchor="middle"
                    >
                      {isMem && !memoryOn ? "disabled" : b.label2}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })()}

        {/* ---------- Memory bank ---------- */}
        {(() => {
          const bankTop = 244;
          const bankY = bankTop + 14;
          const slot = 30;
          const slotH = 26;
          const sgap = 6;
          const startX = 152; // align under memory-attn box
          // arrow from memory bank up into memory attention
          const memAttnCx = 152 + 96 / 2;
          return (
            <g>
              <text
                x={16}
                y={bankTop + 6}
                fontSize={9.5}
                fill={C.ink}
                fontFamily={MONO}
                fontWeight={700}
              >
                memory bank
              </text>
              <text
                x={16}
                y={bankTop + 19}
                fontSize={8}
                fill={C.muted}
                fontFamily={MONO}
              >
                past frame +
              </text>
              <text
                x={16}
                y={bankTop + 30}
                fontSize={8}
                fill={C.muted}
                fontFamily={MONO}
              >
                mask features
              </text>

              {/* memory slots: 1 per past frame */}
              {Array.from({ length: NUM_FRAMES }, (_, i) => {
                const sx = startX + i * (slot + sgap);
                const filled = i < memCount;
                const isPrompt = i === 0;
                return (
                  <g key={`mem-${i}`}>
                    <rect
                      x={sx}
                      y={bankY}
                      width={slot}
                      height={slotH}
                      rx={3}
                      fill={
                        filled
                          ? isPrompt
                            ? C.blueFill
                            : C.greenFill
                          : "var(--card)"
                      }
                      stroke={
                        filled ? (isPrompt ? C.blue : C.green) : C.line
                      }
                      strokeWidth={filled ? 1.6 : 1}
                      strokeDasharray={filled ? undefined : "3 2"}
                    />
                    <text
                      x={sx + slot / 2}
                      y={bankY + slotH / 2 + 3}
                      fontSize={8}
                      fill={filled ? (isPrompt ? C.blue : C.green) : C.muted}
                      fontFamily={MONO}
                      textAnchor="middle"
                    >
                      {isPrompt ? "f1★" : `f${i + 1}`}
                    </text>
                  </g>
                );
              })}

              {/* feedback arrow: memory feeds memory-attention (upward) */}
              {memoryOn && memCount > 0 && (
                <g stroke={C.blue} fill={C.blue}>
                  <line
                    x1={memAttnCx}
                    y1={bankY - 2}
                    x2={memAttnCx}
                    y2={168 + 38 + 4}
                    strokeWidth={1.6}
                  />
                  <polygon
                    stroke="none"
                    points={`${memAttnCx},${168 + 38} ${memAttnCx - 3.5},${168 + 38 + 6} ${memAttnCx + 3.5},${168 + 38 + 6}`}
                  />
                </g>
              )}
              <text
                x={startX}
                y={bankY + slotH + 14}
                fontSize={8.5}
                fill={memoryOn ? C.blue : C.muted}
                fontFamily={MONO}
              >
                {memoryOn
                  ? `${memCount} frame${memCount === 1 ? "" : "s"} remembered → conditions frame ${frame}`
                  : "memory disabled → no past context"}
              </text>
            </g>
          );
        })()}

        {/* ---------- Readout band ---------- */}
        <line
          x1={16}
          y1={336}
          x2={VB_W - 16}
          y2={336}
          stroke={C.line}
          strokeWidth={1}
        />
        {/* status line 1 */}
        <text
          x={16}
          y={356}
          fontSize={10.5}
          fill={predOnTarget ? C.green : C.coral}
          fontFamily={MONO}
          fontWeight={700}
        >
          {predOnTarget ? "✓ tracking the prompted object" : "✗ lost the object"}
        </text>
        {/* status line 2 (split to fit width) */}
        <text x={16} y={372} fontSize={9} fill={C.ink} fontFamily={MONO}>
          {cur.occluded
            ? memoryOn
              ? "frame 4 occluded — memory re-acquires the target after it"
              : "frame 4 occluded — per-frame SAM jumps to the wrong blob"
            : memoryOn
              ? "mask conditioned on memory of all past frames"
              : "each frame segmented independently, no temporal anchor"}
        </text>

        {/* legend */}
        <g>
          <circle cx={22} cy={392} r={5} fill={C.green} />
          <text x={32} y={395} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
            target
          </text>
          <circle
            cx={92}
            cy={392}
            r={5}
            fill="var(--background)"
            stroke={C.muted}
            strokeWidth={1.2}
          />
          <text x={102} y={395} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
            distractor
          </text>
          <rect
            x={178}
            y={387}
            width={10}
            height={10}
            rx={2}
            fill={C.greenFill}
            stroke={C.green}
            strokeWidth={1.6}
          />
          <text x={192} y={395} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
            correct mask
          </text>
          <rect
            x={288}
            y={387}
            width={10}
            height={10}
            rx={2}
            fill={C.coralFill}
            stroke={C.coral}
            strokeWidth={1.6}
          />
          <text x={302} y={395} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
            wrong mask
          </text>
        </g>

        {/* caption (split across two lines to fit width) */}
        <text x={16} y={420} fontSize={9} fill={C.muted} fontFamily={MONO}>
          Stream frames, remember the object across them — temporal
        </text>
        <text x={16} y={434} fontSize={9} fill={C.muted} fontFamily={MONO}>
          consistency that per-frame SAM can&apos;t give.
        </text>
      </svg>

      {/* ---------- Controls ---------- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => setFrame((f: number) => Math.min(NUM_FRAMES, f + 1))}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          step frame →
        </button>
        <button
          type="button"
          onClick={() => setFrame(1)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          reset
        </button>
        <button
          type="button"
          onClick={() => setMemoryOn((m: boolean) => !m)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={
            memoryOn ? undefined : { background: C.ink, color: "var(--background)" }
          }
        >
          {memoryOn ? "disable memory" : "memory disabled"}
        </button>
        <span className="font-mono tabular-nums">
          frame {frame}/{NUM_FRAMES}
        </span>
      </div>
    </div>
  );
}
