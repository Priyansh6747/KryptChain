"use client";
import { useState, useEffect } from "react";
import Link from 'next/link';
import { normalizeGraphData } from "@/lib/ui/stateNormalizer";
import BlockchainGraph from "@/components/BlockchainGraph";
import MetricsDashboard from "@/components/MetricsDashboard";
import NodeActivityPanel from "@/components/NodeActivityPanel";
import InteractivePanel from "@/components/InteractivePanel";
import ScenarioPanel from "@/components/ScenarioPanel";
import AttackInjector from "@/components/AttackInjector";
import { Settings, Play, Square, FastForward, Gauge } from "lucide-react";

const SPEEDS = [
  { label: "0.5×", ms: 2000 },
  { label: "1×",   ms: 1000 },
  { label: "2×",   ms: 500  },
  { label: "4×",   ms: 250  },
  { label: "10×",  ms: 100  },
];

export default function Dashboard() {
  const [state,            setState           ] = useState(null);
  const [graphData,        setGraphData       ] = useState({ blocks: [], edges: [] });
  const [leftTab,          setLeftTab         ] = useState("nodes");
  const [hoveredBlockHash, setHoveredBlockHash] = useState(null);
  const [speedIdx,         setSpeedIdx        ] = useState(1); // default 1×

  const fetchState = async () => {
    try {
      const res  = await fetch("/api/sim/state");
      const data = await res.json();
      setState(data);
      const { blocks, edges } = normalizeGraphData(data);
      setGraphData({ blocks, edges });
    } catch(e) {}
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 1000);
    return () => clearInterval(interval);
  }, []);

  const startSim = async () => { await fetch("/api/sim/start", { method: "POST" }); fetchState(); };
  const stopSim  = async () => { await fetch("/api/sim/stop",  { method: "POST" }); fetchState(); };
  const stepSim  = async () => { await fetch("/api/sim/step",  { method: "POST" }); fetchState(); };

  const changeSpeed = async (idx) => {
    setSpeedIdx(idx);
    await fetch("/api/sim/speed", {
      method: "POST",
      body: JSON.stringify({ tickIntervalMs: SPEEDS[idx].ms }),
    });
  };

  const injectTx = async (sender, receiver, amount) => {
    await fetch("/api/tx/create", {
      method: "POST",
      body: JSON.stringify({ sender, receiver, amount }),
    });
    fetchState();
  };

  if (!state) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center text-sm text-gray-400">
      Initializing Engine…
    </div>
  );

  return (
    <div className="h-screen w-full bg-gray-950 text-white flex flex-col font-sans overflow-hidden">
      {/* ── Header ── */}
      <header className="h-14 border-b border-gray-800 flex items-center justify-between px-5 shrink-0 bg-gray-950/90 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            KryptChain
          </h1>

          {/* Status */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className={`w-2 h-2 rounded-full ${state.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className={state.isRunning ? "text-emerald-400" : "text-rose-400"}>
              {state.isRunning ? "Running" : "Stopped"}
            </span>
          </div>

          {/* Tick */}
          <div className="text-xs text-gray-500">
            Tick <span className="font-mono text-gray-200 bg-gray-800 px-1.5 py-0.5 rounded">{state.tickCount}</span>
          </div>

          {/* Consensus */}
          <span className="text-xs font-mono uppercase text-blue-300 bg-blue-900/30 border border-blue-800/50 px-2 py-0.5 rounded">
            {state.consensusType}
          </span>

          {/* Consensus ratio */}
          {state.metricsHistory?.length > 0 && (() => {
            const last = state.metricsHistory[state.metricsHistory.length - 1];
            const pct  = Math.round((last.consensusRatio || 0) * 100);
            const col  = pct >= 80 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-rose-400";
            return (
              <div className="text-xs text-gray-500">
                Agreement <span className={`font-mono font-bold ${col}`}>{pct}%</span>
              </div>
            );
          })()}

          {/* Active scenario badge */}
          {state.scenarioName && (
            <span className="text-xs text-rose-300 bg-rose-900/30 border border-rose-800/50 px-2 py-0.5 rounded">
              ⚡ {state.scenarioName.replace(/_/g, " ")}
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Speed selector */}
          <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1 mr-1">
            <Gauge size={12} className="text-gray-500 ml-1" />
            {SPEEDS.map((s, i) => (
              <button
                key={s.label}
                onClick={() => changeSpeed(i)}
                className={`text-[10px] px-2 py-1 rounded transition-colors font-mono ${
                  speedIdx === i
                    ? "bg-blue-600 text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <button onClick={startSim} disabled={state.isRunning}
            className="p-2 rounded hover:bg-gray-800 text-emerald-400 disabled:opacity-30 transition-colors" title="Start">
            <Play size={16} />
          </button>
          <button onClick={stopSim} disabled={!state.isRunning}
            className="p-2 rounded hover:bg-gray-800 text-rose-400 disabled:opacity-30 transition-colors" title="Stop">
            <Square size={16} />
          </button>
          <button onClick={stepSim}
            className="p-2 rounded hover:bg-gray-800 text-blue-400 transition-colors border-l border-gray-800 pl-3 ml-1" title="Step">
            <FastForward size={16} />
          </button>
          <Link href="/settings" className="p-2 rounded hover:bg-gray-800 text-gray-500 transition-colors ml-1">
            <Settings size={16} />
          </Link>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Panel */}
        <div className="w-72 border-r border-gray-800 p-3 shrink-0 overflow-hidden hidden md:flex flex-col bg-gray-950 z-10">
          <div className="flex gap-1 mb-3 shrink-0 bg-gray-900 p-1 rounded-lg border border-gray-800">
            <button onClick={() => setLeftTab("nodes")}
              className={`flex-1 text-xs py-1.5 rounded transition-colors ${leftTab === 'nodes' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              Nodes
            </button>
            <button onClick={() => setLeftTab("scenarios")}
              className={`flex-1 text-xs py-1.5 rounded transition-colors ${leftTab === 'scenarios' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              Scenarios
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {leftTab === "nodes" ? (
              <NodeActivityPanel nodes={state.nodes} consensusType={state.consensusType} />
            ) : (
              <ScenarioPanel
                currentState={state}
                fetchState={fetchState}
                setHoveredBlockHash={setHoveredBlockHash}
                hoveredBlockHash={hoveredBlockHash}
              />
            )}
          </div>
        </div>

        {/* Center: Graph */}
        <div className="flex-1 relative flex flex-col h-full overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900/50 via-gray-950 to-gray-950">
          <div className="flex-1 min-h-0 w-full relative z-0 overflow-hidden">
            <BlockchainGraph
              blocks={graphData.blocks}
              edges={graphData.edges}
              nodes={state.nodes}
              hoveredBlockHash={hoveredBlockHash}
              tickCount={state.tickCount}
            />
            <AttackInjector
              chainLength={state.nodes[0]?.chainLength || 0}
              isRunning={state.isRunning}
              onUpdate={fetchState}
            />
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-80 border-l border-gray-800 p-4 shrink-0 overflow-y-auto custom-scrollbar hidden xl:flex flex-col gap-6 bg-gray-950">
          <MetricsDashboard history={state.metricsHistory} networkStats={state.networkStats} />
          <div className="pt-5 border-t border-gray-800">
            <InteractivePanel mempool={state.globalMempool} onInjectTx={injectTx} />
          </div>
        </div>

      </div>
    </div>
  );
}
