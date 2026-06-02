"use client";

import { useState, type ReactElement } from "react";
import { C, MONO } from "../frame";

// viewBox geometry. Bands top-to-bottom:
//   title (0..28)
//   forward pass (40..118)
//   latent map + readout (140..308)
//   generation mode (330..408)
//   caption (430..464)
const VW = 500;
const VH = 472;

// Latent map (2-D latent space) geometry — a square plotted on the left.
const MAP_X = 28;
const MAP_Y = 150;
const MAP_W = 200;
const MAP_H = 150;
const MAP_CX = MAP_X + MAP_W / 2; // pixel center == latent origin (0,0)
const MAP_CY = MAP_Y + MAP_H / 2;
// Pixels per latent unit. Latent axes span roughly [-2.4, 2.4].
const SCALE = 38;

// The "pinned" location the reconstruction term wants the cloud to sit at.
// (A point well off-center; reconstructing well means parking the cloud here.)
const PIN_MU = 1.5; // in latent units, along a diagonal

// Map a latent (lx, ly) to pixel coordinates.
const px = (lx: number): number => MAP_CX + lx * SCALE;
const py = (ly: number): number => MAP_CY - ly * SCALE;

// Deterministic offsets used to scatter sampled generation points (no random).
const GEN_OFFSETS: { x: number; y: number }[] = [
  { x: -0.9, y: 0.7 },
  { x: 0.6, y: 1.0 },
  { x: 1.1, y: -0.5 },
  { x: -0.4, y: -1.0 },
  { x: 0.2, y: 0.3 },
  { x: -1.2, y: -0.2 },
];

const btn =
  "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

export function TfVaeTwoPulls() {
  // beta: KL weight. 0 -> pure reconstruction (cloud free to sit off-center,
  // tight). Large -> KL dominates, cloud collapses toward N(0,I).
  const [beta, setBeta] = useState<number>(0.4);
  // How many generation samples have been revealed (cycled by the button).
  const [genCount, setGenCount] = useState<number>(0);

  // As beta grows, the KL pull wins: the cloud center slides from the pinned
  // reconstruction location back toward the origin, and sigma -> 1 (the prior).
  const pull = Math.min(1, beta / 1.5); // 0..1 fraction the KL pull has won
  const mu = PIN_MU * (1 - pull); // along x and y (diagonal cloud center)

  // Reconstruction wants sigma small (tight, precise). KL wants sigma -> 1.
  // sigma interpolates from a tight 0.35 toward the prior std of 1.0.
  const sigma = 0.35 + 0.65 * pull;

  // KL( N(mu,sigma^2) || N(0,1) ) per dimension, x2 dims (mu equal on both):
  //   0.5 * ( mu^2 + sigma^2 - 1 - 2*log(sigma) )  per dim.
  const klPerDim = 0.5 * (mu * mu + sigma * sigma - 1 - 2 * Math.log(sigma));
  const kl = 2 * klPerDim; // two latent dimensions

  // Reconstruction quality degrades as the cloud leaves its pinned spot and
  // puffs up. Express as a 0..1 score (1 = perfect) for the readout bar.
  const recon = Math.max(0, 1 - 0.55 * pull - 0.25 * pull * pull);

  // Cloud render geometry (an ellipse at (mu,mu) with radius ~2 sigma).
  const cloudCx = px(mu);
  const cloudCy = py(mu);
  const cloudR = sigma * SCALE * 1.9;

  // Prior cloud N(0,I): centered at origin, std 1.
  const priorR = 1.0 * SCALE * 1.9;

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="A variational autoencoder encodes an input into a latent cloud, then balances two competing pulls: the reconstruction term parks the cloud tight and off-center, while the KL term pulls every cloud toward the standard normal prior at the origin. A beta slider grows the KL weight, collapsing the cloud onto the prior while reconstruction degrades. A generate button samples random center points and decodes them into new images."
      >
        {/* Title band */}
        <text
          x={VW / 2}
          y={20}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={13}
          fill={C.ink}
        >
          VAE: Generation and the Two Pulls
        </text>

        {/* ---------- Forward pass band (40..118) ---------- */}
        {(() => {
          const cy = 76;
          const boxH = 30;
          const boxes: { x: number; w: number; label: string; sub?: string }[] = [
            { x: 28, w: 36, label: "x", sub: "input" },
            { x: 92, w: 56, label: "encoder" },
            { x: 176, w: 60, label: "μ, σ", sub: "cloud" },
            { x: 264, w: 70, label: "z = μ+σε", sub: "sample" },
            { x: 362, w: 56, label: "decoder" },
            { x: 446, w: 38, label: "x̂", sub: "recon" },
          ];
          return (
            <g>
              <text
                x={28}
                y={50}
                fontFamily={MONO}
                fontSize={9.5}
                fill={C.muted}
              >
                forward pass (reparameterization: ε ~ N(0,1))
              </text>
              {boxes.map((b, i) => (
                <g key={`fb-${i}`}>
                  <rect
                    x={b.x}
                    y={cy - boxH / 2}
                    width={b.w}
                    height={boxH}
                    rx={4}
                    fill="var(--card)"
                    stroke={C.line}
                    strokeWidth={1.1}
                  />
                  <text
                    x={b.x + b.w / 2}
                    y={cy + (b.sub ? -1 : 3.5)}
                    textAnchor="middle"
                    fontFamily={MONO}
                    fontSize={10}
                    fill={C.ink}
                  >
                    {b.label}
                  </text>
                  {b.sub ? (
                    <text
                      x={b.x + b.w / 2}
                      y={cy + 10}
                      textAnchor="middle"
                      fontFamily={MONO}
                      fontSize={7.5}
                      fill={C.muted}
                    >
                      {b.sub}
                    </text>
                  ) : null}
                </g>
              ))}
              {/* connector arrows between consecutive boxes */}
              {boxes.slice(0, -1).map((b, i) => {
                const next = boxes[i + 1];
                const x1 = b.x + b.w;
                const x2 = next.x;
                return (
                  <line
                    key={`fa-${i}`}
                    x1={x1 + 1}
                    y1={cy}
                    x2={x2 - 1}
                    y2={cy}
                    stroke={C.muted}
                    strokeWidth={1}
                    markerEnd="url(#vaeArrow)"
                  />
                );
              })}
            </g>
          );
        })()}

        <defs>
          <marker
            id="vaeArrow"
            viewBox="0 0 8 8"
            refX="6.5"
            refY="4"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0,1 L7,4 L0,7 Z" fill={C.muted} />
          </marker>
          <marker
            id="vaeBlue"
            viewBox="0 0 8 8"
            refX="6.5"
            refY="4"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M0,1 L7,4 L0,7 Z" fill={C.blue} />
          </marker>
          <marker
            id="vaeCoral"
            viewBox="0 0 8 8"
            refX="6.5"
            refY="4"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M0,1 L7,4 L0,7 Z" fill={C.coral} />
          </marker>
        </defs>

        {/* ---------- Latent map (the two pulls) ---------- */}
        <text
          x={MAP_X}
          y={MAP_Y - 8}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
        >
          latent map (2-D)
        </text>
        <rect
          x={MAP_X}
          y={MAP_Y}
          width={MAP_W}
          height={MAP_H}
          rx={5}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1.1}
        />
        {/* axes through the origin */}
        <line
          x1={MAP_X}
          y1={MAP_CY}
          x2={MAP_X + MAP_W}
          y2={MAP_CY}
          stroke={C.grid}
          strokeWidth={1}
        />
        <line
          x1={MAP_CX}
          y1={MAP_Y}
          x2={MAP_CX}
          y2={MAP_Y + MAP_H}
          stroke={C.grid}
          strokeWidth={1}
        />

        {/* prior N(0,I): dashed target at the origin */}
        <circle
          cx={MAP_CX}
          cy={MAP_CY}
          r={priorR}
          fill="none"
          stroke={C.green}
          strokeWidth={1.2}
          strokeDasharray="3 3"
        />
        <text
          x={MAP_CX + 4}
          y={MAP_CY - priorR - 3}
          fontFamily={MONO}
          fontSize={8}
          fill={C.green}
        >
          N(0,I) prior
        </text>

        {/* pinned reconstruction target */}
        <g>
          <line
            x1={px(PIN_MU) - 4}
            y1={py(PIN_MU) - 4}
            x2={px(PIN_MU) + 4}
            y2={py(PIN_MU) + 4}
            stroke={C.blue}
            strokeWidth={1.4}
          />
          <line
            x1={px(PIN_MU) - 4}
            y1={py(PIN_MU) + 4}
            x2={px(PIN_MU) + 4}
            y2={py(PIN_MU) - 4}
            stroke={C.blue}
            strokeWidth={1.4}
          />
        </g>

        {/* the encoded cloud (moves + resizes with beta) */}
        <circle
          cx={cloudCx}
          cy={cloudCy}
          r={cloudR}
          fill={C.coralFill}
          stroke={C.coral}
          strokeWidth={1.4}
          opacity={0.85}
        />
        <circle cx={cloudCx} cy={cloudCy} r={2} fill={C.coral} />

        {/* Pull #1: reconstruction — from cloud toward the pinned target */}
        {pull < 0.97 ? (
          <line
            x1={cloudCx}
            y1={cloudCy}
            x2={px(PIN_MU) - 7}
            y2={py(PIN_MU) + 7}
            stroke={C.blue}
            strokeWidth={1.4}
            markerEnd="url(#vaeBlue)"
          />
        ) : null}
        {/* Pull #2: KL — from cloud toward the origin */}
        {pull > 0.03 ? (
          <line
            x1={cloudCx}
            y1={cloudCy}
            x2={MAP_CX + (cloudCx > MAP_CX ? -6 : 6)}
            y2={MAP_CY + (cloudCy > MAP_CY ? 6 : -6)}
            stroke={C.coral}
            strokeWidth={1.4}
            markerEnd="url(#vaeCoral)"
          />
        ) : null}

        {/* ---------- Readout panel (right of the map) ---------- */}
        {(() => {
          const rx = MAP_X + MAP_W + 30;
          const rw = VW - rx - 20;
          let ry = MAP_Y + 2;
          const line = (
            label: string,
            color: string,
            size = 10,
          ): ReactElement => {
            const el = (
              <text
                key={`r-${label}`}
                x={rx}
                y={ry}
                fontFamily={MONO}
                fontSize={size}
                fill={color}
              >
                {label}
              </text>
            );
            ry += 16;
            return el;
          };
          const reconW = rw * recon;
          const klBarW = rw * Math.min(1, kl / 6);
          return (
            <g>
              {line("Pull #1  reconstruction (blue)", C.blue)}
              {line("→ park cloud tight & off-center", C.muted, 8.5)}
              {(() => {
                ry += 2;
                return null;
              })()}
              {line("Pull #2  KL term (coral)", C.coral)}
              {line("→ pull toward N(0,I), stay puffy", C.muted, 8.5)}
              {(() => {
                ry += 6;
                return null;
              })()}
              {line(`β (KL weight) = ${beta.toFixed(2)}`, C.ink)}
              {line(`μ = ${mu.toFixed(2)}    σ = ${sigma.toFixed(2)}`, C.muted)}
              {/* KL value + bar */}
              {line(`KL = ${kl.toFixed(2)}`, C.coral)}
              <rect
                x={rx}
                y={ry - 9}
                width={rw}
                height={6}
                rx={3}
                fill={C.grid}
              />
              <rect
                x={rx}
                y={ry - 9}
                width={klBarW}
                height={6}
                rx={3}
                fill={C.coral}
              />
              {(() => {
                ry += 18;
                return null;
              })()}
              {line(`recon quality = ${(recon * 100).toFixed(0)}%`, C.green)}
              <rect
                x={rx}
                y={ry - 9}
                width={rw}
                height={6}
                rx={3}
                fill={C.grid}
              />
              <rect
                x={rx}
                y={ry - 9}
                width={reconW}
                height={6}
                rx={3}
                fill={C.green}
              />
            </g>
          );
        })()}

        {/* KL formula band, below the map */}
        <text
          x={28}
          y={MAP_Y + MAP_H + 24}
          fontFamily={MONO}
          fontSize={10.5}
          fill={C.ink}
        >
          KL = ½ Σ ( μ²  +  σ² − log σ² − 1 )
        </text>
        <text
          x={282}
          y={MAP_Y + MAP_H + 24}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.blue}
        >
          μ²: off-center penalty
        </text>
        <text
          x={282}
          y={MAP_Y + MAP_H + 36}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.coral}
        >
          σ²−log σ²: anti-collapse (wants σ→1)
        </text>

        {/* ---------- Generation mode band (330..408) ---------- */}
        {(() => {
          const gy = 374;
          const boxH = 28;
          return (
            <g>
              <text x={28} y={gy - 14} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
                generation mode — encoder discarded, sample from N(0,I) &amp; decode
              </text>
              {/* sample box */}
              <rect
                x={28}
                y={gy}
                width={72}
                height={boxH}
                rx={4}
                fill="var(--card)"
                stroke={C.green}
                strokeWidth={1.2}
              />
              <text
                x={64}
                y={gy + boxH / 2 + 3.5}
                textAnchor="middle"
                fontFamily={MONO}
                fontSize={9}
                fill={C.green}
              >
                z ~ N(0,I)
              </text>
              <line
                x1={101}
                y1={gy + boxH / 2}
                x2={123}
                y2={gy + boxH / 2}
                stroke={C.muted}
                strokeWidth={1}
                markerEnd="url(#vaeArrow)"
              />
              {/* decoder box */}
              <rect
                x={124}
                y={gy}
                width={56}
                height={boxH}
                rx={4}
                fill="var(--card)"
                stroke={C.line}
                strokeWidth={1.1}
              />
              <text
                x={152}
                y={gy + boxH / 2 + 3.5}
                textAnchor="middle"
                fontFamily={MONO}
                fontSize={9}
                fill={C.ink}
              >
                decoder
              </text>
              <line
                x1={181}
                y1={gy + boxH / 2}
                x2={203}
                y2={gy + boxH / 2}
                stroke={C.muted}
                strokeWidth={1}
                markerEnd="url(#vaeArrow)"
              />
              {/* sampled points strip */}
              {GEN_OFFSETS.slice(0, genCount).map((o, i) => {
                const sx = 214 + i * 46;
                const sy = gy + boxH / 2;
                return (
                  <g key={`gen-${i}`}>
                    {/* tiny "new image" tile */}
                    <rect
                      x={sx}
                      y={sy - 13}
                      width={26}
                      height={26}
                      rx={3}
                      fill={C.greenFill}
                      stroke={C.green}
                      strokeWidth={1}
                    />
                    <circle
                      cx={sx + 13 + o.x * 4}
                      cy={sy + o.y * 4}
                      r={4}
                      fill={C.green}
                    />
                  </g>
                );
              })}
              {genCount === 0 ? (
                <text
                  x={214}
                  y={gy + boxH / 2 + 3.5}
                  fontFamily={MONO}
                  fontSize={8.5}
                  fill={C.muted}
                >
                  press “generate” →
                </text>
              ) : null}
            </g>
          );
        })()}

        {/* ---------- Caption band ---------- */}
        <text
          x={VW / 2}
          y={VH - 24}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          Encode to a cloud, balance reconstruction against the KL pull,
        </text>
        <text
          x={VW / 2}
          y={VH - 10}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          then generate by decoding random center points.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2">
          <span className="font-mono">β (KL weight)</span>
          <input
            type="range"
            min={0}
            max={1.5}
            step={0.05}
            value={beta}
            onChange={(e) => setBeta(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{beta.toFixed(2)}</span>
        </label>
        <button
          type="button"
          className={btn}
          onClick={() => setGenCount((c) => (c >= GEN_OFFSETS.length ? 1 : c + 1))}
        >
          generate
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => setGenCount(0)}
        >
          clear
        </button>
      </div>
    </div>
  );
}
