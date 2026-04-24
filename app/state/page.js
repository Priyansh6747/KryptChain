"use client";
import { useState, useEffect } from "react";
import Link from 'next/link';

export default function StateDump() {
  const [state, setState] = useState(null);

  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch("/api/sim/state");
        const data = await res.json();
        setState(data);
      } catch(e) {
        // ignore
      }
    };
    fetchState();
    const interval = setInterval(fetchState, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-300 p-8 font-mono text-sm">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-xl text-white">Raw State Dump</h1>
        <Link href="/" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
          Back to Dashboard
        </Link>
      </div>
      <pre className="bg-black p-6 rounded-lg overflow-x-auto border border-gray-800 text-emerald-400 custom-scrollbar max-h-[80vh]">
        {state ? JSON.stringify(state, null, 2) : "Loading..."}
      </pre>
    </div>
  );
}
