"use client";
import { useState, useEffect, useRef } from "react";
import { Play, RotateCcw, Info } from "lucide-react";
import { scenarios } from "@/lib/engine/scenarios_data";

export default function ScenarioPanel({ currentState, fetchState }) {
  const [selectedScenario, setSelectedScenario] = useState("double_spend");
  const [events, setEvents] = useState([]);
  const eventsEndRef = useRef(null);

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/events");
      const data = await res.json();
      if (data.success) {
        setEvents(data.events);
      }
    } catch(e) {}
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  const loadScenario = async () => {
    await fetch("/api/scenario/load", {
      method: "POST",
      body: JSON.stringify({ scenario: selectedScenario })
    });
    fetchState();
  };

  const script = scenarios[selectedScenario];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl shadow-lg shrink-0 mb-4">
        <h2 className="text-sm font-semibold text-gray-200 mb-3 uppercase tracking-wide flex items-center">
          <Play size={14} className="mr-2 text-rose-400" />
          Scenario Engine
        </h2>
        
        <select 
          value={selectedScenario} 
          onChange={(e) => setSelectedScenario(e.target.value)}
          className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs text-gray-200 mb-3 focus:outline-none focus:border-blue-500"
        >
          {Object.keys(scenarios).map(key => (
            <option key={key} value={key}>{scenarios[key].name}</option>
          ))}
        </select>
        
        <div className="text-[10px] text-gray-400 mb-3 bg-gray-950 p-2 rounded border border-gray-800/50">
          <Info size={12} className="inline mr-1 text-blue-400" />
          {script.description}
        </div>

        <button 
          onClick={loadScenario}
          className="w-full bg-rose-600 hover:bg-rose-700 text-white text-xs py-2 rounded font-medium transition-colors flex justify-center items-center"
        >
          <RotateCcw size={14} className="mr-2" /> Load & Reset State
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl shadow-lg flex-1 overflow-hidden flex flex-col">
         <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide border-b border-gray-800 pb-2">Event Feed</h3>
         <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 text-[10px] font-mono">
           {events.length === 0 && <div className="text-gray-500 italic text-center py-4">Waiting for events...</div>}
           {events.map((ev, i) => (
             <div key={i} className={`p-2 rounded border ${ev.type === 'SCENARIO_STEP' ? 'bg-blue-900/20 border-blue-800/50 text-blue-300' : ev.type === 'REORG' ? 'bg-rose-900/20 border-rose-800/50 text-rose-300' : ev.type === 'BLOCK_REJECTED' ? 'bg-amber-900/20 border-amber-800/50 text-amber-300' : 'bg-gray-950 border-gray-800 text-gray-400'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold">{ev.type}</span>
                  <span className="text-gray-500">{ev.nodeId}</span>
                </div>
                {ev.type === 'SCENARIO_STEP' && <div>{ev.metadata.description}</div>}
                {ev.type === 'REORG' && <div>Depth: {ev.metadata.depth}</div>}
                {ev.type === 'BLOCK_REJECTED' && <div>Reason: {ev.metadata.reason}</div>}
             </div>
           ))}
           <div ref={eventsEndRef} />
         </div>
      </div>
    </div>
  );
}
