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
  { id: "fs", name: "Filesystem", tools: ["read_file", "write_file"], resources: ["file://…"], prompts: ["summarize"], color: C.green, fill: C.greenFill, defaultTransport: "stdio" },
  { id: "gh", name: "GitHub", tools: ["create_pr", "list_issues"], resources: ["repo://…"], prompts: ["review_code"], color: C.blue, fill: C.blueFill, defaultTransport: "stdio" },
  { id: "api", name: "Remote API (SaaS)", tools: ["query", "send"], resources: ["https://…"], prompts: ["digest"], color: C.coral, fill: C.coralFill, defaultTransport: "http" },
];

const VB_W = 480;
const VB_H = 264;

// row centers, evenly spaced and aligned across clients and servers
const rowY = (i: number) => 92 + i * 48;

const btn =
  "rounded border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

export function AgtMcpHostClientsAndServers() {
  const [sel, setSel] = useState<string>("fs");
  const [connected, setConnected] = useState<Record<string, boolean>>({ fs: true, gh: true, api: true });
  const [transport, setTransport] = useState<Record<string, "stdio" | "http">>({ fs: "stdio", gh: "stdio", api: "http" });

  const active = SERVERS.find((s) => s.id === sel)!;

  // geometry
  const HOST_X = 12;
  const HOST_W = 196;
  const LLM_CX = 70;
  const LLM_CY = 60;
  const CLIENT_X = 116;
  const CLIENT_W = 80;
  const CLIENT_R = CLIENT_X + CLIENT_W; // 196
  const SRV_X = 300;
  const SRV_W = 168;

  return (
    <div>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-auto w-full" role="img" aria-label="MCP host with 1:1 clients each wired to a server">
        <defs>
          <marker id="mcp-head" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={C.muted} />
          </marker>
        </defs>

        <text x={VB_W / 2} y={16} fontSize={13} fill={C.ink} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          MCP: Host, Clients, and Servers
        </text>

        {/* host process box */}
        <rect x={HOST_X} y={34} width={HOST_W} height={206} rx={9} fill="var(--background)" stroke={C.ink} strokeWidth={1.6} />
        <text x={HOST_X + 10} y={50} fontSize={9} fill={C.ink} fontFamily={MONO} fontWeight={600}>
          Host process
        </text>

        {/* LLM */}
        <rect x={LLM_CX - 44} y={LLM_CY - 14} width={88} height={28} rx={6} fill={C.violet} opacity={0.16} stroke={C.violet} strokeWidth={1.2} />
        <text x={LLM_CX} y={LLM_CY + 4} fontSize={9.5} fill={C.violet} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          LLM
        </text>

        {/* clients + 1:1 links to servers */}
        {SERVERS.map((s, i) => {
          const y = rowY(i);
          const on = connected[s.id];
          const http = transport[s.id] === "http";
          return (
            <g key={`cl-${s.id}`}>
              {/* bus line from LLM to this client's left edge */}
              <line x1={LLM_CX} y1={LLM_CY + 14} x2={CLIENT_X} y2={y} stroke={C.line} strokeWidth={1} />
              {/* client box */}
              <rect x={CLIENT_X} y={y - 14} width={CLIENT_W} height={28} rx={5} fill="var(--card)" stroke={on ? C.muted : C.line} strokeWidth={1.2} opacity={on ? 1 : 0.45} />
              <text x={CLIENT_X + CLIENT_W / 2} y={y + 4} fontSize={8.5} fill={on ? C.ink : C.muted} fontFamily={MONO} textAnchor="middle">
                Client {i + 1}
              </text>
              {/* 1:1 link to server */}
              <line
                x1={CLIENT_R}
                y1={y}
                x2={SRV_X}
                y2={y}
                stroke={on ? s.color : C.line}
                strokeWidth={on ? 1.6 : 1}
                strokeDasharray={http ? "5 3" : undefined}
                opacity={on ? 1 : 0.4}
              />
              <text x={(CLIENT_R + SRV_X) / 2} y={y - 7} fontSize={7} fill={on ? C.muted : C.line} fontFamily={MONO} textAnchor="middle">
                {http ? "HTTP+SSE" : "stdio"}
              </text>
            </g>
          );
        })}

        {/* servers */}
        {SERVERS.map((s, i) => {
          const y = rowY(i);
          const isSel = s.id === sel;
          const on = connected[s.id];
          return (
            <g key={s.id} style={{ cursor: "pointer" }} onClick={() => setSel(s.id)}>
              <rect x={SRV_X} y={y - 17} width={SRV_W} height={34} rx={6} fill={isSel ? s.fill : "var(--card)"} stroke={isSel ? s.color : C.line} strokeWidth={isSel ? 2.2 : 1.2} opacity={on ? 1 : 0.45} />
              <text x={SRV_X + 9} y={y - 3} fontSize={9} fill={s.color} fontFamily={MONO} fontWeight={600}>
                {s.name} server
              </text>
              <text x={SRV_X + 9} y={y + 11} fontSize={7} fill={C.muted} fontFamily={MONO}>
                {`${s.tools.length} tools · ${s.resources.length} res · ${s.prompts.length} prompts`}
              </text>
            </g>
          );
        })}

        {/* lifecycle note (below the host box so it doesn't cross the border) */}
        <text x={VB_W / 2} y={256} fontSize={7.5} fill={C.muted} fontFamily={MONO} textAnchor="middle">
          lifecycle: initialize → list capabilities → invoke → shutdown
        </text>
      </svg>

      {/* primitive panel */}
      <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-xs font-semibold" style={{ color: active.color }}>
            {active.name} server{!connected[active.id] && " (disconnected)"}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" className={btn} onClick={() => setConnected((c) => ({ ...c, [active.id]: !c[active.id] }))}>
              {connected[active.id] ? "disconnect client" : "connect client"}
            </button>
            <button type="button" className={btn} onClick={() => setTransport((t) => ({ ...t, [active.id]: t[active.id] === "stdio" ? "http" : "stdio" }))}>
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
