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
  size = 10,
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
      <rect x={x} y={y} width={w} height={h} rx={6} fill={fill} stroke={stroke} strokeWidth={1.25} />
      <text x={x + w / 2} y={y + h / 2 + size / 2 - 1} fontSize={size} fill={tcol} fontFamily={MONO} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

// 4.1 RNN unrolled across time
export function RnnUnroll() {
  const tokens = ["the", "cat", "sat", "on"];
  const xs = [60, 165, 270, 375];
  return (
    <>
      {xs.slice(0, -1).map((x, i) => (
        <Arrow key={i} x1={x + 28} y1={95} x2={xs[i + 1] - 28} y2={95} color={C.muted} width={1.2} head={5} />
      ))}
      {xs.map((x, i) => (
        <g key={i}>
          <Box x={x - 28} y={75} w={56} h={40} label="RNN" fill={C.blueFill} stroke={C.blue} />
          <Box x={x - 22} y={26} w={44} h={24} label={tokens[i]} />
          <Arrow x1={x} y1={50} x2={x} y2={73} color={C.muted} width={1} head={4} />
          <Arrow x1={x} y1={117} x2={x} y2={138} color={C.muted} width={1} head={4} />
          <text x={x} y={156} fontSize={10} fill={C.muted} fontFamily={MONO} textAnchor="middle">
            {`y${i + 1}`}
          </text>
          {i < xs.length - 1 && (
            <text x={(x + xs[i + 1]) / 2} y={88} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="middle">
              {`h${i + 1}`}
            </text>
          )}
        </g>
      ))}
      <Label x={232} y={176} anchor="middle" size={10}>
        the same weights are reused at every step
      </Label>
    </>
  );
}

// 4.2 LSTM cell
export function LstmCell() {
  return (
    <>
      <rect x={40} y={36} width={360} height={120} rx={8} fill="none" stroke={C.line} />
      <Label x={220} y={28} anchor="middle" size={10} fill={C.ink} weight={600}>
        LSTM cell — the cell-state highway
      </Label>
      {/* highway line */}
      <line x1={40} y1={64} x2={400} y2={64} stroke={C.coral} strokeWidth={2.5} />
      <text x={26} y={67} fontSize={10} fill={C.coral} fontFamily={MONO} textAnchor="end">
        C
      </text>
      {/* forget (x), input (+), output gates */}
      <circle cx={130} cy={64} r={10} fill="var(--background)" stroke={C.coral} strokeWidth={1.4} />
      <text x={130} y={68} fontSize={11} fill={C.coral} fontFamily={MONO} textAnchor="middle">×</text>
      <circle cx={230} cy={64} r={10} fill="var(--background)" stroke={C.green} strokeWidth={1.4} />
      <text x={230} y={68} fontSize={11} fill={C.green} fontFamily={MONO} textAnchor="middle">+</text>
      <Box x={108} y={104} w={44} h={28} label="σ f" tcol={C.coral} stroke={C.coral} />
      <Box x={196} y={104} w={68} h={28} label="σ i · tanh" tcol={C.green} stroke={C.green} size={9} />
      <Box x={300} y={104} w={44} h={28} label="σ o" tcol={C.blue} stroke={C.blue} />
      <Arrow x1={130} y1={104} x2={130} y2={76} color={C.muted} width={1} head={4} />
      <Arrow x1={230} y1={104} x2={230} y2={76} color={C.muted} width={1} head={4} />
      <Arrow x1={322} y1={104} x2={322} y2={70} color={C.muted} width={1} head={4} />
      <text x={322} y={150} fontSize={10} fill={C.blue} fontFamily={MONO} textAnchor="middle">h</text>
      <Label x={130} y={150} anchor="middle" size={9}>
        forget
      </Label>
      <Label x={230} y={150} anchor="middle" size={9}>
        write
      </Label>
    </>
  );
}

// 4.3 Scaled dot-product attention
export function AttentionQKV() {
  return (
    <>
      <Box x={160} y={20} w={100} h={26} label="input embeddings" size={9} />
      <Box x={45} y={70} w={70} h={28} label="Q = XWQ" fill={C.blueFill} stroke={C.blue} size={9} />
      <Box x={175} y={70} w={70} h={28} label="K = XWK" fill={C.coralFill} stroke={C.coral} size={9} />
      <Box x={305} y={70} w={70} h={28} label="V = XWV" fill={C.greenFill} stroke={C.green} size={9} />
      <Arrow x1={200} y1={46} x2={90} y2={68} color={C.muted} width={1} head={4} />
      <Arrow x1={210} y1={46} x2={210} y2={68} color={C.muted} width={1} head={4} />
      <Arrow x1={220} y1={46} x2={335} y2={68} color={C.muted} width={1} head={4} />
      <Box x={120} y={120} w={120} h={26} label="Q · Kᵀ / √dₖ" size={10} />
      <Arrow x1={80} y1={98} x2={150} y2={118} color={C.muted} width={1} head={4} />
      <Arrow x1={210} y1={98} x2={195} y2={118} color={C.muted} width={1} head={4} />
      <Box x={130} y={162} w={100} h={26} label="softmax (rows)" size={9} />
      <Arrow x1={180} y1={146} x2={180} y2={160} color={C.muted} width={1} head={4} />
      <Box x={130} y={200} w={100} h={26} label="× V → output" fill={C.greenFill} stroke={C.green} size={9} />
      <Arrow x1={180} y1={188} x2={180} y2={198} color={C.muted} width={1} head={4} />
      <Arrow x1={340} y1={98} x2={232} y2={205} color={C.green} width={1} head={4} />
    </>
  );
}

// 4.4 Multi-head attention
export function MultiHead() {
  const heads = [55, 145, 235, 325];
  return (
    <>
      <Box x={150} y={16} w={100} h={26} label="input (d)" size={10} />
      {heads.map((x, i) => (
        <g key={i}>
          <Box x={x} y={70} w={62} h={34} label={`head ${i + 1}`} fill={C.blueFill} stroke={C.blue} size={9} />
          <Arrow x1={200} y1={42} x2={x + 31} y2={68} color={C.muted} width={0.9} head={4} />
          <Arrow x1={x + 31} y1={104} x2={200} y2={128} color={C.muted} width={0.9} head={4} />
        </g>
      ))}
      <Box x={140} y={130} w={120} h={26} label="concat (d)" size={10} />
      <Box x={150} y={172} w={100} h={26} label="× Wₒ → output" fill={C.greenFill} stroke={C.green} size={9} />
      <Arrow x1={200} y1={156} x2={200} y2={170} color={C.muted} width={1} head={4} />
    </>
  );
}

// 4.5 Causal (look-ahead) mask
export function CausalMask() {
  const toks = ["He", "swung", "the", "bat"];
  const n = 4;
  const x0 = 70;
  const y0 = 50;
  const c = 42;
  return (
    <>
      {toks.map((t, i) => (
        <text key={`r${i}`} x={x0 - 8} y={y0 + i * c + c / 2 + 4} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="end">
          {t}
        </text>
      ))}
      {toks.map((t, j) => (
        <text key={`c${j}`} x={x0 + j * c + c / 2} y={y0 - 8} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="middle">
          {t}
        </text>
      ))}
      {Array.from({ length: n }).flatMap((_, i) =>
        Array.from({ length: n }).map((__, j) => {
          const allow = j <= i;
          return (
            <g key={`${i}-${j}`}>
              <rect
                x={x0 + j * c}
                y={y0 + i * c}
                width={c - 4}
                height={c - 4}
                rx={3}
                fill={allow ? C.blueFill : "var(--card)"}
                stroke={C.line}
              />
              <text
                x={x0 + j * c + (c - 4) / 2}
                y={y0 + i * c + (c - 4) / 2 + 4}
                fontSize={10}
                fill={allow ? C.blue : C.muted}
                fontFamily={MONO}
                textAnchor="middle"
              >
                {allow ? "✓" : "−∞"}
              </text>
            </g>
          );
        }),
      )}
      <Label x={138} y={232} anchor="middle" size={10}>
        each token attends only to itself and earlier tokens
      </Label>
    </>
  );
}

// 4.6 Transformer encoder block with residuals
export function TransformerBlock() {
  const cx = 175;
  return (
    <>
      <Box x={cx - 80} y={20} w={160} h={28} label="input + positional" size={9} />
      <Box x={cx - 80} y={78} w={160} h={30} label="multi-head attention" fill={C.blueFill} stroke={C.blue} size={9} />
      <Box x={cx - 80} y={128} w={160} h={26} label="add & norm" fill={C.coralFill} stroke={C.coral} size={9} />
      <Box x={cx - 80} y={184} w={160} h={30} label="feed-forward" fill={C.greenFill} stroke={C.green} size={9} />
      <Box x={cx - 80} y={234} w={160} h={26} label="add & norm" fill={C.coralFill} stroke={C.coral} size={9} />
      <Box x={cx - 80} y={284} w={160} h={26} label="to next layer" size={9} />
      {[48, 108, 154, 214, 260].map((y1, i) => {
        const y2 = [78, 128, 184, 234, 284][i];
        return <Arrow key={i} x1={cx} y1={y1} x2={cx} y2={y2 - 2} color={C.muted} width={1} head={4} />;
      })}
      {/* residual bypasses */}
      <path d={`M ${cx + 80} 60 H ${cx + 110} V 141 H ${cx + 82}`} fill="none" stroke={C.coral} strokeWidth={1} strokeDasharray="3 3" />
      <path d={`M ${cx + 80} 116 H ${cx + 110} V 247 H ${cx + 82}`} fill="none" stroke={C.coral} strokeWidth={1} strokeDasharray="3 3" />
      <Label x={cx + 116} y={100} size={8} fill={C.coral}>
        residual
      </Label>
    </>
  );
}

// 4.7 KV cache during generation
export function KvCache() {
  const cached = [0, 1, 2, 3, 4];
  return (
    <>
      <Label x={120} y={28} anchor="middle" size={10}>
        cached K, V (positions 1–5)
      </Label>
      {cached.map((i) => (
        <Box key={i} x={30 + i * 36} y={42} w={30} h={30} label={`${i + 1}`} fill={C.blueFill} stroke={C.blue} />
      ))}
      <Box x={30 + 5 * 36} y={42} w={30} h={30} label="6" fill={C.greenFill} stroke={C.green} />
      <Label x={225} y={28} anchor="middle" size={10} fill={C.green}>
        new
      </Label>
      <Arrow x1={120} y1={78} x2={300} y2={100} color={C.muted} width={1} head={5} />
      <Arrow x1={225} y1={78} x2={310} y2={100} color={C.green} width={1} head={5} />
      <Box x={300} y={100} w={110} h={30} label="attention(Q₆)" size={9} />
      <Label x={355} y={150} anchor="middle" size={10}>
        compute K,V only for the new token; reuse the rest
      </Label>
      <Label x={355} y={166} anchor="middle" size={9} fill={C.muted}>
        O(n) per step instead of O(n²)
      </Label>
    </>
  );
}

// 4.8 MHA vs GQA vs MQA
export function GroupedQuery() {
  function Panel({ ox, title, q, kv }: { ox: number; title: string; q: number; kv: number }) {
    return (
      <g transform={`translate(${ox},0)`}>
        <Label x={70} y={24} anchor="middle" size={10} fill={C.ink} weight={600}>
          {title}
        </Label>
        {Array.from({ length: q }).map((_, i) => (
          <rect key={`q${i}`} x={18 + i * 22} y={40} width={16} height={16} rx={3} fill={C.blueFill} stroke={C.blue} />
        ))}
        <Label x={70} y={70} anchor="middle" size={8}>
          {`${q} query heads`}
        </Label>
        {Array.from({ length: kv }).map((_, i) => (
          <rect key={`k${i}`} x={18 + i * (q / kv) * 22 + ((q / kv - 1) * 22) / 2} y={92} width={16} height={16} rx={3} fill={C.coralFill} stroke={C.coral} />
        ))}
        <Label x={70} y={122} anchor="middle" size={8}>
          {`${kv} KV head${kv > 1 ? "s" : ""}`}
        </Label>
      </g>
    );
  }
  return (
    <>
      <Panel ox={0} title="Multi-head" q={4} kv={4} />
      <Panel ox={160} title="Grouped-query" q={4} kv={2} />
      <Panel ox={320} title="Multi-query" q={4} kv={1} />
      <Label x={240} y={150} anchor="middle" size={9} fill={C.muted}>
        fewer KV heads → smaller KV cache, nearly no quality loss
      </Label>
    </>
  );
}

// 4.9 Mixture of experts
export function MoE() {
  const experts = [0, 1, 2, 3, 4];
  const active = [1, 3];
  return (
    <>
      <Box x={150} y={18} w={100} h={26} label="token" size={10} />
      <Box x={140} y={66} w={120} h={28} label="router (top-2)" fill={C.violet + "22"} stroke={C.violet} size={9} tcol={C.violet} />
      <Arrow x1={200} y1={44} x2={200} y2={64} color={C.muted} width={1} head={4} />
      {experts.map((i) => {
        const on = active.includes(i);
        return (
          <g key={i}>
            <Box
              x={20 + i * 76}
              y={120}
              w={64}
              h={34}
              label={`E${i + 1}`}
              fill={on ? C.greenFill : "var(--card)"}
              stroke={on ? C.green : C.line}
              tcol={on ? C.green : C.muted}
              size={10}
            />
            <Arrow x1={200} y1={94} x2={52 + i * 76} y2={118} color={on ? C.green : C.line} width={on ? 1.4 : 0.7} head={4} />
          </g>
        );
      })}
      <Box x={140} y={178} w={120} h={26} label="weighted sum" size={9} />
      {active.map((i) => (
        <Arrow key={i} x1={52 + i * 76} y1={154} x2={200} y2={176} color={C.green} width={1.2} head={4} />
      ))}
      <Label x={200} y={216} anchor="middle" size={9} fill={C.muted}>
        N× the parameters, only k/N the compute per token
      </Label>
    </>
  );
}

// 4.10 LoRA low-rank adapter
export function LoRA() {
  return (
    <>
      <Box x={40} y={50} w={90} h={90} label="W (frozen)" fill={C.card} stroke={C.line} size={10} />
      <text x={150} y={100} fontSize={20} fill={C.muted} fontFamily={MONO} textAnchor="middle">+</text>
      <Box x={180} y={62} w={28} h={66} label="B" fill={C.coralFill} stroke={C.coral} />
      <text x={222} y={100} fontSize={16} fill={C.muted} fontFamily={MONO} textAnchor="middle">·</text>
      <Box x={238} y={84} w={96} h={22} label="A" fill={C.blueFill} stroke={C.blue} />
      <text x={372} y={100} fontSize={16} fill={C.muted} fontFamily={MONO} textAnchor="middle">=</text>
      <Label x={208} y={150} anchor="middle" size={9}>
        rank r ≪ d
      </Label>
      <Label x={210} y={172} anchor="middle" size={10} fill={C.ink}>
        W′ = W + (α/r) B·A   — train only B, A
      </Label>
    </>
  );
}
