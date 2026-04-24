"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function Settings() {
  const router = useRouter();
  const isFetching = useRef(false);
  const [state, setState] = useState(null);
  const [nodes, setNodes] = useState(5);
  const [consensus, setConsensus] = useState("pow");
  const [autoGenerateTxs, setAutoGenerateTxs] = useState(true);

  const fetchState = async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      const res = await fetch("/api/sim/state");
      const data = await res.json();
      setState(data);
    } catch(e) {
    } finally {
      isFetching.current = false;
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 1000);
    return () => clearInterval(interval);
  }, []);

  const initSim = async () => {
    await fetch("/api/sim/init", {
      method: "POST",
      body: JSON.stringify({ nodes, consensus, autoGenerateTxs, config: { difficulty: 3 } }),
    });
    fetchState();
  };

  const startSim = async () => {
    await fetch("/api/sim/start", { method: "POST" });
    fetchState();
  };

  const stopSim = async () => {
    await fetch("/api/sim/stop", { method: "POST" });
    fetchState();
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex justify-between items-center border-b border-gray-800 pb-4">
          <h1 className="text-3xl font-bold tracking-tight text-white">Settings & Control</h1>
          <button onClick={() => router.push('/')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm transition-colors">
            Back to Dashboard
          </button>
        </div>

        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl">
          <h2 className="text-xl font-semibold mb-6 text-gray-200">Simulation Config</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Network Size (Nodes)</label>
              <input type="number" value={nodes} onChange={(e) => setNodes(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded px-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Consensus Algorithm</label>
              <select value={consensus} onChange={(e) => setConsensus(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded px-4 py-3 text-sm focus:outline-none focus:border-blue-500">
                <option value="pow">Proof of Work (PoW)</option>
                <option value="pos">Proof of Stake (PoS)</option>
              </select>
            </div>
            <div className="flex items-center space-x-3 pt-2">
              <input 
                type="checkbox" 
                id="autoGen"
                checked={autoGenerateTxs} 
                onChange={(e) => setAutoGenerateTxs(e.target.checked)} 
                className="w-4 h-4 text-blue-600 bg-gray-950 border-gray-700 rounded focus:ring-blue-500" 
              />
              <label htmlFor="autoGen" className="text-sm text-gray-300">
                Auto-Generate Random Transactions (Bots)
              </label>
            </div>

            <div className="pt-4 border-t border-gray-800 flex space-x-3">
              <button onClick={initSim} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md transition-colors text-sm font-medium">Re-Initialize</button>
              <button onClick={startSim} disabled={state?.isRunning} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 rounded-md transition-colors text-sm font-medium">Start Simulation</button>
              <button onClick={stopSim} disabled={!state?.isRunning} className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white py-3 rounded-md transition-colors text-sm font-medium">Stop Simulation</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
