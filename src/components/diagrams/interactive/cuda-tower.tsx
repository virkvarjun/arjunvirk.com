"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

interface Layer {
  name: string;
  desc: string;
}

// The five bands of the tower, top (what you write) to bottom (the silicon).
const LAYERS: Layer[] = [
  {
    name: "model.cuda() / framework op  (PyTorch · JAX · TensorFlow)",
    desc: "you call this; an op like a matmul or conv",
  },
  {
    name: "Libraries:  cuBLAS · cuDNN · NCCL · TensorRT",
    desc: "cuBLAS does the matmul, cuDNN the conv; your framework calls down into these",
  },
  {
    name: "CUDA runtime & driver",
    desc: "allocates memory, launches kernels onto the GPU",
  },
  {
    name: "Compiled form:  PTX → cubin (fatbin)",
    desc: "your CUDA C++ becomes PTX assembly then a cubin binary, bundled in a fatbin for several GPU generations",
  },
  {
    name: "GPU hardware  (SMs, cores, HBM)",
    desc: "the actual SMs, CUDA/tensor cores, and HBM",
  },
];

const TOP = 0;
const MOAT = 1; // libraries band — the moat, emphasized + default selection

// Tower geometry within the 440x268 viewBox.
const BX = 40; // left edge of bands
const BW = 360; // band width
const Y0 = 38; // top of first band (leaves room for the note above it)
const GAP = 8; // vertical gap between bands
const H_NORMAL = 34;
const H_MOAT = 46; // the moat band is taller, to emphasize its depth

// Precompute the y-offset and height of each band.
const bands = LAYERS.map((_, i) => {
  let y = Y0;
  for (let k = 0; k < i; k += 1) {
    y += (k === MOAT ? H_MOAT : H_NORMAL) + GAP;
  }
  return { y, h: i === MOAT ? H_MOAT : H_NORMAL };
});

export function CudaTower() {
  const [selected, setSelected] = useState<number>(MOAT);
  const sel = LAYERS[selected];

  return (
    <div>
      <svg
        viewBox="0 0 440 268"
        className="h-auto w-full"
        role="img"
        aria-label="The CUDA abstraction tower"
      >
        {/* one-line note above the top band: the layer you usually touch */}
        <text
          x={BX}
          y={Y0 - 8}
          fontSize={9}
          fill={C.ink}
          fontFamily={MONO}
          fontWeight={600}
        >
          ↓ you usually only touch this top layer
        </text>

        {/* the bands */}
        {LAYERS.map((layer, i) => {
          const b = bands[i];
          const isSel = i === selected;
          const isMoat = i === MOAT;
          const isTop = i === TOP;
          const fill = isMoat ? C.coralFill : C.blueFill;
          const stroke = isMoat ? C.coral : isSel ? C.blue : C.line;
          return (
            <g
              key={layer.name}
              onClick={() => setSelected(i)}
              style={{ cursor: "pointer" }}
              role="button"
              aria-pressed={isSel}
            >
              <rect
                x={BX}
                y={b.y}
                width={BW}
                height={b.h}
                rx={4}
                fill={fill}
                stroke={stroke}
                strokeWidth={isMoat ? 2.4 : isSel ? 2 : 1}
              />
              {/* selection ring */}
              {isSel && (
                <rect
                  x={BX - 3}
                  y={b.y - 3}
                  width={BW + 6}
                  height={b.h + 6}
                  rx={6}
                  fill="none"
                  stroke={isMoat ? C.coral : C.blue}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              )}
              {/* tint marker stripe on the top band (what you touch) */}
              {isTop && (
                <rect
                  x={BX}
                  y={b.y}
                  width={5}
                  height={b.h}
                  rx={2}
                  fill={C.blue}
                />
              )}
              <text
                x={BX + 14}
                y={b.y + (isMoat ? 18 : b.h / 2 + 4)}
                fontSize={10}
                fill={C.ink}
                fontFamily={MONO}
                fontWeight={isMoat ? 600 : 400}
              >
                {layer.name}
              </text>
              {isMoat && (
                <text
                  x={BX + 14}
                  y={b.y + 34}
                  fontSize={8.5}
                  fill={C.coral}
                  fontFamily={MONO}
                >
                  the moat — a decade of optimized libraries, hard to copy
                </text>
              )}
            </g>
          );
        })}

        {/* downward arrow spine, top calls down to silicon */}
        <text
          x={BX + BW / 2}
          y={bands[LAYERS.length - 1].y + bands[LAYERS.length - 1].h + 14}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          ↓ each layer calls down into the one below ↓
        </text>
      </svg>

      {/* readout: description of the selected layer */}
      <div
        className="mt-3 rounded border p-2 text-xs"
        style={{
          borderColor: selected === MOAT ? C.coral : C.line,
          background: "var(--card)",
        }}
      >
        <div
          style={{ fontFamily: MONO, color: C.ink, fontWeight: 600 }}
        >
          {sel.name}
        </div>
        <div style={{ fontFamily: MONO, color: C.muted, marginTop: 4 }}>
          {sel.desc}
        </div>
      </div>

      {/* controls row: one button per layer */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {LAYERS.map((layer, i) => {
          const isSel = i === selected;
          const accent = i === MOAT ? C.coral : C.blue;
          return (
            <button
              key={layer.name}
              type="button"
              onClick={() => setSelected(i)}
              className="rounded border px-2 py-1"
              style={{
                fontFamily: MONO,
                borderColor: isSel ? accent : C.line,
                background: isSel
                  ? i === MOAT
                    ? C.coralFill
                    : C.blueFill
                  : "var(--background)",
                color: C.ink,
              }}
            >
              {i + 1}
              {i === MOAT ? " · moat" : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
