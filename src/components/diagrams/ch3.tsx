import { C, MONO, Label, Arrow } from "./frame";

// ---------------------------------------------------------------------------
// 3.1 CPU vs GPU: few complex cores vs many simple ALUs
// ---------------------------------------------------------------------------

export function CpuVsGpu() {
  const alus = [];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 9; c++) {
      alus.push([238 + c * 17, 60 + r * 17]);
    }
  }
  return (
    <>
      {/* CPU */}
      <Label x={108} y={32} anchor="middle" size={11} fill={C.ink} weight={600}>
        CPU
      </Label>
      <rect x={20} y={42} width={176} height={150} rx={6} fill="none" stroke={C.line} />
      {[0, 1].flatMap((r) =>
        [0, 1].map((c) => (
          <rect
            key={`${r}-${c}`}
            x={36 + c * 76}
            y={56 + r * 56}
            width={62}
            height={44}
            rx={5}
            fill={C.blueFill}
            stroke={C.blue}
            strokeWidth={1.25}
          />
        )),
      )}
      <Label x={108} y={184} anchor="middle" size={9}>
        a few complex cores
      </Label>
      {/* GPU */}
      <Label x={312} y={32} anchor="middle" size={11} fill={C.ink} weight={600}>
        GPU
      </Label>
      <rect x={224} y={42} width={176} height={150} rx={6} fill="none" stroke={C.line} />
      {alus.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width={12} height={12} rx={2} fill={C.greenFill} stroke={C.green} strokeWidth={0.8} />
      ))}
      <Label x={312} y={184} anchor="middle" size={9}>
        thousands of small ALUs
      </Label>
    </>
  );
}

// ---------------------------------------------------------------------------
// 3.2 Memory hierarchy
// ---------------------------------------------------------------------------

export function MemoryHierarchy() {
  const levels = [
    { w: 96, name: "Registers", note: "fastest" },
    { w: 150, name: "Shared / L1", note: "" },
    { w: 204, name: "L2 cache", note: "" },
    { w: 268, name: "HBM (VRAM)", note: "main GPU memory" },
    { w: 340, name: "Host RAM", note: "slowest" },
  ];
  return (
    <>
      {levels.map((lv, i) => {
        const y = 28 + i * 38;
        return (
          <g key={i}>
            <rect x={200 - lv.w / 2} y={y} width={lv.w} height={30} rx={4} fill="var(--card)" stroke={C.line} />
            <text x={200} y={y + 19} fontSize={11} fill={C.ink} fontFamily={MONO} textAnchor="middle">
              {lv.name}
            </text>
            {lv.note && (
              <text x={200 + lv.w / 2 + 8} y={y + 19} fontSize={9} fill={C.muted} fontFamily={MONO}>
                {lv.note}
              </text>
            )}
          </g>
        );
      })}
      <Arrow x1={28} y1={210} x2={28} y2={34} color={C.coral} width={1.4} head={6} />
      <Label x={34} y={120} size={9} fill={C.coral}>
        faster
      </Label>
      <Arrow x1={372} y1={34} x2={372} y2={210} color={C.blue} width={1.4} head={6} />
      <text x={366} y={120} fontSize={9} fill={C.blue} fontFamily={MONO} textAnchor="end">
        larger
      </text>
    </>
  );
}

// ---------------------------------------------------------------------------
// 3.3 Systolic array (TPU matrix unit)
// ---------------------------------------------------------------------------

export function SystolicArray() {
  const n = 4;
  const x0 = 150;
  const y0 = 70;
  const cell = 30;
  const gap = 6;
  return (
    <>
      {/* B enters from the top */}
      {Array.from({ length: n }).map((_, c) => {
        const x = x0 + c * (cell + gap) + cell / 2;
        return <Arrow key={`b${c}`} x1={x} y1={36} x2={x} y2={y0 - 4} color={C.blue} width={1.2} head={5} />;
      })}
      <Label x={x0 - 6} y={30} size={10} fill={C.blue} anchor="end">
        B ↓
      </Label>
      {/* A enters from the left */}
      {Array.from({ length: n }).map((_, r) => {
        const y = y0 + r * (cell + gap) + cell / 2;
        return <Arrow key={`a${r}`} x1={66} y1={y} x2={x0 - 4} y2={y} color={C.coral} width={1.2} head={5} />;
      })}
      <Label x={60} y={y0 - 8} size={10} fill={C.coral} anchor="end">
        A →
      </Label>
      {/* MAC grid */}
      {Array.from({ length: n }).flatMap((_, r) =>
        Array.from({ length: n }).map((__, c) => (
          <g key={`${r}-${c}`}>
            <rect
              x={x0 + c * (cell + gap)}
              y={y0 + r * (cell + gap)}
              width={cell}
              height={cell}
              rx={4}
              fill={C.greenFill}
              stroke={C.green}
              strokeWidth={1}
            />
            <text
              x={x0 + c * (cell + gap) + cell / 2}
              y={y0 + r * (cell + gap) + cell / 2 + 4}
              fontSize={10}
              fill={C.green}
              fontFamily={MONO}
              textAnchor="middle"
            >
              +×
            </text>
          </g>
        )),
      )}
      <Label x={200} y={222} anchor="middle" size={10} fill={C.muted}>
        data is loaded once, reused across the grid
      </Label>
    </>
  );
}

// ---------------------------------------------------------------------------
// 3.4 Roofline model
// ---------------------------------------------------------------------------

export function Roofline() {
  const ox = 55;
  const oy = 200;
  const ridgeX = 205;
  const ceilY = 55;
  return (
    <>
      <line x1={ox} y1={20} x2={ox} y2={oy} stroke={C.line} strokeWidth={1} />
      <line x1={ox} y1={oy} x2={380} y2={oy} stroke={C.line} strokeWidth={1} />
      {/* memory-bound slope then compute-bound ceiling */}
      <line x1={ox} y1={oy} x2={ridgeX} y2={ceilY} stroke={C.coral} strokeWidth={2} />
      <line x1={ridgeX} y1={ceilY} x2={372} y2={ceilY} stroke={C.blue} strokeWidth={2} />
      <line x1={ridgeX} y1={ceilY} x2={ridgeX} y2={oy} stroke={C.line} strokeWidth={1} strokeDasharray="3 3" />
      <Label x={108} y={120} size={10} fill={C.coral}>
        memory-bound
      </Label>
      <Label x={290} y={46} anchor="middle" size={10} fill={C.blue}>
        compute-bound (peak FLOPs)
      </Label>
      <Label x={ridgeX} y={oy + 14} anchor="middle" size={9}>
        ridge point
      </Label>
      <Label x={215} y={222} anchor="middle" size={10}>
        arithmetic intensity (ops / byte) →
      </Label>
      <text x={40} y={120} fontSize={10} fill={C.muted} fontFamily={MONO} textAnchor="middle" transform="rotate(-90 40 120)">
        performance
      </text>
    </>
  );
}

// ---------------------------------------------------------------------------
// 3.5 Parallelism strategies
// ---------------------------------------------------------------------------

function Device({ x, y, w, h, label, fill }: { x: number; y: number; w: number; h: number; label: string; fill: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4} fill={fill} stroke={C.line} strokeWidth={1} />
      <text x={x + w / 2} y={y + h / 2 + 4} fontSize={9} fill={C.ink} fontFamily={MONO} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

export function Parallelism() {
  return (
    <>
      {/* Data parallel: full model replicated, batch split */}
      <Label x={100} y={28} anchor="middle" size={10} fill={C.ink} weight={600}>
        Data parallel
      </Label>
      <Device x={40} y={44} w={50} h={90} label="model" fill={C.blueFill} />
      <Device x={110} y={44} w={50} h={90} label="model" fill={C.blueFill} />
      <Label x={100} y={150} anchor="middle" size={8}>
        full copy each · split batch
      </Label>
      {/* Tensor parallel: one layer split */}
      <Label x={300} y={28} anchor="middle" size={10} fill={C.ink} weight={600}>
        Tensor parallel
      </Label>
      <Device x={245} y={70} w={50} h={40} label="W ½" fill={C.greenFill} />
      <Device x={305} y={70} w={50} h={40} label="W ½" fill={C.greenFill} />
      <Label x={300} y={150} anchor="middle" size={8}>
        one layer split across devices
      </Label>
      {/* Pipeline parallel: layers split depth-wise */}
      <Label x={500} y={28} anchor="middle" size={10} fill={C.ink} weight={600}>
        Pipeline parallel
      </Label>
      <Device x={445} y={50} w={50} h={36} label="L1–2" fill={C.coralFill} />
      <Device x={445} y={94} w={50} h={36} label="L3–4" fill={C.coralFill} />
      <Arrow x1={470} y1={86} x2={470} y2={94} color={C.muted} width={1} head={4} />
      <Label x={500} y={150} anchor="middle" size={8}>
        layers split depth-wise
      </Label>
    </>
  );
}
