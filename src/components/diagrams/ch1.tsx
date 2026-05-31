import { C, MONO, Dot, Label, Arrow, plotCurve } from "./frame";

// ---------------------------------------------------------------------------
// 1.1 A feedforward network (MLP): input -> hidden -> hidden -> output
// ---------------------------------------------------------------------------

export function MLPNetwork() {
  const layers = [
    { x: 60, ys: [70, 120, 170], color: C.blue },
    { x: 175, ys: [57, 99, 141, 183], color: C.ink },
    { x: 290, ys: [57, 99, 141, 183], color: C.ink },
    { x: 360, ys: [95, 145], color: C.green },
  ];
  const labels = ["input", "hidden", "hidden", "output"];
  return (
    <>
      {/* edges */}
      {layers.slice(0, -1).map((layer, li) =>
        layer.ys.flatMap((y1) =>
          layers[li + 1].ys.map((y2, k) => (
            <line
              key={`${li}-${y1}-${k}`}
              x1={layer.x}
              y1={y1}
              x2={layers[li + 1].x}
              y2={y2}
              stroke={C.line}
              strokeWidth={0.8}
            />
          )),
        ),
      )}
      {/* nodes */}
      {layers.map((layer, li) => (
        <g key={li}>
          {layer.ys.map((y) => (
            <circle
              key={y}
              cx={layer.x}
              cy={y}
              r={9}
              fill="var(--background)"
              stroke={layer.color}
              strokeWidth={1.6}
            />
          ))}
          <Label x={layer.x} y={212} anchor="middle" size={10}>
            {labels[li]}
          </Label>
        </g>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// 1.2 Activation functions
// ---------------------------------------------------------------------------

export function ActivationFunctions() {
  const mapX = (x: number) => 55 + ((x + 4) / 8) * 320;
  const mapY = (y: number) => 205 - ((y + 1.5) / 5.5) * 180;
  const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
  const tanh = (x: number) => Math.tanh(x);
  const relu = (x: number) => Math.max(0, x);
  const gelu = (x: number) =>
    0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));
  const curves = [
    { f: sigmoid, color: C.blue, name: "sigmoid" },
    { f: tanh, color: C.coral, name: "tanh" },
    { f: relu, color: C.green, name: "ReLU" },
    { f: gelu, color: C.violet, name: "GELU" },
  ];
  return (
    <>
      {/* axes */}
      <line x1={mapX(0)} y1={20} x2={mapX(0)} y2={210} stroke={C.line} strokeWidth={1} />
      <line x1={55} y1={mapY(0)} x2={375} y2={mapY(0)} stroke={C.line} strokeWidth={1} />
      {curves.map((c) => (
        <polyline
          key={c.name}
          points={plotCurve(c.f, -4, 4, 80, mapX, mapY)}
          fill="none"
          stroke={c.color}
          strokeWidth={1.8}
        />
      ))}
      {/* legend */}
      {curves.map((c, i) => (
        <g key={`l${c.name}`}>
          <line
            x1={300}
            y1={32 + i * 16}
            x2={316}
            y2={32 + i * 16}
            stroke={c.color}
            strokeWidth={2}
          />
          <text
            x={320}
            y={35 + i * 16}
            fontSize={10}
            fill={C.muted}
            fontFamily={MONO}
          >
            {c.name}
          </text>
        </g>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// 1.3 Gradient descent on a loss surface
// ---------------------------------------------------------------------------

export function GradientDescent() {
  const cx = 250;
  const cy = 125;
  const rings = [
    [40, 28],
    [78, 54],
    [116, 80],
    [154, 106],
  ];
  const path: [number, number][] = [
    [95, 35],
    [135, 92],
    [185, 70],
    [212, 126],
    [232, 108],
    [246, 124],
  ];
  return (
    <>
      {rings.map(([rx, ry], i) => (
        <ellipse
          key={i}
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="none"
          stroke={C.line}
          strokeWidth={1}
        />
      ))}
      <Dot x={cx} y={cy} fill={C.ink} r={3} />
      <Label x={cx + 8} y={cy + 3} size={10} fill={C.muted}>
        minimum
      </Label>
      {path.slice(0, -1).map(([x, y], i) => (
        <Arrow
          key={i}
          x1={x}
          y1={y}
          x2={path[i + 1][0]}
          y2={path[i + 1][1]}
          color={C.coral}
          width={1.6}
          head={6}
        />
      ))}
      {path.map(([x, y], i) => (
        <Dot key={`d${i}`} x={x} y={y} fill={C.coral} r={3} />
      ))}
      <Label x={92} y={28} size={10} fill={C.coral}>
        start
      </Label>
      <Label x={150} y={92} size={10} fill={C.coral} anchor="end">
        −η∇L
      </Label>
    </>
  );
}

// ---------------------------------------------------------------------------
// 1.4 Backpropagation: forward activations, backward error signal
// ---------------------------------------------------------------------------

export function BackpropFlow() {
  const boxes = [
    { x: 40, label: "x" },
    { x: 150, label: "a⁽¹⁾" },
    { x: 260, label: "a⁽²⁾" },
    { x: 370, label: "ŷ" },
  ];
  const w = 56;
  const h = 34;
  const midY = 95;
  return (
    <>
      {/* forward arrows (top) */}
      {boxes.slice(0, -1).map((b, i) => (
        <Arrow
          key={`f${i}`}
          x1={b.x + w / 2}
          y1={midY - 4}
          x2={boxes[i + 1].x - w / 2}
          y2={midY - 4}
          color={C.blue}
          width={1.6}
          head={6}
        />
      ))}
      {/* loss node */}
      <Arrow x1={370 + w / 2} y1={midY - 4} x2={430} y2={midY - 4} color={C.blue} width={1.6} head={6} />
      <text x={444} y={midY - 1} fontSize={11} fill={C.ink} fontFamily={MONO} textAnchor="middle">
        L
      </text>
      {/* backward arrows (bottom) */}
      {boxes.slice(1).map((b, i) => (
        <Arrow
          key={`b${i}`}
          x1={b.x - w / 2}
          y1={midY + h + 6}
          x2={boxes[i].x + w / 2}
          y2={midY + h + 6}
          color={C.coral}
          width={1.6}
          head={6}
        />
      ))}
      <Arrow x1={430} y1={midY + h + 6} x2={370 + w / 2} y2={midY + h + 6} color={C.coral} width={1.6} head={6} />
      {/* boxes */}
      {boxes.map((b) => (
        <g key={b.label}>
          <rect
            x={b.x - w / 2}
            y={midY}
            width={w}
            height={h}
            rx={6}
            fill="var(--background)"
            stroke={C.line}
            strokeWidth={1.25}
          />
          <text x={b.x} y={midY + 22} fontSize={12} fill={C.ink} fontFamily={MONO} textAnchor="middle">
            {b.label}
          </text>
        </g>
      ))}
      <Label x={205} y={midY - 12} size={10} fill={C.blue} anchor="middle">
        forward: z = Wa + b, a = σ(z)
      </Label>
      <Label x={205} y={midY + h + 26} size={10} fill={C.coral} anchor="middle">
        backward: propagate δ = ∂L/∂z
      </Label>
    </>
  );
}

// ---------------------------------------------------------------------------
// 1.5 Train vs validation loss (overfitting + early stopping)
// ---------------------------------------------------------------------------

export function TrainValLoss() {
  const mapX = (t: number) => 55 + t * 320;
  const mapY = (v: number) => 205 - (v / 1.1) * 180;
  const train = (t: number) => 0.13 + 0.82 * Math.exp(-3.2 * t);
  const val = (t: number) => 0.2 + 0.78 * Math.exp(-4.2 * t) + 0.55 * t * t;
  // approximate validation minimum
  let tMin = 0;
  let vMin = Infinity;
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    if (val(t) < vMin) {
      vMin = val(t);
      tMin = t;
    }
  }
  return (
    <>
      <line x1={55} y1={20} x2={55} y2={205} stroke={C.line} strokeWidth={1} />
      <line x1={55} y1={205} x2={380} y2={205} stroke={C.line} strokeWidth={1} />
      <Label x={40} y={115} anchor="middle">
        loss
      </Label>
      <Label x={215} y={228} anchor="middle">
        epochs
      </Label>
      {/* early stopping marker */}
      <line
        x1={mapX(tMin)}
        y1={20}
        x2={mapX(tMin)}
        y2={205}
        stroke={C.muted}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <Label x={mapX(tMin) + 4} y={32} size={9} fill={C.muted}>
        early stop
      </Label>
      <polyline points={plotCurve(train, 0, 1, 80, mapX, mapY)} fill="none" stroke={C.blue} strokeWidth={1.8} />
      <polyline points={plotCurve(val, 0, 1, 80, mapX, mapY)} fill="none" stroke={C.coral} strokeWidth={1.8} />
      <g>
        <line x1={250} y1={40} x2={266} y2={40} stroke={C.blue} strokeWidth={2} />
        <text x={270} y={43} fontSize={10} fill={C.muted} fontFamily={MONO}>
          train
        </text>
        <line x1={250} y1={56} x2={266} y2={56} stroke={C.coral} strokeWidth={2} />
        <text x={270} y={59} fontSize={10} fill={C.muted} fontFamily={MONO}>
          validation
        </text>
      </g>
    </>
  );
}
