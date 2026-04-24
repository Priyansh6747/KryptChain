"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";

export default function BlockInspector({ params }) {
  const [block, setBlock] = useState(null);
  const [error, setError] = useState("");
  // Unwrap params using React.use for Next.js 15+ compatibility
  const resolvedParams = use(params);

  useEffect(() => {
    const fetchBlock = async () => {
      try {
        const res = await fetch(`/api/block/${resolvedParams.id}`);
        const data = await res.json();
        if (data.success) {
          setBlock(data.block);
        } else {
          setError(data.error);
        }
      } catch(e) {
        setError("Failed to fetch block");
      }
    };
    if (resolvedParams?.id) {
      fetchBlock();
    }
  }, [resolvedParams]);

  if (error) return <div className="p-8 text-rose-500 font-mono">Error: {error}</div>;
  if (!block) return <div className="p-8 text-gray-500 font-mono animate-pulse">Loading block data...</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
          <h1 className="text-2xl font-bold text-gray-100">Block #{block.index}</h1>
          <Link href="/" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors text-sm font-medium">
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl space-y-4">
          <div>
            <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Hash</div>
            <div className="font-mono text-sm text-emerald-400 break-all bg-gray-950 p-4 rounded-lg border border-gray-800/50">{block.hash}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Parent Hash</div>
            <div className="font-mono text-sm text-blue-400 break-all bg-gray-950 p-4 rounded-lg border border-gray-800/50">
              {block.index === 0 ? "GENESIS" : block.prev_hash}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 pt-2">
            <div>
              <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Timestamp</div>
              <div className="font-mono text-sm text-gray-300">{new Date(block.timestamp).toISOString()}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Validator / Miner</div>
              <div className="font-mono text-sm text-purple-400">{block.validator || 'N/A (PoW)'}</div>
            </div>
            {block.nonce !== undefined && block.nonce !== 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Nonce (PoW)</div>
                <div className="font-mono text-sm text-amber-400">{block.nonce}</div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold mb-4 border-b border-gray-800 pb-2 text-gray-200">
            Transactions ({block.transactions.length})
          </h2>
          {block.transactions.length === 0 ? (
            <div className="text-gray-500 text-sm italic text-center py-8">No transactions included in this block.</div>
          ) : (
            <div className="space-y-3">
              {block.transactions.map(tx => (
                <div key={tx.id} className="bg-gray-950 p-4 rounded-lg border border-gray-800/50 hover:border-gray-700 transition-colors">
                  <div className="flex justify-between items-center mb-3 border-b border-gray-800/50 pb-2">
                    <span className="font-mono text-xs text-gray-500" title={tx.id}>TxID: {tx.id.substring(0, 16)}...</span>
                    <span className="text-emerald-400 font-mono text-sm font-bold">+{tx.amount} KRYPT</span>
                  </div>
                  <div className="flex items-center text-sm space-x-4">
                    <span className="text-blue-400 font-mono flex-1 text-right">{tx.sender}</span>
                    <span className="text-gray-600">→</span>
                    <span className="text-purple-400 font-mono flex-1">{tx.receiver}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
