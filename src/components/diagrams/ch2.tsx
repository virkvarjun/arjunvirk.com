import { C, MONO, Label, Arrow, plotCurve } from "./frame";

function NodeC({
  x,
  y,
  label,
  color = C.ink,
  r = 16,
}: {
  x: number;
  y: number;
  label: string;
  color?: string;
  r?: number;
}) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="var(--background)" stroke={color} strokeWidth={1.6} />
      <text x={x} y={y + 4} fontSize={12} fill={C.ink} fontFamily={MONO} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// 2.1 Sum over paths (the multivariate chain rule)
// ---------------------------------------------------------------------------

export function SumOverPaths() {
  return (
    <>
      <line x1={78} y1={100} x2={186} y2={62} stroke={C.muted} strokeWidth={1.1} />
      <line x1={78} y1={100} x2={186} y2={138} stroke={C.muted} strokeWidth={1.1} />
      <line x1={214} y1={62} x2={322} y2={100} stroke={C.muted} strokeWidth={1.1} />
      <line x1={214} y1={138} x2={322} y2={100} stroke={C.muted} strokeWidth={1.1} />
      <NodeC x={60} y={100} label="x" color={C.blue} />
      <NodeC x={200} y={62} label="u₁" />
      <NodeC x={200} y={138} label="u₂" />
      <NodeC x={340} y={100} label="y" color={C.green} />
      <Label x={120} y={68} size={9}>
        ∂u₁/∂x
      </Label>
      <Label x={120} y={142} size={9}>
        ∂u₂/∂x
      </Label>
      <Label x={272} y={68} size={9} anchor="end">
        ∂y/∂u₁
      </Label>
      <Label x={272} y={142} size={9} anchor="end">
        ∂y/∂u₂
      </Label>
      <Label x={200} y={186} anchor="middle" size={10} fill={C.muted}>
        ∂y/∂x = Σ (∂y/∂uₚ)(∂uₚ/∂x), sum over every path
      </Label>
    </>
  );
}

// ---------------------------------------------------------------------------
// 2.2 Weight indexing: w^(l)_{jk} goes INTO j FROM k (destination first)
// ---------------------------------------------------------------------------

export function WeightIndexing() {
  const left = [60, 110, 160];
  const right = [60, 110, 160];
  const lx = 130;
  const rx = 290;
  return (
    <>
      {/* faint edges */}
      {left.flatMap((y1, k) =>
        right.map((y2, j) => (
          <line
            key={`${k}-${j}`}
            x1={lx}
            y1={y1}
            x2={rx}
            y2={y2}
            stroke={C.line}
            strokeWidth={0.8}
          />
        )),
      )}
      {/* highlighted weight w_{j=1, k=2}: from source k=2 (middle left) to dest j=1 (top right) */}
      <line x1={lx} y1={left[1]} x2={rx} y2={right[0]} stroke={C.coral} strokeWidth={2.2} />
      {left.map((y, i) => (
        <NodeC key={`l${i}`} x={lx} y={y} label={`${i + 1}`} r={13} />
      ))}
      {right.map((y, i) => (
        <NodeC key={`r${i}`} x={rx} y={y} label={`${i + 1}`} r={13} />
      ))}
      <Label x={lx} y={195} anchor="middle" size={10}>
        layer ℓ−1 (source k)
      </Label>
      <Label x={rx} y={195} anchor="middle" size={10}>
        layer ℓ (dest j)
      </Label>
      <text x={210} y={40} fontSize={12} fill={C.coral} fontFamily={MONO} textAnchor="middle">
        w⁽ˡ⁾₍ⱼₖ₎ : k=2 → j=1
      </text>
    </>
  );
}

// ---------------------------------------------------------------------------
// 2.3 Backward error signal (BP2)
// ---------------------------------------------------------------------------

export function ErrorBackprop() {
  const lEll = [60, 110, 160];
  const lNext = [70, 140];
  const lx = 120;
  const rx = 300;
  return (
    <>
      {/* forward edges (faint) */}
      {lEll.flatMap((y1, k) =>
        lNext.map((y2, j) => (
          <line key={`${k}-${j}`} x1={lx} y1={y1} x2={rx} y2={y2} stroke={C.line} strokeWidth={0.8} />
        )),
      )}
      {/* backward error arrows */}
      {lNext.flatMap((y2, j) =>
        lEll.map((y1, k) => (
          <Arrow
            key={`b${j}-${k}`}
            x1={rx - 16}
            y1={y2}
            x2={lx + 18}
            y2={y1}
            color={C.coral}
            width={1}
            head={5}
          />
        )),
      )}
      {lEll.map((y, i) => (
        <NodeC key={`e${i}`} x={lx} y={y} label="" r={13} color={C.ink} />
      ))}
      {lNext.map((y, i) => (
        <NodeC key={`n${i}`} x={rx} y={y} label="" r={13} color={C.ink} />
      ))}
      <Label x={lx} y={195} anchor="middle" size={10}>
        layer ℓ → δ⁽ˡ⁾
      </Label>
      <Label x={rx} y={195} anchor="middle" size={10}>
        layer ℓ+1 → δ⁽ˡ⁺¹⁾
      </Label>
      <text x={210} y={30} fontSize={11} fill={C.coral} fontFamily={MONO} textAnchor="middle">
        δ⁽ˡ⁾ = (Wᵀδ⁽ˡ⁺¹⁾) ⊙ σ′(z⁽ˡ⁾)
      </text>
    </>
  );
}

// ---------------------------------------------------------------------------
// 2.4 Sigmoid and its derivative
// ---------------------------------------------------------------------------

export function SigmoidDerivative() {
  const mapX = (x: number) => 55 + ((x + 6) / 12) * 320;
  const mapY = (y: number) => 200 - (y / 1.05) * 175;
  const sig = (x: number) => 1 / (1 + Math.exp(-x));
  const dsig = (x: number) => sig(x) * (1 - sig(x));
  return (
    <>
      <line x1={mapX(0)} y1={20} x2={mapX(0)} y2={200} stroke={C.line} strokeWidth={1} />
      <line x1={55} y1={mapY(0)} x2={375} y2={mapY(0)} stroke={C.line} strokeWidth={1} />
      <polyline points={plotCurve(sig, -6, 6, 80, mapX, mapY)} fill="none" stroke={C.blue} strokeWidth={1.8} />
      <polyline points={plotCurve(dsig, -6, 6, 80, mapX, mapY)} fill="none" stroke={C.coral} strokeWidth={1.8} />
      <Label x={mapX(0) + 4} y={mapY(0.25) - 2} size={9} fill={C.coral}>
        max 0.25
      </Label>
      <g>
        <line x1={290} y1={36} x2={306} y2={36} stroke={C.blue} strokeWidth={2} />
        <text x={310} y={39} fontSize={10} fill={C.muted} fontFamily={MONO}>
          σ(z)
        </text>
        <line x1={290} y1={52} x2={306} y2={52} stroke={C.coral} strokeWidth={2} />
        <text x={310} y={55} fontSize={10} fill={C.muted} fontFamily={MONO}>
          σ′(z) = σ(1−σ)
        </text>
      </g>
    </>
  );
}
