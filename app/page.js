"use client";
import { useState, useEffect } from "react";
import Link from 'next/link';
import { normalizeGraphData } from "@/lib/ui/stateNormalizer";
import BlockchainGraph from "@/components/BlockchainGraph";
import MetricsDashboard from "@/components/MetricsDashboard";
import NodeActivityPanel from "@/components/NodeActivityPanel";
import InteractivePanel from "@/components/InteractivePanel";
import ScenarioPanel from "@/components/ScenarioPanel";
import { Settings, Play, Square, FastForward } from "lucide-react";

export default function Dashboard() {
  const [state, setState] = useState(null);
  const [graphData, setGraphData] = useState({ blocks: [], edges: [] });
  const [leftTab, setLeftTab] = useState("nodes"); // "nodes" | "scenarios"

  const fetchState = async () => {
    try {
      const res = await fetch("/api/sim/state");
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
  const stopSim = async () => { await fetch("/api/sim/stop", { method: "POST" }); fetchState(); };
  const stepSim = async () => { await fetch("/api/sim/step", { method: "POST" }); fetchState(); };

  const injectTx = async (sender, receiver, amount) => {
    await fetch("/api/tx/create", {
      method: "POST",
      body: JSON.stringify({ sender, receiver, amount }),
    });
    fetchState();
  };

  if (!state) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading Engine...</div>;

  return (
    <div className="h-screen w-full bg-gray-950 text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 shrink-0 bg-gray-950/80 backdrop-blur-md z-20">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            KryptChain
          </h1>
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-gray-500">Status:</span>
            <span className={state.isRunning ? "text-emerald-400 font-medium flex items-center" : "text-rose-400 font-medium flex items-center"}>
              <span className={`w-2 h-2 rounded-full mr-1.5 ${state.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
              {state.isRunning ? "Running" : "Stopped"}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-gray-500">Tick:</span>
            <span className="text-gray-200 font-mono bg-gray-800 px-2 rounded py-0.5">{state.tickCount}</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-gray-500">Consensus:</span>
            <span className="text-blue-300 font-mono uppercase bg-blue-900/30 border border-blue-800/50 px-2 rounded py-0.5">{state.consensusType}</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button onClick={startSim} disabled={state.isRunning} className="p-2 rounded hover:bg-gray-800 text-emerald-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors" title="Start">
            <Play size={18} />
          </button>
          <button onClick={stopSim} disabled={!state.isRunning} className="p-2 rounded hover:bg-gray-800 text-rose-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors" title="Stop">
            <Square size={18} />
          </button>
          <button onClick={stepSim} className="p-2 rounded hover:bg-gray-800 text-blue-400 transition-colors border-l border-gray-800 pl-4 ml-2" title="Step Tick">
            <FastForward size={18} />
          </button>
          <Link href="/settings" className="p-2 rounded hover:bg-gray-800 text-gray-400 transition-colors ml-2" title="Settings">
            <Settings size={18} />
          </Link>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-72 border-r border-gray-800 p-4 shrink-0 overflow-hidden hidden md:flex flex-col bg-gray-950 z-10">
           <div className="flex space-x-2 mb-4 shrink-0 bg-gray-900 p-1 rounded-lg border border-gray-800">
             <button onClick={() => setLeftTab("nodes")} className={`flex-1 text-xs py-1.5 rounded transition-colors ${leftTab === 'nodes' ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>Nodes</button>
             <button onClick={() => setLeftTab("scenarios")} className={`flex-1 text-xs py-1.5 rounded transition-colors ${leftTab === 'scenarios' ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>Scenarios</button>
           </div>
           
           <div className="flex-1 min-h-0 overflow-hidden">
             {leftTab === "nodes" ? (
               <NodeActivityPanel nodes={state.nodes} consensusType={state.consensusType} />
             ) : (
               <ScenarioPanel currentState={state} fetchState={fetchState} />
             )}
           </div>
        </div>

        {/* Center: Graph */}
        <div className="flex-1 p-6 relative flex flex-col h-full overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-gray-950 to-gray-950">
          <h2 className="text-sm font-semibold text-gray-400 mb-4 absolute top-6 left-6 z-10">Network DAG Projection</h2>
          <div className="flex-1 min-h-0 w-full rounded-xl border border-gray-800 shadow-2xl relative z-0 overflow-hidden bg-[#030712]">
            <BlockchainGraph blocks={graphData.blocks} edges={graphData.edges} />
          </div>
        </div>

        {/* Right Panel: Metrics & Interactive */}
        <div className="w-80 border-l border-gray-800 p-4 shrink-0 overflow-y-auto custom-scrollbar hidden xl:block bg-gray-950 flex flex-col space-y-6">
          <MetricsDashboard history={state.metricsHistory} />
          <div className="pt-6 border-t border-gray-800 mt-6">
            <InteractivePanel mempool={state.globalMempool} onInjectTx={injectTx} />
          </div>
        </div>
      </div>
    </div>
  );
}
