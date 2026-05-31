import { C, MONO, Label, Arrow } from "./frame";

function Box({
  x,
  y,
  w,
  h,
  label,
  fill = "var(--background)",
  stroke = C.line,
  tcol = C.ink,
  size = 9,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  fill?: string;
  stroke?: string;
  tcol?: string;
  size?: number;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={5} fill={fill} stroke={stroke} strokeWidth={1.2} />
      <text x={x + w / 2} y={y + h / 2 + size / 2 - 1} fontSize={size} fill={tcol} fontFamily={MONO} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

function Grid({ x, y, n, cell, stroke = C.line, fill = "none" }: { x: number; y: number; n: number; cell: number; stroke?: string; fill?: string }) {
  return (
    <g>
      {Array.from({ length: n }).flatMap((_, r) =>
        Array.from({ length: n }).map((__, c) => (
          <rect key={`${r}-${c}`} x={x + c * cell} y={y + r * cell} width={cell} height={cell} fill={fill} stroke={stroke} strokeWidth={0.7} />
        )),
      )}
    </g>
  );
}

// 5.1 Image as a tensor (C, H, W)
export function ImageTensor() {
  const planes = [
    { dx: 0, dy: 0, color: C.blue },
    { dx: 18, dy: -14, color: C.green },
    { dx: 36, dy: -28, color: C.coral },
  ];
  return (
    <>
      {planes.map((p, i) => (
        <g key={i} transform={`translate(${110 + p.dx},${110 + p.dy})`}>
          <rect x={0} y={0} width={120} height={84} fill="var(--background)" stroke={p.color} strokeWidth={1.4} opacity={0.95} />
          <Grid x={0} y={0} n={6} cell={14} stroke={p.color + "55"} />
        </g>
      ))}
      <Label x={300} y={70} size={10} fill={C.coral}>
        R, G, B
      </Label>
      <Label x={300} y={92} size={10}>
        channels
      </Label>
      <Label x={206} y={210} anchor="middle" size={10}>
        an image is a tensor (C, H, W)
      </Label>
      <Label x={206} y={226} anchor="middle" size={9} fill={C.muted}>
        after layer 1, channels become learned features
      </Label>
    </>
  );
}

// 5.2 Convolution: filter slides over input -> feature map
export function Convolution() {
  return (
    <>
      <Label x={70} y={28} anchor="middle" size={10}>
        input 5×5
      </Label>
      <Grid x={28} y={40} n={5} cell={18} />
      <rect x={28} y={40} width={54} height={54} fill={C.blue + "22"} stroke={C.blue} strokeWidth={1.5} />
      <Label x={210} y={28} anchor="middle" size={10}>
        filter 3×3
      </Label>
      <Grid x={182} y={56} n={3} cell={18} fill={C.coralFill} />
      <Label x={355} y={28} anchor="middle" size={10}>
        output 3×3
      </Label>
      <Grid x={320} y={50} n={3} cell={18} />
      <rect x={320} y={50} width={18} height={18} fill={C.green + "33"} stroke={C.green} strokeWidth={1.4} />
      <Arrow x1={92} y1={67} x2={178} y2={75} color={C.muted} width={1} head={5} />
      <Arrow x1={242} y1={75} x2={316} y2={62} color={C.muted} width={1} head={5} />
      <Label x={134} y={60} anchor="middle" size={8}>
        ×
      </Label>
      <Label x={206} y={150} anchor="middle" size={10}>
        multiply patch × filter, sum, write one output value, then slide
      </Label>
      <Label x={206} y={166} anchor="middle" size={9} fill={C.muted}>
        out = ⌊(n + 2p − k) / s⌋ + 1
      </Label>
    </>
  );
}

// 5.3 CNN stack: spatial shrinks, channels grow
export function CnnStack() {
  const stages = [
    { s: 70, ch: "3", label: "224" },
    { s: 58, ch: "64", label: "56" },
    { s: 44, ch: "128", label: "28" },
    { s: 32, ch: "256", label: "14" },
    { s: 22, ch: "512", label: "7" },
  ];
  let x = 30;
  return (
    <>
      {stages.map((st, i) => {
        const cx = x + st.s / 2;
        const el = (
          <g key={i}>
            <rect x={x} y={100 - st.s / 2} width={st.s} height={st.s} rx={4} fill={C.blueFill} stroke={C.blue} strokeWidth={1.1} />
            <text x={cx} y={100 + st.s / 2 + 16} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="middle">
              {st.label}²
            </text>
            <text x={cx} y={100 - st.s / 2 - 8} fontSize={9} fill={C.ink} fontFamily={MONO} textAnchor="middle">
              {st.ch}
            </text>
            {i < stages.length - 1 && (
              <Arrow x1={x + st.s + 2} y1={100} x2={x + st.s + 18} y2={100} color={C.muted} width={1} head={4} />
            )}
          </g>
        );
        x += st.s + 20;
        return el;
      })}
      <Arrow x1={x + 2} y1={100} x2={x + 18} y2={100} color={C.muted} width={1} head={4} />
      <Box x={x + 20} y={86} w={70} h={28} label="GAP + FC" fill={C.greenFill} stroke={C.green} />
      <Label x={210} y={188} anchor="middle" size={10}>
        spatial resolution shrinks (224 → 7) while channels grow (3 → 512)
      </Label>
    </>
  );
}

// 5.4 Receptive field growth
export function ReceptiveField() {
  const panels = [
    { ox: 0, t: "after 1 layer", inner: 14, sub: "a tiny patch" },
    { ox: 150, t: "after 5 layers", inner: 50, sub: "small shapes" },
    { ox: 300, t: "after 10+ layers", inner: 96, sub: "whole objects" },
  ];
  return (
    <>
      {panels.map((p, i) => (
        <g key={i} transform={`translate(${p.ox},0)`}>
          <rect x={20} y={30} width={110} height={110} fill="none" stroke={C.line} />
          <rect
            x={20 + (110 - p.inner) / 2}
            y={30 + (110 - p.inner) / 2}
            width={p.inner}
            height={p.inner}
            fill={C.blue + "33"}
            stroke={C.blue}
          />
          <Label x={75} y={22} anchor="middle" size={9} fill={C.ink}>
            {p.t}
          </Label>
          <Label x={75} y={158} anchor="middle" size={9}>
            {p.sub}
          </Label>
        </g>
      ))}
    </>
  );
}

// 5.5 YOLO grid
export function YoloGrid() {
  return (
    <>
      <rect x={40} y={30} width={210} height={210} fill="var(--card)" stroke={C.line} />
      <Grid x={40} y={30} n={7} cell={30} stroke={C.muted + "66"} />
      {/* an object spanning cells, with responsible center cell */}
      <rect x={95} y={80} width={120} height={110} fill="none" stroke={C.coral} strokeWidth={1.6} />
      <rect x={130} y={120} width={30} height={30} fill={C.coral + "33"} stroke={C.coral} strokeWidth={1.4} />
      <circle cx={145} cy={135} r={3} fill={C.coral} />
      <Label x={145} y={250} anchor="middle" size={9} fill={C.coral}>
        the cell holding the object’s center is responsible
      </Label>
      <Box x={285} y={90} w={100} h={90} label="" />
      <text x={335} y={112} fontSize={9} fill={C.ink} fontFamily={MONO} textAnchor="middle">each cell:</text>
      <text x={335} y={130} fontSize={8} fill={C.muted} fontFamily={MONO} textAnchor="middle">B boxes ×</text>
      <text x={335} y={144} fontSize={8} fill={C.muted} fontFamily={MONO} textAnchor="middle">(x,y,w,h,conf)</text>
      <text x={335} y={160} fontSize={8} fill={C.muted} fontFamily={MONO} textAnchor="middle">+ C classes</text>
      <text x={335} y={176} fontSize={9} fill={C.green} fontFamily={MONO} textAnchor="middle">→ 7×7×30</text>
    </>
  );
}

// 5.6 IoU
export function IoU() {
  return (
    <>
      <rect x={60} y={50} width={140} height={100} fill={C.blue + "22"} stroke={C.blue} strokeWidth={1.5} />
      <rect x={140} y={90} width={140} height={100} fill={C.coral + "22"} stroke={C.coral} strokeWidth={1.5} />
      <rect x={140} y={90} width={60} height={60} fill={C.green + "44"} stroke={C.green} strokeWidth={1.2} />
      <Label x={95} y={45} size={9} fill={C.blue}>
        predicted
      </Label>
      <Label x={250} y={205} size={9} fill={C.coral} anchor="end">
        ground truth
      </Label>
      <Label x={170} y={125} anchor="middle" size={8} fill={C.green}>
        ∩
      </Label>
      <Label x={170} y={232} anchor="middle" size={11}>
        IoU = area(∩) / area(∪)
      </Label>
    </>
  );
}

// 5.7 U-Net
export function UNet() {
  const enc = [
    { x: 40, s: 78, ch: "64" },
    { x: 92, s: 60, ch: "128" },
    { x: 138, s: 44, ch: "256" },
  ];
  const dec = [
    { x: 300, s: 44, ch: "256" },
    { x: 346, s: 60, ch: "128" },
    { x: 392, s: 78, ch: "64" },
  ];
  return (
    <>
      {enc.map((e, i) => (
        <g key={`e${i}`}>
          <rect x={e.x} y={40 + i * 26} width={e.s * 0.5} height={e.s} rx={3} fill={C.blueFill} stroke={C.blue} />
        </g>
      ))}
      <rect x={200} y={150} width={40} height={40} rx={3} fill={C.violet + "22"} stroke={C.violet} />
      <Label x={220} y={205} anchor="middle" size={8} fill={C.violet}>
        bottleneck
      </Label>
      {dec.map((d, i) => (
        <g key={`d${i}`}>
          <rect x={d.x} y={40 + (2 - i) * 26} width={d.s * 0.5} height={d.s} rx={3} fill={C.greenFill} stroke={C.green} />
        </g>
      ))}
      {/* down/up flow */}
      <Arrow x1={160} y1={120} x2={205} y2={155} color={C.muted} width={1} head={4} />
      <Arrow x1={238} y1={155} x2={300} y2={120} color={C.muted} width={1} head={4} />
      {/* skip connections */}
      {[0, 1, 2].map((i) => {
        const ey = 40 + i * 26 + enc[i].s / 2;
        return (
          <line
            key={i}
            x1={enc[i].x + enc[i].s * 0.5}
            y1={ey}
            x2={dec[2 - i].x}
            y2={ey}
            stroke={C.coral}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        );
      })}
      <Label x={70} y={28} size={9} fill={C.blue}>
        encoder ↓
      </Label>
      <Label x={420} y={28} size={9} fill={C.green} anchor="end">
        decoder ↑
      </Label>
      <Label x={220} y={232} anchor="middle" size={9} fill={C.coral}>
        skip connections carry spatial detail across the U
      </Label>
    </>
  );
}

// 5.8 ViT: image -> patches -> tokens
export function VitPatches() {
  return (
    <>
      <rect x={30} y={50} width={84} height={84} fill="var(--card)" stroke={C.line} />
      <Grid x={30} y={50} n={4} cell={21} stroke={C.blue + "77"} />
      <Label x={72} y={150} anchor="middle" size={9}>
        16×16 patches
      </Label>
      <Arrow x1={120} y1={92} x2={150} y2={92} color={C.muted} width={1} head={5} />
      {[0, 1, 2].map((i) => (
        <Box key={i} x={160} y={60 + i * 26} w={70} h={20} label={`patch ${i + 1}`} fill={C.blueFill} stroke={C.blue} size={8} />
      ))}
      <text x={195} y={150} fontSize={14} fill={C.muted} fontFamily={MONO} textAnchor="middle">⋮</text>
      <Arrow x1={234} y1={92} x2={262} y2={92} color={C.muted} width={1} head={5} />
      <Box x={272} y={44} w={50} h={20} label="[CLS]" fill={C.violet + "22"} stroke={C.violet} tcol={C.violet} size={8} />
      {[0, 1, 2].map((i) => (
        <Box key={i} x={272} y={70 + i * 22} w={50} h={18} label="tok" size={8} />
      ))}
      <Arrow x1={326} y1={92} x2={350} y2={92} color={C.muted} width={1} head={5} />
      <Box x={356} y={60} w={56} h={64} label="transformer" fill={C.greenFill} stroke={C.green} size={8} />
      <Label x={220} y={188} anchor="middle" size={9} fill={C.muted}>
        patches become tokens — then a standard transformer encoder, like BERT
      </Label>
    </>
  );
}

// 5.9 VLM: vision encoder -> projection -> LLM
export function Vlm() {
  return (
    <>
      <Box x={20} y={40} w={56} h={34} label="image" />
      <Box x={20} y={92} w={56} h={28} label="text" />
      <Arrow x1={76} y1={57} x2={96} y2={57} color={C.muted} width={1} head={4} />
      <Box x={96} y={40} w={74} h={34} label="ViT encoder" fill={C.blueFill} stroke={C.blue} size={8} />
      <Arrow x1={170} y1={57} x2={190} y2={57} color={C.muted} width={1} head={4} />
      <Box x={190} y={40} w={64} h={34} label="projection" fill={C.coralFill} stroke={C.coral} size={8} />
      <Box x={274} y={36} w={120} h={92} label="" fill={C.card} stroke={C.line} />
      <text x={334} y={30} fontSize={9} fill={C.ink} fontFamily={MONO} textAnchor="middle">unified token stream</text>
      {[0, 1, 2].map((i) => (
        <rect key={`im${i}`} x={286 + i * 20} y={48} width={16} height={16} rx={2} fill={C.blueFill} stroke={C.blue} />
      ))}
      {[0, 1].map((i) => (
        <rect key={`tx${i}`} x={286 + (i + 3) * 20} y={48} width={16} height={16} rx={2} fill="var(--background)" stroke={C.line} />
      ))}
      <Box x={290} y={78} w={88} h={26} label="LLM (decoder)" fill={C.greenFill} stroke={C.green} size={8} />
      <Arrow x1={254} y1={57} x2={282} y2={57} color={C.muted} width={1} head={4} />
      <Label x={334} y={150} anchor="middle" size={9} fill={C.muted}>
        image patches become tokens beside text — attention does the rest
      </Label>
    </>
  );
}

// 5.10 CLIP contrastive matrix
export function ClipMatrix() {
  const n = 4;
  const x0 = 90;
  const y0 = 50;
  const c = 34;
  return (
    <>
      <Label x={x0 + (n * c) / 2} y={30} anchor="middle" size={9}>
        image ↔ text similarity
      </Label>
      <text x={x0 - 12} y={y0 + (n * c) / 2} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="middle" transform={`rotate(-90 ${x0 - 12} ${y0 + (n * c) / 2})`}>
        images
      </text>
      {Array.from({ length: n }).flatMap((_, i) =>
        Array.from({ length: n }).map((__, j) => (
          <rect
            key={`${i}-${j}`}
            x={x0 + j * c}
            y={y0 + i * c}
            width={c - 3}
            height={c - 3}
            rx={3}
            fill={i === j ? C.green + "55" : "var(--card)"}
            stroke={i === j ? C.green : C.line}
          />
        )),
      )}
      <Label x={x0 + (n * c) / 2} y={y0 + n * c + 18} anchor="middle" size={9}>
        texts
      </Label>
      <Label x={x0 + (n * c) / 2} y={y0 + n * c + 38} anchor="middle" size={9} fill={C.green}>
        maximize the diagonal, minimize off-diagonal
      </Label>
    </>
  );
}
