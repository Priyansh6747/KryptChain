"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function MetricsDashboard({ history }) {
  if (!history || history.length === 0) {
    return <div className="text-gray-500 text-sm p-4 text-center">No metrics available yet. Start simulation.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 h-48 shadow-lg">
        <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Transactions Per Tick (TPS)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis dataKey="tick" stroke="#4b5563" fontSize={10} tickMargin={10} />
            <YAxis stroke="#4b5563" fontSize={10} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#030712', borderColor: '#1f2937', fontSize: '12px', color: '#fff' }}
              itemStyle={{ color: '#60a5fa' }}
            />
            <Line type="stepAfter" dataKey="tps" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 h-48 shadow-lg">
        <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Forks & Blocks Produced</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis dataKey="tick" stroke="#4b5563" fontSize={10} tickMargin={10} />
            <YAxis stroke="#4b5563" fontSize={10} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#030712', borderColor: '#1f2937', fontSize: '12px', color: '#fff' }}
            />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Line type="monotone" dataKey="blocksProduced" name="Blocks/Tick" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="forkCount" name="Active Orphans" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
