"use client";
import { useState, useEffect, useRef } from "react";
import { X, Activity } from "lucide-react";

// Dynamic narrative — concise and factual
function getNarrative(prob, reorgs, attackType, elapsed) {
  if (reorgs > 0) return "Chain reorganization detected.";
  const p = prob * 100;
  if (attackType === "double_spend") {
    if (p > 70) return `Attack likely to succeed — chain depth insufficient.`;
    if (p > 40) return `Contested — outcome depends on mining variance.`;
    return `Chain depth is limiting attack effectiveness.`;
  }
  if (attackType === "selfish_mining") {
    if (p > 50) return `Orphan rate rising — honest work being wasted.`;
    return `Hash power below profitable threshold (33%).`;
  }
  if (attackType === "partition")   return `Network split. Longer sub-chain wins on heal.`;
  if (attackType === "byzantine_flood") return `Invalid blocks being rejected by consensus.`;
  return "Monitoring…";
}

// Clean outcome card
function OutcomeCard({ status, attackStatus, onDismiss }) {
  const succeeded = status === "SUCCEEDED";
  const partial   = status === "PARTIAL";

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center pb-6 bg-gray-950/70 backdrop-blur-sm outcome-in">
      <div className="w-full max-w-md mx-4 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header strip */}
        <div className={`px-5 py-3 flex items-center justify-between border-b ${
          succeeded ? "border-rose-900/60 bg-rose-950/30"
          : partial  ? "border-amber-900/60 bg-amber-950/20"
          :            "border-emerald-900/60 bg-emerald-950/20"
        }`}>
          <span className={`text-sm font-semibold ${
            succeeded ? "text-rose-300" : partial ? "text-amber-300" : "text-emerald-300"
          }`}>
            {succeeded ? "Attack Succeeded" : partial ? "Partial Effect" : "Attack Repelled"}
          </span>
          <button onClick={onDismiss} className="text-gray-600 hover:text-gray-400 transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Outcome description */}
          {attackStatus.outcome && (
            <p className="text-xs text-gray-400 leading-relaxed">
              {attackStatus.outcome}
            </p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Chain at start",  value: `${attackStatus.startChainLength} blocks` },
              { label: "Reorgs",          value: attackStatus.reorgsSinceInjection },
              { label: "Max reorg depth", value: `${attackStatus.maxReorgDepth} blocks` },
              { label: "Attacker power",  value: `${attackStatus.attackerHashFraction}%` },
              { label: "Duration",        value: `${attackStatus.ticksElapsed} ticks` },
              { label: "Final depth",     value: `${attackStatus.currentChainLength} blocks` },
            ].map(s => (
              <div key={s.label} className="bg-gray-950 rounded-lg p-2 border border-gray-800">
                <div className="text-[9px] text-gray-600 mb-0.5 uppercase tracking-wide">{s.label}</div>
                <div className="text-xs font-mono text-gray-200">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Insight */}
          <div className="text-[10px] text-gray-500 bg-gray-950/60 border border-gray-800 rounded-lg px-3 py-2 leading-relaxed">
            {succeeded
              ? `With ${attackStatus.attackerHashFraction}% hash power against ${attackStatus.startChainLength} confirmations, the attacker successfully reorganized the chain. Deeper chains make this exponentially harder.`
              : `${attackStatus.startChainLength} confirmations proved sufficient. Each block added reduces double-spend probability by (q/p)^z — the Nakamoto formula.`
            }
          </div>

          <button
            onClick={onDismiss}
            className="w-full text-xs py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AttackBattle({ attackStatus, nodes, onClear }) {
  const [dismissed, setDismissed] = useState(false);
  const [reorgFlash, setReorgFlash] = useState(false);
  const prevReorgs = useRef(0);

  useEffect(() => {
    if (!attackStatus) { prevReorgs.current = 0; return; }
    if (attackStatus.reorgsSinceInjection > prevReorgs.current) {
      prevReorgs.current = attackStatus.reorgsSinceInjection;
      setReorgFlash(true);
      setTimeout(() => setReorgFlash(false), 600);
    }
  }, [attackStatus?.reorgsSinceInjection]);

  useEffect(() => {
    if (attackStatus?.status === "IN_PROGRESS") setDismissed(false);
  }, [attackStatus?.attackType, attackStatus?.startTick]);

  if (!attackStatus) return null;

  const { status, successProbability, attackType, reorgsSinceInjection, attackerNodeId } = attackStatus;
  const isDone   = status !== "IN_PROGRESS";
  const probPct  = Math.round(successProbability * 100);
  const narrative = getNarrative(successProbability, reorgsSinceInjection, attackType, attackStatus.ticksElapsed);

  const handleDismiss = async () => {
    setDismissed(true);
    await onClear?.();
  };

  // Subtle reorg notification
  const reorgNotif = reorgFlash && (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-gray-900 border border-rose-800/60 rounded-lg px-4 py-2 text-xs text-rose-400 font-mono shadow-lg slide-down">
      Chain reorg detected — depth {attackStatus.maxReorgDepth}
    </div>
  );

  // Outcome card
  if (isDone && !dismissed) {
    return (
      <>
        {reorgNotif}
        <OutcomeCard status={status} attackStatus={attackStatus} onDismiss={handleDismiss} />
      </>
    );
  }

  if (isDone && dismissed) return null;

  // Active attack — slim status strip at bottom of graph
  const probColor = probPct > 60 ? "#f87171" : probPct > 30 ? "#fb923c" : "#34d399";

  return (
    <>
      {reorgNotif}
      <div className="absolute bottom-4 left-4 right-4 z-30 slide-down">
        <div className="bg-gray-900/95 border border-gray-700 rounded-xl px-4 py-3 shadow-xl backdrop-blur-md flex items-center gap-4">

          {/* Type label */}
          <div className="shrink-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Activity size={10} className="text-rose-400" />
              <span className="text-[9px] font-semibold text-rose-400 uppercase tracking-widest">
                {attackType.replace(/_/g, " ")}
              </span>
            </div>
            <div className="text-[9px] text-gray-600 font-mono">t+{attackStatus.ticksElapsed}</div>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-800 shrink-0" />

          {/* Narrative */}
          <div className="flex-1 min-w-0 text-[10px] text-gray-400 truncate">
            {narrative}
          </div>

          {/* Chain depth vs start */}
          <div className="shrink-0 text-right">
            <div className="text-[9px] text-gray-600 mb-0.5">depth</div>
            <div className="text-xs font-mono text-gray-300">
              {attackStatus.startChainLength}
              <span className="text-gray-600 mx-1">→</span>
              {attackStatus.currentChainLength}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-800 shrink-0" />

          {/* Probability */}
          <div className="shrink-0 w-20">
            <div className="flex justify-between text-[9px] mb-1">
              <span className="text-gray-600">success prob</span>
              <span className="font-mono font-bold" style={{ color: probColor }}>{probPct}%</span>
            </div>
            <div className="h-1 rounded-full bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${probPct}%`, background: probColor }}
              />
            </div>
          </div>

          {/* Dismiss */}
          <button onClick={handleDismiss} className="shrink-0 text-gray-700 hover:text-gray-400 transition-colors ml-1">
            <X size={12} />
          </button>
        </div>
      </div>
    </>
  );
}
