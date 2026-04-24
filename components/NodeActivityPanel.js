export default function NodeActivityPanel({ nodes, consensusType }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-lg overflow-y-auto h-full custom-scrollbar">
      <h2 className="text-sm font-semibold text-gray-200 mb-4 sticky top-0 bg-gray-900 pb-2 border-b border-gray-800 z-10 flex justify-between">
        <span>Network Nodes</span>
        <span className="text-blue-400">{nodes?.length || 0}</span>
      </h2>
      <div className="space-y-3">
        {nodes?.map(node => (
          <div key={node.id} className="bg-gray-950 p-3 rounded-lg border border-gray-800 hover:border-blue-500/50 transition-colors">
            <div className="flex justify-between items-center mb-2 border-b border-gray-800/50 pb-1">
              <span className="font-mono text-xs text-blue-400 font-bold">{node.id}</span>
              <span className="text-[10px] uppercase tracking-wide text-gray-500">
                {consensusType === 'pos' ? 'Validator' : 'Miner'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <div className="text-gray-500 mb-0.5">Tip Block</div>
                <div className="text-emerald-400 font-mono text-xs">{node.chainTip >= 0 ? node.chainTip : '0'}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-0.5">Mempool</div>
                <div className="text-gray-300 font-mono text-xs">{node.mempoolSize} txs</div>
              </div>
              <div>
                <div className="text-gray-500 mb-0.5">{consensusType === 'pos' ? 'Stake' : 'Hash Power'}</div>
                <div className="text-purple-400 font-mono text-xs">{consensusType === 'pos' ? node.stake : node.hashPower}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-0.5">Orphans</div>
                <div className={node.orphanCount > 0 ? "text-rose-400 font-mono text-xs" : "text-gray-400 font-mono text-xs"}>
                  {node.orphanCount}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
