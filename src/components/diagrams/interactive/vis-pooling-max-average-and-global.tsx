"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// viewBox geometry. Bands top-to-bottom:
//   title (0..24)
//   sub-heading "2x2 pooling, stride 2" (~40)
//   input grid + output grids (52..192)
//   readout band (one window's Max vs Avg) (208..240)
//   divider + "Global pooling" sub-heading (~258)
//   global volume + output vector (272..356)
//   caption band (372..400)
const VW = 520;
const VH = 408;

// ---- Top section: 4x4 input feature map ----
const N = 4; // 4x4 input
const OUT = 2; // 2x2 output
const ICELL = 26;
const IGAP = 3;
const IGX = 18; // input grid left
const IGY = 56; // input grid top

// 4x4 feature map (deterministic). Indexed [row][col].
const BASE: number[][] = [
  [1, 3, 2, 0],
  [4, 6, 1, 2],
  [0, 2, 5, 3],
  [1, 1, 7, 4],
];

// Shifted-by-1-pixel variant (translate feature right by 1, wrap last col -> 0).
const SHIFTED: number[][] = BASE.map((row: number[]) => {
  const r = row.slice();
  return [0, r[0], r[1], r[2]];
});

const icellX = (col: number): number => IGX + col * (ICELL + IGAP);
const icellY = (row: number): number => IGY + row * (ICELL + IGAP);

const igridW = N * ICELL + (N - 1) * IGAP;

// Output grids (Max and Average) live to the right of the input grid.
const OCELL = 26;
const OGAP = 3;
const ogridW = OUT * OCELL + (OUT - 1) * OGAP;
const MAXGX = IGX + igridW + 40;
const AVGGX = MAXGX + ogridW + 56;
const OGY = IGY + (ICELL + IGAP); // vertically center the 2x2 against the 4x4

const ocellX = (gx: number, col: number): number => gx + col * (OCELL + OGAP);
const ocellY = (row: number): number => OGY + row * (OCELL + OGAP);

// The four input cells covered by output window (wr, wc) with stride 2.
function windowCells(
  wr: number,
  wc: number,
): { r: number; c: number }[] {
  const cells: { r: number; c: number }[] = [];
  for (let dr = 0; dr < 2; dr++) {
    for (let dc = 0; dc < 2; dc++) {
      cells.push({ r: wr * 2 + dr, c: wc * 2 + dc });
    }
  }
  return cells;
}

function windowVals(grid: number[][], wr: number, wc: number): number[] {
  return windowCells(wr, wc).map(({ r, c }: { r: number; c: number }) => grid[r][c]);
}

const maxOf = (vals: number[]): number => vals.reduce((a, b) => Math.max(a, b), -Infinity);
const avgOf = (vals: number[]): number => vals.reduce((a, b) => a + b, 0) / vals.length;

// ---- Bottom section: global pooling on a (C,H,W) volume ----
const GCHAN = 3;
const GCELL = 12;
const GH = 3; // 3x3 maps for the illustration
const GW = 3;
const GVX = 32; // first map left
const GVY = 284; // maps top
const GMAP_W = GW * GCELL;
const GMAP_DX = 18; // diagonal offset between stacked channels
const GMAP_DY = 12;
const GGAP_X = 78; // horizontal spacing between the 3 channel stacks-front-faces

// 3 channel feature maps (deterministic 3x3 each).
const VOLUME: number[][][] = [
  [
    [2, 1, 0],
    [3, 4, 1],
    [0, 2, 2],
  ],
  [
    [1, 1, 1],
    [0, 2, 3],
    [4, 1, 0],
  ],
  [
    [5, 0, 1],
    [1, 1, 2],
    [0, 3, 1],
  ],
];

const globalAvg = (m: number[][]): number =>
  m.flat().reduce((a, b) => a + b, 0) / (GH * GW);

type Mode = "max" | "avg" | "global";

export function VisPooling() {
  const [mode, setMode] = useState<Mode>("max");
  const [winIdx, setWinIdx] = useState<number>(0); // 0..3 -> (wr,wc)
  const [shifted, setShifted] = useState<boolean>(false);
  const [showVector, setShowVector] = useState<boolean>(false);

  const wr = Math.floor(winIdx / 2);
  const wc = winIdx % 2;

  const grid: number[][] = shifted ? SHIFTED : BASE;

  const isGlobal = mode === "global";

  const selVals = windowVals(grid, wr, wc);
  const selMax = maxOf(selVals);
  const selAvg = avgOf(selVals);

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  // Vector of global-average values (one per channel).
  const gVec: number[] = VOLUME.map((m: number[][]) => globalAvg(m));

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="Pooling diagram. A 2x2 window with stride 2 sweeps a 4x4 feature map, producing a 2x2 output; max pooling keeps the largest of the four values, average pooling takes their mean. A shift-by-one-pixel toggle shows max pooling output staying stable. Global average pooling collapses each channel of a multi-channel volume to a single number, yielding a length-C vector."
      >
        {/* Title band */}
        <text
          x={VW / 2}
          y={18}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={13}
          fill={C.ink}
        >
          Pooling: Max, Average, and Global
        </text>

        {/* ---------- TOP SECTION (max / avg sweep) ---------- */}
        {!isGlobal && (
          <>
            <text
              x={IGX}
              y={44}
              fontFamily={MONO}
              fontSize={9.5}
              fill={C.muted}
            >
              4x4 feature map · 2x2 window · stride 2
            </text>

            {/* Input grid cells */}
            {grid.map((rowArr: number[], r: number) =>
              rowArr.map((v: number, c: number) => {
                const inWin = windowCells(wr, wc).some(
                  (cell: { r: number; c: number }) => cell.r === r && cell.c === c,
                );
                const isMaxCell = inWin && v === selMax;
                return (
                  <g key={`in-${r}-${c}`}>
                    <rect
                      x={icellX(c)}
                      y={icellY(r)}
                      width={ICELL}
                      height={ICELL}
                      rx={3}
                      fill={inWin ? C.blueFill : "var(--card)"}
                      stroke={inWin ? C.blue : C.line}
                      strokeWidth={inWin ? 1.3 : 1}
                    />
                    <text
                      x={icellX(c) + ICELL / 2}
                      y={icellY(r) + ICELL / 2 + 3.5}
                      textAnchor="middle"
                      fontFamily={MONO}
                      fontSize={10}
                      fill={
                        mode === "max" && isMaxCell
                          ? C.coral
                          : inWin
                            ? C.ink
                            : C.muted
                      }
                    >
                      {v}
                    </text>
                  </g>
                );
              }),
            )}

            {/* Window outline (thick) over the input grid */}
            <rect
              x={icellX(wc * 2) - 1.5}
              y={icellY(wr * 2) - 1.5}
              width={2 * ICELL + IGAP + 3}
              height={2 * ICELL + IGAP + 3}
              rx={4}
              fill="none"
              stroke={C.blue}
              strokeWidth={2}
            />

            {/* Arrow from input to MAX output */}
            <line
              x1={IGX + igridW + 6}
              y1={IGY + igridW / 2}
              x2={MAXGX - 8}
              y2={OGY + ogridW / 2}
              stroke={C.line}
              strokeWidth={1.2}
            />

            {/* MAX output header + grid */}
            <text
              x={MAXGX + ogridW / 2}
              y={OGY - 10}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={10}
              fill={mode === "max" ? C.coral : C.muted}
            >
              Max
            </text>
            {[0, 1].map((or: number) =>
              [0, 1].map((oc: number) => {
                const v = maxOf(windowVals(grid, or, oc));
                const isSel = or === wr && oc === wc;
                return (
                  <g key={`max-${or}-${oc}`}>
                    <rect
                      x={ocellX(MAXGX, oc)}
                      y={ocellY(or)}
                      width={OCELL}
                      height={OCELL}
                      rx={3}
                      fill={isSel ? C.coralFill : "var(--card)"}
                      stroke={isSel ? C.coral : C.line}
                      strokeWidth={isSel ? 1.4 : 1}
                    />
                    <text
                      x={ocellX(MAXGX, oc) + OCELL / 2}
                      y={ocellY(or) + OCELL / 2 + 3.5}
                      textAnchor="middle"
                      fontFamily={MONO}
                      fontSize={10}
                      fill={isSel ? C.coral : C.muted}
                    >
                      {v}
                    </text>
                  </g>
                );
              }),
            )}

            {/* AVG output header + grid */}
            <text
              x={AVGGX + ogridW / 2}
              y={OGY - 10}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={10}
              fill={mode === "avg" ? C.violet : C.muted}
            >
              Average
            </text>
            {[0, 1].map((or: number) =>
              [0, 1].map((oc: number) => {
                const v = avgOf(windowVals(grid, or, oc));
                const isSel = or === wr && oc === wc;
                return (
                  <g key={`avg-${or}-${oc}`}>
                    <rect
                      x={ocellX(AVGGX, oc)}
                      y={ocellY(or)}
                      width={OCELL}
                      height={OCELL}
                      rx={3}
                      fill={isSel ? C.blueFill : "var(--card)"}
                      stroke={isSel ? C.violet : C.line}
                      strokeWidth={isSel ? 1.4 : 1}
                    />
                    <text
                      x={ocellX(AVGGX, oc) + OCELL / 2}
                      y={ocellY(or) + OCELL / 2 + 3.5}
                      textAnchor="middle"
                      fontFamily={MONO}
                      fontSize={9}
                      fill={isSel ? C.violet : C.muted}
                    >
                      {v.toFixed(1)}
                    </text>
                  </g>
                );
              }),
            )}

            {/* Readout band: this window's computation */}
            <text
              x={IGX}
              y={214}
              fontFamily={MONO}
              fontSize={9.5}
              fill={C.ink}
            >
              window {`[${wr},${wc}]`} = {`{${selVals.join(", ")}}`}
            </text>
            <text
              x={IGX}
              y={230}
              fontFamily={MONO}
              fontSize={9.5}
              fill={C.coral}
            >
              max = {selMax}
            </text>
            <text
              x={IGX + 92}
              y={230}
              fontFamily={MONO}
              fontSize={9.5}
              fill={C.violet}
            >
              avg = {selAvg.toFixed(2)}
            </text>
            <text
              x={IGX + 200}
              y={230}
              fontFamily={MONO}
              fontSize={9}
              fill={shifted ? C.green : C.muted}
            >
              {shifted
                ? "shifted +1px — max output unchanged"
                : "toggle shift to test invariance"}
            </text>
          </>
        )}

        {/* ---------- BOTTOM SECTION (global pooling) ---------- */}
        {isGlobal && (
          <>
            <text
              x={IGX}
              y={44}
              fontFamily={MONO}
              fontSize={9.5}
              fill={C.muted}
            >
              Global average pooling: (C,H,W) volume → length-C vector
            </text>

            {/* Three channel maps, drawn as small 3x3 grids spaced apart */}
            {VOLUME.map((mp: number[][], ch: number) => {
              const baseX = GVX + ch * (GMAP_W + GGAP_X);
              const mapY = 84;
              return (
                <g key={`vol-${ch}`}>
                  <text
                    x={baseX + GMAP_W / 2}
                    y={mapY - 8}
                    textAnchor="middle"
                    fontFamily={MONO}
                    fontSize={9}
                    fill={C.muted}
                  >
                    ch {ch}
                  </text>
                  {mp.map((rowArr: number[], r: number) =>
                    rowArr.map((v: number, c: number) => (
                      <g key={`v-${ch}-${r}-${c}`}>
                        <rect
                          x={baseX + c * GCELL}
                          y={mapY + r * GCELL}
                          width={GCELL}
                          height={GCELL}
                          fill="var(--card)"
                          stroke={C.line}
                          strokeWidth={0.8}
                        />
                        <text
                          x={baseX + c * GCELL + GCELL / 2}
                          y={mapY + r * GCELL + GCELL / 2 + 3}
                          textAnchor="middle"
                          fontFamily={MONO}
                          fontSize={8}
                          fill={C.muted}
                        >
                          {v}
                        </text>
                      </g>
                    )),
                  )}

                  {/* Collapse arrow + resulting scalar */}
                  <line
                    x1={baseX + GMAP_W / 2}
                    y1={mapY + GH * GCELL + 6}
                    x2={baseX + GMAP_W / 2}
                    y2={mapY + GH * GCELL + 30}
                    stroke={C.line}
                    strokeWidth={1.2}
                  />
                  <circle
                    cx={baseX + GMAP_W / 2}
                    cy={mapY + GH * GCELL + 44}
                    r={11}
                    fill={showVector ? C.greenFill : "var(--card)"}
                    stroke={showVector ? C.green : C.line}
                    strokeWidth={1.3}
                  />
                  <text
                    x={baseX + GMAP_W / 2}
                    y={mapY + GH * GCELL + 47.5}
                    textAnchor="middle"
                    fontFamily={MONO}
                    fontSize={9}
                    fill={showVector ? C.green : C.muted}
                  >
                    {showVector ? gVec[ch].toFixed(1) : "?"}
                  </text>
                </g>
              );
            })}

            {/* Resulting vector readout */}
            <text
              x={IGX}
              y={238}
              fontFamily={MONO}
              fontSize={9.5}
              fill={showVector ? C.green : C.muted}
            >
              {showVector
                ? `output vector = [${gVec.map((x: number) => x.toFixed(2)).join(", ")}]`
                : "press “run global avg” to collapse each map"}
            </text>
          </>
        )}

        {/* Divider above caption */}
        <line
          x1={12}
          y1={372}
          x2={VW - 12}
          y2={372}
          stroke={C.line}
          strokeWidth={1}
        />

        {/* Caption band (two lines, each fits within VW-24) */}
        <text
          x={VW / 2}
          y={388}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          Pooling shrinks space. Max keeps the strongest signal;
        </text>
        <text
          x={VW / 2}
          y={402}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          global average pooling collapses each map to one number at the end.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          className={btn}
          style={mode === "max" ? { background: C.ink, color: "var(--background)" } : undefined}
          onClick={() => setMode("max")}
        >
          Max
        </button>
        <button
          type="button"
          className={btn}
          style={mode === "avg" ? { background: C.ink, color: "var(--background)" } : undefined}
          onClick={() => setMode("avg")}
        >
          Average
        </button>
        <button
          type="button"
          className={btn}
          style={mode === "global" ? { background: C.ink, color: "var(--background)" } : undefined}
          onClick={() => setMode("global")}
        >
          Global
        </button>

        {!isGlobal && (
          <>
            <label className="flex items-center gap-2">
              <span className="font-mono">window</span>
              <input
                type="range"
                min={0}
                max={3}
                step={1}
                value={winIdx}
                onChange={(e) => setWinIdx(Number(e.target.value))}
                className="w-28 accent-[var(--foreground)]"
              />
              <span className="font-mono tabular-nums">
                [{Math.floor(winIdx / 2)},{winIdx % 2}]
              </span>
            </label>
            <button
              type="button"
              className={btn}
              style={shifted ? { background: C.ink, color: "var(--background)" } : undefined}
              onClick={() => setShifted((s: boolean) => !s)}
            >
              shift +1px
            </button>
          </>
        )}

        {isGlobal && (
          <button
            type="button"
            className={btn}
            style={showVector ? { background: C.ink, color: "var(--background)" } : undefined}
            onClick={() => setShowVector((s: boolean) => !s)}
          >
            run global avg
          </button>
        )}
      </div>
    </div>
  );
}
