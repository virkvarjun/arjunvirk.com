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
      <rect x={x} y={y} width={w} height={h} rx={6} fill={fill} stroke={stroke} strokeWidth={1.2} />
      <text x={x + w / 2} y={y + h / 2 + size / 2 - 1} fontSize={size} fill={tcol} fontFamily={MONO} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

// 6.1 The agent loop
export function AgentLoop() {
  return (
    <>
      <Box x={150} y={95} w={110} h={40} label="LLM (reasoner)" fill={C.violet + "18"} stroke={C.violet} tcol={C.violet} size={10} />
      <Box x={20} y={30} w={110} h={32} label="user goal" fill={C.blueFill} stroke={C.blue} />
      <Box x={280} y={30} w={100} h={32} label="tool call" fill={C.greenFill} stroke={C.green} />
      <Box x={280} y={165} w={100} h={32} label="observation" fill={C.coralFill} stroke={C.coral} />
      <Box x={20} y={165} w={110} h={32} label="final answer" />
      <Arrow x1={120} y1={56} x2={178} y2={92} color={C.muted} width={1.1} head={5} />
      <Arrow x1={232} y1={92} x2={300} y2={64} color={C.muted} width={1.1} head={5} />
      <Arrow x1={330} y1={62} x2={330} y2={163} color={C.muted} width={1.1} head={5} />
      <Arrow x1={300} y1={181} x2={234} y2={120} color={C.muted} width={1.1} head={5} />
      <Arrow x1={180} y1={134} x2={120} y2={170} color={C.muted} width={1.1} head={5} />
      <Label x={200} y={222} anchor="middle" size={10} fill={C.muted}>
        loop until the model emits an answer instead of a tool call
      </Label>
    </>
  );
}

// 6.2 The four levels of AI usage
export function FourLevels() {
  const levels = [
    { n: "Level 1, Chat", d: "ask, copy, paste", color: C.line },
    { n: "Level 2, Tools", d: "model calls APIs / runs code", color: C.green },
    { n: "Level 3, Workflows", d: "AI in fixed, human-designed slots", color: C.blue },
    { n: "Level 4, Agents", d: "loops, decides, acts unprompted", color: C.coral },
  ];
  return (
    <>
      {levels.map((lv, i) => {
        const y = 150 - i * 36;
        return (
          <g key={i}>
            <rect x={70} y={y} width={300} height={30} rx={5} fill="var(--background)" stroke={lv.color} strokeWidth={1.3} />
            <text x={84} y={y + 19} fontSize={10} fill={C.ink} fontFamily={MONO}>
              {lv.n}
            </text>
            <text x={360} y={y + 19} fontSize={8} fill={C.muted} fontFamily={MONO} textAnchor="end">
              {lv.d}
            </text>
          </g>
        );
      })}
      <Arrow x1={40} y1={178} x2={40} y2={20} color={C.coral} width={1.4} head={6} />
      <text x={28} y={100} fontSize={9} fill={C.coral} fontFamily={MONO} textAnchor="middle" transform="rotate(-90 28 100)">
        more autonomy + risk
      </text>
    </>
  );
}

// 6.3 Anatomy of a tool call
export function ToolCall() {
  return (
    <>
      <Box x={20} y={50} w={96} h={44} label="model emits" fill={C.violet + "18"} stroke={C.violet} tcol={C.violet} />
      <text x={68} y={108} fontSize={8} fill={C.muted} fontFamily={MONO} textAnchor="middle">{`{tool_use}`}</text>
      <Arrow x1={116} y1={72} x2={158} y2={72} color={C.muted} width={1.1} head={5} />
      <Box x={158} y={50} w={110} h={44} label="your code runs" fill={C.greenFill} stroke={C.green} />
      <text x={213} y={108} fontSize={8} fill={C.muted} fontFamily={MONO} textAnchor="middle">the real function</text>
      <Arrow x1={268} y1={72} x2={310} y2={72} color={C.muted} width={1.1} head={5} />
      <Box x={310} y={50} w={104} h={44} label="tool_result" fill={C.coralFill} stroke={C.coral} />
      <Arrow x1={362} y1={94} x2={362} y2={120} color={C.muted} width={1} head={4} />
      <Box x={150} y={120} w={130} h={30} label="model continues" />
      <Arrow x1={310} y1={135} x2={282} y2={135} color={C.muted} width={1} head={4} />
      <Label x={217} y={172} anchor="middle" size={9} fill={C.muted}>
        the model never touches your APIs, it describes, your harness arbitrates
      </Label>
    </>
  );
}

// 6.4 The NxM problem and MCP
export function McpNxM() {
  const apps = [50, 95, 140];
  const sys = [50, 95, 140];
  return (
    <>
      {/* before */}
      <Label x={100} y={24} anchor="middle" size={10} fill={C.ink} weight={600}>
        before: N × M
      </Label>
      {apps.flatMap((ay) =>
        sys.map((sy, j) => (
          <line key={`${ay}-${j}`} x1={50} y1={ay + 14} x2={150} y2={sy + 14} stroke={C.line} strokeWidth={0.7} />
        )),
      )}
      {apps.map((y, i) => (
        <Box key={`a${i}`} x={22} y={y} w={32} h={28} label={`A${i + 1}`} fill={C.blueFill} stroke={C.blue} size={8} />
      ))}
      {sys.map((y, i) => (
        <Box key={`s${i}`} x={146} y={y} w={36} h={28} label={["git", "db", "fs"][i]} fill={C.greenFill} stroke={C.green} size={8} />
      ))}
      {/* after */}
      <Label x={330} y={24} anchor="middle" size={10} fill={C.ink} weight={600}>
        with MCP: N + M
      </Label>
      <Box x={300} y={90} w={56} h={30} label="MCP" fill={C.violet + "18"} stroke={C.violet} tcol={C.violet} />
      {apps.map((y, i) => (
        <g key={`a2${i}`}>
          <Box x={246} y={y} w={32} h={28} label={`A${i + 1}`} fill={C.blueFill} stroke={C.blue} size={8} />
          <line x1={278} y1={y + 14} x2={300} y2={105} stroke={C.line} strokeWidth={0.8} />
        </g>
      ))}
      {sys.map((y, i) => (
        <g key={`s2${i}`}>
          <Box x={378} y={y} w={36} h={28} label={["git", "db", "fs"][i]} fill={C.greenFill} stroke={C.green} size={8} />
          <line x1={356} y1={105} x2={378} y2={y + 14} stroke={C.line} strokeWidth={0.8} />
        </g>
      ))}
      <Label x={233} y={206} anchor="middle" size={9} fill={C.muted}>
        one protocol, build a server once, every client gets it
      </Label>
    </>
  );
}

// 6.5 Multi-agent patterns
export function AgentPatterns() {
  return (
    <>
      {/* ReAct */}
      <Label x={75} y={24} anchor="middle" size={9} fill={C.ink} weight={600}>
        ReAct
      </Label>
      <Box x={28} y={40} w={44} h={26} label="think" fill={C.blueFill} stroke={C.blue} size={8} />
      <Box x={86} y={40} w={44} h={26} label="act" fill={C.greenFill} stroke={C.green} size={8} />
      <Arrow x1={72} y1={47} x2={84} y2={47} color={C.muted} width={1} head={4} />
      <Arrow x1={86} y1={59} x2={72} y2={59} color={C.muted} width={1} head={4} />
      {/* Orchestrator + workers */}
      <Label x={245} y={24} anchor="middle" size={9} fill={C.ink} weight={600}>
        Orchestrator + workers
      </Label>
      <Box x={222} y={36} w={46} h={24} label="lead" fill={C.violet + "18"} stroke={C.violet} size={8} tcol={C.violet} />
      {[185, 235, 285].map((x, i) => (
        <g key={i}>
          <Box x={x} y={84} w={40} h={22} label={`sub`} size={7} />
          <Arrow x1={245} y1={60} x2={x + 20} y2={82} color={C.muted} width={0.8} head={3} />
        </g>
      ))}
      {/* Evaluator + optimizer */}
      <Label x={75} y={130} anchor="middle" size={9} fill={C.ink} weight={600}>
        Evaluator loop
      </Label>
      <Box x={28} y={144} w={50} h={24} label="generate" fill={C.greenFill} stroke={C.green} size={7} />
      <Box x={92} y={144} w={44} h={24} label="critique" fill={C.coralFill} stroke={C.coral} size={7} />
      <Arrow x1={78} y1={150} x2={90} y2={150} color={C.muted} width={1} head={4} />
      <Arrow x1={92} y1={162} x2={78} y2={162} color={C.muted} width={1} head={4} />
      {/* Planner + executor */}
      <Label x={245} y={130} anchor="middle" size={9} fill={C.ink} weight={600}>
        Planner + executor
      </Label>
      <Box x={185} y={144} w={50} h={24} label="plan" fill={C.blueFill} stroke={C.blue} size={8} />
      <Box x={255} y={144} w={56} h={24} label="execute" fill={C.greenFill} stroke={C.green} size={8} />
      <Arrow x1={235} y1={156} x2={253} y2={156} color={C.muted} width={1} head={4} />
    </>
  );
}

// 6.6 The lethal trifecta
export function LethalTrifecta() {
  const cx = 190;
  return (
    <>
      <circle cx={cx - 48} cy={110} r={70} fill={C.coral + "1e"} stroke={C.coral} strokeWidth={1.3} />
      <circle cx={cx + 48} cy={110} r={70} fill={C.blue + "1e"} stroke={C.blue} strokeWidth={1.3} />
      <circle cx={cx} cy={175} r={70} fill={C.green + "1e"} stroke={C.green} strokeWidth={1.3} />
      <Label x={cx - 92} y={70} anchor="middle" size={9} fill={C.coral}>
        private data
      </Label>
      <Label x={cx + 92} y={70} anchor="middle" size={9} fill={C.blue}>
        external comms
      </Label>
      <Label x={cx} y={246} anchor="middle" size={9} fill={C.green}>
        untrusted content
      </Label>
      <text x={cx} y={132} fontSize={9} fill={C.ink} fontFamily={MONO} textAnchor="middle">
        exfiltration
      </text>
      <text x={cx} y={145} fontSize={9} fill={C.ink} fontFamily={MONO} textAnchor="middle">
        risk
      </text>
    </>
  );
}
