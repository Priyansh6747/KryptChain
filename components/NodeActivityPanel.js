const BEHAVIOR_CONFIG = {
  honest:   { label: "Honest",   dot: "bg-emerald-400",  text: "text-emerald-400",  badge: "" },
  selfish:  { label: "Selfish",  dot: "bg-amber-400 animate-pulse",  text: "text-amber-400",  badge: "⚠" },
  byzantine:{ label: "Byzantine",dot: "bg-rose-500 animate-pulse",   text: "text-rose-400",   badge: "☠" },
};

function StatCell({ label, value, color = "text-gray-200" }) {
  return (
    <div>
      <div className="text-gray-600 mb-0.5 text-[9px] uppercase tracking-wide">{label}</div>
      <div className={`font-mono text-xs ${color}`}>{value}</div>
    </div>
  );
}

export default function NodeActivityPanel({ nodes, consensusType }) {
  if (!nodes?.length) return null;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-0.5">
      <div className="flex items-center justify-between mb-1 shrink-0">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Network Nodes</span>
        <span className="text-xs text-blue-400 font-mono">{nodes.length}</span>
      </div>

      {nodes.map(node => {
        const cfg = BEHAVIOR_CONFIG[node.behavior] || BEHAVIOR_CONFIG.honest;
        const isBad = node.behavior === "selfish" || node.behavior === "byzantine";

        return (
          <div
            key={node.id}
            className={`rounded-xl border p-3 transition-all duration-300 ${
              isBad
                ? "bg-gray-900 border-rose-900/60 shadow-[0_0_12px_rgba(239,68,68,0.08)]"
                : "bg-gray-900 border-gray-800"
            }`}
          >
            {/* Header row */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                <span className="font-mono text-xs text-gray-100 font-semibold">{node.id}</span>
                {cfg.badge && (
                  <span className="text-[11px]">{cfg.badge}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[9px] font-medium uppercase tracking-wider ${cfg.text}`}>
                  {cfg.label}
                </span>
                {node.isWithholding && (
                  <span className="text-[9px] text-amber-500 bg-amber-900/30 border border-amber-800/40 px-1 rounded">
                    WITHHOLDING
                  </span>
                )}
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[10px]">
              <StatCell
                label={consensusType === "pos" ? "Stake" : "Hash Power"}
                value={consensusType === "pos" ? node.stake : node.hashPower}
                color="text-purple-400"
              />
              <StatCell
                label="Chain Tip"
                value={node.chainTip >= 0 ? `#${node.chainTip}` : "—"}
                color="text-emerald-400"
              />
              <StatCell
                label="Mempool"
                value={`${node.mempoolSize} txs`}
                color="text-blue-300"
              />
              <StatCell
                label="Orphans"
                value={node.orphanCount}
                color={node.orphanCount > 0 ? "text-rose-400" : "text-gray-500"}
              />
            </div>

            {/* Private chain bar (selfish miners only) */}
            {node.behavior === "selfish" && node.privateChainLength > 0 && (
              <div className="mt-2.5 pt-2 border-t border-gray-800/60">
                <div className="text-[9px] text-amber-400 uppercase tracking-wide mb-1">
                  Private Chain ({node.privateChainLength} blocks)
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: Math.min(node.privateChainLength, 12) }).map((_, i) => (
                    <div key={i} className="h-2 flex-1 rounded-sm bg-amber-600/60 border border-amber-500/30" />
                  ))}
                  {node.privateChainLength > 12 && (
                    <div className="h-2 px-1 text-[8px] text-amber-400">+{node.privateChainLength - 12}</div>
                  )}
                </div>
              </div>
            )}

            {/* Stats from engine (if available) */}
            {node.stats && (
              <div className="mt-2.5 pt-2 border-t border-gray-800/40 grid grid-cols-3 gap-1 text-[9px] text-gray-600">
                <div>↑ {node.stats.blocksProposed}<span className="text-gray-700"> prop</span></div>
                <div>✓ {node.stats.blocksReceived}<span className="text-gray-700"> recv</span></div>
                <div>✗ {node.stats.blocksRejected}<span className="text-gray-700"> rej</span></div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
