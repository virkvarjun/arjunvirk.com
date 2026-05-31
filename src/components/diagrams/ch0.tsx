import { C, MONO } from "./frame";

// ---------------------------------------------------------------------------
// Small SVG helpers
// ---------------------------------------------------------------------------

function Dot({ x, y, fill, r = 4 }: { x: number; y: number; fill: string; r?: number }) {
  return <circle cx={x} cy={y} r={r} fill={fill} />;
}

function Ring({ x, y, stroke, r = 5 }: { x: number; y: number; stroke: string; r?: number }) {
  return <circle cx={x} cy={y} r={r} fill="none" stroke={stroke} strokeWidth={1.6} />;
}

function XMark({ x, y, stroke, s = 4.5 }: { x: number; y: number; stroke: string; s?: number }) {
  return (
    <g stroke={stroke} strokeWidth={1.6} strokeLinecap="round">
      <line x1={x - s} y1={y - s} x2={x + s} y2={y + s} />
      <line x1={x - s} y1={y + s} x2={x + s} y2={y - s} />
    </g>
  );
}

function Label({
  x,
  y,
  children,
  fill = C.muted,
  size = 11,
  anchor = "start",
  weight,
}: {
  x: number;
  y: number;
  children: string;
  fill?: string;
  size?: number;
  anchor?: "start" | "middle" | "end";
  weight?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fill={fill}
      fontFamily={MONO}
      textAnchor={anchor}
      fontWeight={weight}
    >
      {children}
    </text>
  );
}

// ---------------------------------------------------------------------------
// 0.1 Linear regression: scatter + fitted line + residuals
// ---------------------------------------------------------------------------

export function LinearRegression() {
  // Fitted line: y = 195 - 0.4 (x - 55)
  const line = (x: number) => 195 - 0.4 * (x - 55);
  const pts: [number, number][] = [
    [80, 178],
    [120, 150],
    [150, 168],
    [195, 132],
    [235, 148],
    [305, 92],
    [345, 82],
  ];
  return (
    <>
      {/* axes */}
      <line x1={40} y1={20} x2={40} y2={210} stroke={C.line} strokeWidth={1.25} />
      <line x1={40} y1={210} x2={380} y2={210} stroke={C.line} strokeWidth={1.25} />
      <Label x={26} y={120} anchor="middle" size={11}>
        y
      </Label>
      <Label x={210} y={230} anchor="middle" size={11}>
        x
      </Label>
      {/* residuals */}
      {pts.map(([x, y], i) => (
        <line
          key={i}
          x1={x}
          y1={y}
          x2={x}
          y2={line(x)}
          stroke={C.coral}
          strokeWidth={1.2}
          strokeDasharray="3 3"
        />
      ))}
      {/* fitted line */}
      <line x1={55} y1={line(55)} x2={360} y2={line(360)} stroke={C.ink} strokeWidth={2} />
      {/* points */}
      {pts.map(([x, y], i) => (
        <Dot key={i} x={x} y={y} fill={C.blue} />
      ))}
      <Label x={364} y={line(360) - 4} fill={C.ink} size={10}>
        fitted line
      </Label>
      <Label x={252} y={140} fill={C.coral} size={10}>
        residual
      </Label>
    </>
  );
}

// ---------------------------------------------------------------------------
// 0.2 KNN: a new point and its k=5 neighborhood
// ---------------------------------------------------------------------------

export function KNN() {
  const nx = 200;
  const ny = 118;
  const inBlue: [number, number][] = [
    [176, 100],
    [216, 96],
    [166, 140],
  ];
  const inCoral: [number, number][] = [
    [238, 134],
    [206, 158],
  ];
  const outBlue: [number, number][] = [
    [105, 66],
    [92, 150],
    [140, 196],
    [258, 58],
    [120, 110],
  ];
  const outCoral: [number, number][] = [
    [300, 104],
    [330, 168],
    [284, 198],
    [350, 120],
  ];
  return (
    <>
      <circle cx={nx} cy={ny} r={52} fill="none" stroke={C.muted} strokeWidth={1.25} strokeDasharray="4 4" />
      {outBlue.map(([x, y], i) => (
        <Dot key={`ob${i}`} x={x} y={y} fill={C.blue} />
      ))}
      {outCoral.map(([x, y], i) => (
        <Dot key={`oc${i}`} x={x} y={y} fill={C.coral} />
      ))}
      {inBlue.map(([x, y], i) => (
        <Dot key={`ib${i}`} x={x} y={y} fill={C.blue} />
      ))}
      {inCoral.map(([x, y], i) => (
        <Dot key={`ic${i}`} x={x} y={y} fill={C.coral} />
      ))}
      {/* new point */}
      <rect x={nx - 6} y={ny - 6} width={12} height={12} fill="#e0a64f" stroke={C.ink} strokeWidth={1} />
      <Label x={nx + 12} y={ny - 10} fill={C.ink} size={10}>
        new point
      </Label>
      <Label x={300} y={40} fill={C.blue} size={10}>
        3 blue neighbors
      </Label>
      <Label x={300} y={56} fill={C.coral} size={10}>
        2 coral neighbors
      </Label>
      <Label x={200} y={228} anchor="middle" fill={C.muted} size={10}>
        k = 5 → majority vote → predict blue
      </Label>
    </>
  );
}

// ---------------------------------------------------------------------------
// 0.3 KNN fitting spectrum: under / appropriate / over
// ---------------------------------------------------------------------------

function FitPanel({
  ox,
  title,
  k,
  sub,
  boundary,
}: {
  ox: number;
  title: string;
  k: string;
  sub: string;
  boundary: string;
}) {
  // o = blue circles (upper-right), x = coral marks (lower-left)
  const os: [number, number][] = [
    [120, 40],
    [150, 55],
    [170, 38],
    [185, 62],
    [140, 78],
    [165, 88],
    [195, 95],
    [205, 70],
  ];
  const xs: [number, number][] = [
    [35, 50],
    [50, 80],
    [40, 110],
    [70, 120],
    [95, 100],
    [60, 145],
    [90, 150],
    [120, 150],
    [150, 140],
  ];
  return (
    <g transform={`translate(${ox},0)`}>
      <rect x={20} y={20} width={200} height={150} fill="none" stroke={C.line} strokeWidth={1} />
      <path d={boundary} fill="none" stroke={C.violet} strokeWidth={1.6} />
      {os.map(([x, y], i) => (
        <Ring key={`o${i}`} x={x} y={y} stroke={C.blue} r={4.5} />
      ))}
      {xs.map(([x, y], i) => (
        <XMark key={`x${i}`} x={x} y={y} stroke={C.coral} />
      ))}
      <Label x={120} y={196} anchor="middle" fill={C.violet} size={11} weight={600}>
        {title}
      </Label>
      <Label x={120} y={212} anchor="middle" fill={C.muted} size={9}>
        {sub}
      </Label>
      <Label x={120} y={232} anchor="middle" fill={C.ink} size={13} weight={700}>
        {k}
      </Label>
    </g>
  );
}

export function KNNFitting() {
  return (
    <>
      <FitPanel
        ox={0}
        title="Under-Fitting"
        sub="(too simple)"
        k="K=1000"
        boundary="M 30 160 L 210 40"
      />
      <FitPanel
        ox={230}
        title="Appropriate-Fitting"
        sub="(captures structure)"
        k="K=5"
        boundary="M 30 150 C 80 90, 130 150, 210 70"
      />
      <FitPanel
        ox={460}
        title="Over-Fitting"
        sub="(memorizes noise)"
        k="K=1"
        boundary="M 30 150 C 60 80, 80 160, 110 70 S 150 170, 210 80"
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// 0.4 SVM: maximum-margin boundary and support vectors
// ---------------------------------------------------------------------------

export function SVMMargin() {
  const f = (x: number) => 195 - 0.4 * (x - 55); // boundary
  const blue: [number, number][] = [
    [95, 70],
    [130, 95],
    [80, 120],
    [150, 60],
  ];
  const coral: [number, number][] = [
    [300, 150],
    [330, 110],
    [270, 185],
    [340, 175],
  ];
  const svBlue: [number, number][] = [[150, f(150) - 30]];
  const svCoral: [number, number][] = [[235, f(235) + 30]];
  return (
    <>
      {/* margins */}
      <line x1={55} y1={f(55) - 30} x2={360} y2={f(360) - 30} stroke={C.muted} strokeWidth={1} strokeDasharray="4 4" />
      <line x1={55} y1={f(55) + 30} x2={360} y2={f(360) + 30} stroke={C.muted} strokeWidth={1} strokeDasharray="4 4" />
      {/* boundary */}
      <line x1={55} y1={f(55)} x2={360} y2={f(360)} stroke={C.ink} strokeWidth={2} />
      {blue.map(([x, y], i) => (
        <Dot key={`b${i}`} x={x} y={y} fill={C.blue} />
      ))}
      {coral.map(([x, y], i) => (
        <Dot key={`c${i}`} x={x} y={y} fill={C.coral} />
      ))}
      {svBlue.map(([x, y], i) => (
        <g key={`svb${i}`}>
          <Dot x={x} y={y} fill={C.blue} />
          <Ring x={x} y={y} stroke={C.ink} r={7} />
        </g>
      ))}
      {svCoral.map(([x, y], i) => (
        <g key={`svc${i}`}>
          <Dot x={x} y={y} fill={C.coral} />
          <Ring x={x} y={y} stroke={C.ink} r={7} />
        </g>
      ))}
      <Label x={300} y={f(330) - 38} fill={C.ink} size={10}>
        decision boundary
      </Label>
      <Label x={300} y={f(330) - 8} fill={C.muted} size={10}>
        margin
      </Label>
      <Label x={150} y={f(150) - 44} anchor="middle" fill={C.ink} size={10}>
        support vector
      </Label>
      <line x1={150} y1={f(150) - 40} x2={150} y2={f(150) - 37} stroke={C.ink} strokeWidth={1} />
    </>
  );
}

// ---------------------------------------------------------------------------
// 0.5 Decision tree
// ---------------------------------------------------------------------------

function Node({
  x,
  y,
  w,
  text,
  variant,
}: {
  x: number;
  y: number;
  w: number;
  text: string;
  variant: "internal" | "play" | "stop";
}) {
  const h = 28;
  const fill = variant === "internal" ? "var(--background)" : variant === "play" ? C.greenFill : C.coralFill;
  const stroke = variant === "internal" ? C.line : variant === "play" ? C.green : C.coral;
  const tcol = variant === "internal" ? C.ink : variant === "play" ? C.green : C.coral;
  return (
    <g>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={6} fill={fill} stroke={stroke} strokeWidth={1.25} />
      <text x={x} y={y + 4} fontSize={11} fill={tcol} fontFamily={MONO} textAnchor="middle">
        {text}
      </text>
    </g>
  );
}

function Edge({
  x1,
  y1,
  x2,
  y2,
  label,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
}) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.muted} strokeWidth={1} />
      <text
        x={(x1 + x2) / 2}
        y={(y1 + y2) / 2 - 3}
        fontSize={9}
        fill={C.muted}
        fontFamily={MONO}
        textAnchor="middle"
      >
        {label}
      </text>
    </g>
  );
}

export function DecisionTree() {
  return (
    <>
      {/* edges (drawn first so nodes sit on top) */}
      <Edge x1={230} y1={44} x2={110} y2={96} label="sunny" />
      <Edge x1={230} y1={44} x2={230} y2={96} label="overcast" />
      <Edge x1={230} y1={44} x2={360} y2={96} label="rainy" />
      <Edge x1={110} y1={124} x2={60} y2={186} label="high" />
      <Edge x1={110} y1={124} x2={175} y2={186} label="normal" />
      <Edge x1={360} y1={124} x2={300} y2={186} label="strong" />
      <Edge x1={360} y1={124} x2={415} y2={186} label="weak" />
      {/* nodes */}
      <Node x={230} y={30} w={88} text="Outlook?" variant="internal" />
      <Node x={110} y={110} w={92} text="Humidity?" variant="internal" />
      <Node x={230} y={110} w={64} text="Play" variant="play" />
      <Node x={360} y={110} w={72} text="Wind?" variant="internal" />
      <Node x={60} y={200} w={84} text="Don't play" variant="stop" />
      <Node x={175} y={200} w={64} text="Play" variant="play" />
      <Node x={300} y={200} w={84} text="Don't play" variant="stop" />
      <Node x={415} y={200} w={64} text="Play" variant="play" />
    </>
  );
}

// ---------------------------------------------------------------------------
// 0.6 K-means clustering
// ---------------------------------------------------------------------------

export function KMeans() {
  const clusters: { pts: [number, number][]; color: string; cx: number; cy: number; name: string }[] = [
    {
      pts: [
        [90, 60],
        [120, 70],
        [105, 95],
        [135, 85],
        [85, 92],
      ],
      color: C.blue,
      cx: 107,
      cy: 80,
      name: "cluster 1",
    },
    {
      pts: [
        [285, 72],
        [315, 84],
        [300, 104],
        [330, 92],
        [280, 100],
      ],
      color: C.green,
      cx: 302,
      cy: 90,
      name: "cluster 2",
    },
    {
      pts: [
        [185, 162],
        [215, 168],
        [200, 192],
        [175, 182],
        [225, 188],
      ],
      color: C.coral,
      cx: 200,
      cy: 178,
      name: "cluster 3",
    },
  ];
  return (
    <>
      {clusters.map((cl, i) => (
        <g key={i}>
          {cl.pts.map(([x, y], j) => (
            <Dot key={j} x={x} y={y} fill={cl.color} />
          ))}
          <rect x={cl.cx - 5} y={cl.cy - 5} width={10} height={10} fill={C.ink} />
          <Label x={cl.cx} y={cl.cy + 32} anchor="middle" size={10}>
            {cl.name}
          </Label>
        </g>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// 0.7 PCA: principal-component directions
// ---------------------------------------------------------------------------

function Arrow({
  x1,
  y1,
  x2,
  y2,
  color,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const ah = 7;
  const a1 = ang + Math.PI - 0.4;
  const a2 = ang + Math.PI + 0.4;
  return (
    <g stroke={color} fill={color}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={2} />
      <polygon
        points={`${x2},${y2} ${x2 + ah * Math.cos(a1)},${y2 + ah * Math.sin(a1)} ${x2 + ah * Math.cos(a2)},${y2 + ah * Math.sin(a2)}`}
        stroke="none"
      />
    </g>
  );
}

export function PCA() {
  const pts: [number, number][] = [
    [130, 168],
    [150, 150],
    [165, 158],
    [180, 138],
    [200, 128],
    [205, 142],
    [225, 116],
    [245, 108],
    [255, 120],
    [275, 92],
    [292, 82],
    [300, 96],
  ];
  return (
    <>
      <line x1={40} y1={20} x2={40} y2={210} stroke={C.line} strokeWidth={1.25} />
      <line x1={40} y1={210} x2={380} y2={210} stroke={C.line} strokeWidth={1.25} />
      <Label x={26} y={120} anchor="middle">
        feature 2
      </Label>
      <Label x={210} y={230} anchor="middle">
        feature 1
      </Label>
      {pts.map(([x, y], i) => (
        <Dot key={i} x={x} y={y} fill={C.muted} r={3.2} />
      ))}
      {/* PC1 along the elongated direction */}
      <Arrow x1={160} y1={158} x2={310} y2={72} color={C.coral} />
      <Label x={314} y={70} fill={C.coral} size={10}>
        PC1
      </Label>
      {/* PC2 orthogonal */}
      <Arrow x1={215} y1={125} x2={250} y2={186} color={C.blue} />
      <Label x={256} y={190} fill={C.blue} size={10}>
        PC2
      </Label>
    </>
  );
}
