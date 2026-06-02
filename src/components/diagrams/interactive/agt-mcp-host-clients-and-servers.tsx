"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// MCP: Host, Clients, and Servers — one host runs many 1:1 clients, each wired
// to a server that exposes tools, resources, and prompts. Interactive: click a
// server to reveal its primitives; toggle a client connection on/off so the
// host gains/loses that server's capabilities; switch a server's transport
// between stdio (local subprocess) and HTTP+SSE (remote).

interface Server {
  id: string;
  name: string;
  tools: string[];
  resources: string[];
  prompts: string[];
  color: string;
  fill: string;
  defaultTransport: "stdio" | "http";
}

const SERVERS: Server[] = [
  { id: "fs", name: "Filesystem server", tools: ["read_file", "write_file"], resources: ["file://…"], prompts: ["summarize"], color: C.green, fill: C.greenFill, defaultTransport: "stdio" },
  { id: "gh", name: "GitHub server", tools: ["create_pr", "list_issues"], resources: ["repo://…"], prompts: ["review_code"], color: C.blue, fill: C.blueFill, defaultTransport: "stdio" },
  { id: "api", name: "Remote API (SaaS)", tools: ["query", "send"], resources: ["https://…"], prompts: ["digest"], color: C.coral, fill: C.coralFill, defaultTransport: "http" },
];

const VB_W = 480;
const VB_H = 250;

const btn =
  "rounded border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

export function AgtMcpHostClientsAndServers() {
  const [sel, setSel] = useState<string>("fs");
  const [connected, setConnected] = useState<Record<string, boolean>>({ fs: true, gh: true, api: true });
  const [transport, setTransport] = useState<Record<string, "stdio" | "http">>({ fs: "stdio", gh: "stdio", api: "http" });

  const active = SERVERS.find((s) => s.id === sel)!;
  const srvY = (i: number) => 56 + i * 58;

  return (
    <div>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-auto w-full" role="img" aria-label="MCP host with 1:1 clients each wired to a server">
        <text x={VB_W / 2} y={16} fontSize={13} fill={C.ink} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          MCP: Host, Clients, and Servers
        </text>

        {/* host process box */}
        <rect x={14} y={36} width={170} height={200} rx={9} fill="var(--background)" stroke={C.ink} strokeWidth={1.6} />
        <text x={22} y={52} fontSize={9} fill={C.ink} fontFamily={MONO} fontWeight={600}>
          Host process
        </text>
        {/* LLM */}
        <rect x={26} y={58} width={50} height={34} rx={6} fill={C.violet} opacity={0.18} stroke={C.violet} strokeWidth={1.2} />
        <text x={51} y={79} fontSize={9} fill={C.violet} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          LLM
        </text>

        {/* clients */}
        {SERVERS.map((s, i) => {
          const y = srvY(i);
          const on = connected[s.id];
          return (
            <g key={`cl-${s.id}`}>
              <rect x={96} y={y - 12} width={78} height={26} rx={5} fill={on ? "var(--card)" : "var(--card)"} stroke={on ? C.muted : C.line} strokeWidth={1.2} opacity={on ? 1 : 0.4} />
              <text x={135} y={y + 5} fontSize={7.5} fill={on ? C.ink : C.muted} fontFamily={MONO} textAnchor="middle">
                Client {i + 1}
              </text>
              {/* 1:1 link to server (if connected) */}
              {on && (
                <line x1={174} y1={y} x2={300} y2={y} stroke={s.color} strokeWidth={1.4} strokeDasharray={transport[s.id] === "http" ? "5 3" : undefined} />
              )}
              {on && (
                <text x={237} y={y - 5} fontSize={6.5} fill={C.muted} fontFamily={MONO} textAnchor="middle">
                  {transport[s.id] === "http" ? "HTTP+SSE" : "stdio"}
                </text>
              )}
            </g>
          );
        })}
        {/* LLM-to-clients hint */}
        <line x1={51} y1={92} x2={51} y2={srvY(2)} stroke={C.line} strokeWidth={1} />
        {SERVERS.map((_, i) => (
          <line key={`lc-${i}`} x1={51} y1={srvY(i)} x2={96} y2={srvY(i)} stroke={C.line} strokeWidth={1} />
        ))}

        {/* servers */}
        {SERVERS.map((s, i) => {
          const y = srvY(i);
          const isSel = s.id === sel;
          const on = connected[s.id];
          return (
            <g key={s.id} style={{ cursor: "pointer" }} onClick={() => setSel(s.id)}>
              <rect x={300} y={y - 16} width={166} height={32} rx={6} fill={isSel ? s.fill : "var(--card)"} stroke={isSel ? s.color : C.line} strokeWidth={isSel ? 2.2 : 1.2} opacity={on ? 1 : 0.45} />
              <text x={308} y={y - 2} fontSize={8.5} fill={s.color} fontFamily={MONO} fontWeight={600}>
                {s.name}
              </text>
              <text x={308} y={y + 10} fontSize={6.5} fill={C.muted} fontFamily={MONO}>
                {`${s.tools.length} tools · ${s.resources.length} res · ${s.prompts.length} prompts`}
              </text>
            </g>
          );
        })}

        {/* lifecycle note */}
        <text x={VB_W / 2} y={236} fontSize={7.5} fill={C.muted} fontFamily={MONO} textAnchor="middle">
          lifecycle: initialize → list capabilities → invoke → shutdown
        </text>
      </svg>

      {/* primitive panel */}
      <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-xs font-semibold" style={{ color: active.color }}>
            {active.name}{!connected[active.id] && " (disconnected)"}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={btn}
              onClick={() => setConnected((c) => ({ ...c, [active.id]: !c[active.id] }))}
            >
              {connected[active.id] ? "disconnect client" : "connect client"}
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => setTransport((t) => ({ ...t, [active.id]: t[active.id] === "stdio" ? "http" : "stdio" }))}
            >
              transport: {transport[active.id] === "http" ? "HTTP+SSE" : "stdio"}
            </button>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[11px]">
          <div>
            <p className="font-semibold text-[var(--foreground)]">tools</p>
            {active.tools.map((t) => <p key={t} className="text-[var(--muted)]">{t}</p>)}
          </div>
          <div>
            <p className="font-semibold text-[var(--foreground)]">resources</p>
            {active.resources.map((t) => <p key={t} className="text-[var(--muted)]">{t}</p>)}
          </div>
          <div>
            <p className="font-semibold text-[var(--foreground)]">prompts</p>
            {active.prompts.map((t) => <p key={t} className="text-[var(--muted)]">{t}</p>)}
          </div>
        </div>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        One host, many 1:1 clients, each wired to a server exposing tools, resources, and prompts. Disconnect a client and the
        host loses those capabilities; flip a server&rsquo;s transport between stdio (local subprocess) and HTTP+SSE (remote).
      </p>
    </div>
  );
}
