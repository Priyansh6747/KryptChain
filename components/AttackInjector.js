"use client";
import { useState, useEffect, useRef } from "react";
import { Zap, X, Shield, AlertTriangle, CheckCircle, Clock } from "lucide-react";

const ATTACKS = [
  {
    id:    "double_spend",
    label: "Double Spend",
    icon:  "💸",
    desc:  "Attacker mines a private chain to erase a confirmed transaction.",
    color: "amber",
    param: { label: "Attacker Hash %", key: "hashFraction", default: 0.40, min: 0.20, max: 0.75, step: 0.05 },
  },
  {
    id:    "selfish_mining",
    label: "Selfish Mining",
    icon:  "🕵️",
    desc:  "Miner withholds blocks to waste honest hash power. Profitable above 33%.",
    color: "orange",
    param: { label: "Attacker Hash %", key: "hashFraction", default: 0.35, min: 0.20, max: 0.60, step: 0.05 },
  },
  {
    id:    "partition",
    label: "Network Partition",
    icon:  "🔌",
    desc:  "Splits network in half. Both sides mine independently, then clash on heal.",
    color: "purple",
    param: { label: "Heal After (ticks)", key: "healAfter", default: 30, min: 10, max: 80, step: 5 },
  },
  {
    id:    "byzantine_flood",
    label: "Byzantine Flood",
    icon:  "☠️",
    desc:  "30% of nodes go rogue and spam invalid blocks. Tests rejection resilience.",
    color: "rose",
    param: { label: "Fraction Byzantine", key: "fraction", default: 0.30, min: 0.10, max: 0.60, step: 0.10 },
  },
];

const COLOR = {
  amber:  { ring: "border-amber-700/60",  btn: "bg-amber-600 hover:bg-amber-700",   badge: "text-amber-400 bg-amber-900/30 border-amber-700/40" },
  orange: { ring: "border-orange-700/60", btn: "bg-orange-600 hover:bg-orange-700", badge: "text-orange-400 bg-orange-900/30 border-orange-700/40" },
  purple: { ring: "border-purple-700/60", btn: "bg-purple-600 hover:bg-purple-700", badge: "text-purple-400 bg-purple-900/30 border-purple-700/40" },
  rose:   { ring: "border-rose-700/60",   btn: "bg-rose-600 hover:bg-rose-700",     badge: "text-rose-400 bg-rose-900/30 border-rose-700/40" },
};

const STATUS_ICON = {
  IN_PROGRESS: <Clock size={14} className="text-blue-400 animate-spin" style={{ animationDuration: "2s" }} />,
  SUCCEEDED:   <CheckCircle size={14} className="text-rose-400" />,
  PARTIAL:     <AlertTriangle size={14} className="text-amber-400" />,
  FAILED:      <Shield size={14} className="text-emerald-400" />,
};

const STATUS_COLOR = {
  IN_PROGRESS: "text-blue-300 border-blue-800/50 bg-blue-900/20",
  SUCCEEDED:   "text-rose-300 border-rose-800/50 bg-rose-900/20",
  PARTIAL:     "text-amber-300 border-amber-800/50 bg-amber-900/20",
  FAILED:      "text-emerald-300 border-emerald-800/50 bg-emerald-900/20",
};

function ProbabilityBar({ value }) {
  const pct  = Math.round(value * 100);
  const color = pct > 66 ? "#ef4444" : pct > 33 ? "#f59e0b" : "#10b981";
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] mb-1">
        <span className="text-gray-500">Attack Success Probability</span>
        <span className="font-mono font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default function AttackInjector({ chainLength = 0, isRunning = false, onUpdate }) {
  const [open,        setOpen       ] = useState(false);
  const [selected,    setSelected   ] = useState(ATTACKS[0]);
  const [paramVal,    setParamVal   ] = useState(ATTACKS[0].param.default);
  const [attackStatus, setAttackStatus] = useState(null);
  const [loading,     setLoading    ] = useState(false);
  const pollRef = useRef(null);

  // Poll attack status
  useEffect(() => {
    const poll = async () => {
      try {
        const res  = await fetch("/api/attack/status");
        const data = await res.json();
        setAttackStatus(data.attackStatus);
      } catch(_) {}
    };
    poll();
    pollRef.current = setInterval(poll, 800);
    return () => clearInterval(pollRef.current);
  }, []);

  const selectAttack = (atk) => {
    setSelected(atk);
    setParamVal(atk.param.default);
  };

  const inject = async () => {
    if (!isRunning) return;
    setLoading(true);
    try {
      const body = { attackType: selected.id, [selected.param.key]: paramVal };
      await fetch("/api/attack/inject", { method: "POST", body: JSON.stringify(body) });
      onUpdate?.();
    } catch(_) {}
    setLoading(false);
  };

  const clear = async () => {
    await fetch("/api/attack/clear", { method: "POST" });
    setAttackStatus(null);
    onUpdate?.();
  };

  const vulnerability = () => {
    if (chainLength < 3)  return { label: "CRITICAL",  color: "#ef4444", desc: "Brand new chain — almost certain to fall" };
    if (chainLength < 6)  return { label: "HIGH",       color: "#f87171", desc: "Low confirmation depth — easily reorged" };
    if (chainLength < 12) return { label: "MEDIUM",     color: "#f59e0b", desc: "Moderate depth — depends on attacker power" };
    if (chainLength < 20) return { label: "LOW",        color: "#84cc16", desc: "Good depth — attacker needs >40% hash power" };
    return                       { label: "VERY LOW",   color: "#10b981", desc: "Deep chain — only a 51% attack can succeed" };
  };

  const vuln = vulnerability();

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`absolute bottom-4 left-4 z-20 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all shadow-xl
          ${attackStatus?.status === 'IN_PROGRESS'
            ? 'bg-rose-700 hover:bg-rose-600 text-white border border-rose-600 animate-pulse'
            : 'bg-gray-900 hover:bg-gray-800 text-gray-200 border border-gray-700'
          }`}
        title="Attack Injector"
      >
        <Zap size={14} className={attackStatus?.status === 'IN_PROGRESS' ? 'text-white' : 'text-rose-400'} />
        {attackStatus?.status === 'IN_PROGRESS' ? 'Attack Active' : 'Inject Attack'}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute bottom-16 left-4 z-30 w-80 bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/60">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-rose-400" />
              <span className="text-xs font-bold text-gray-100 uppercase tracking-wide">Attack Injector</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-gray-300 transition-colors">
              <X size={14} />
            </button>
          </div>

          <div className="p-4 space-y-4">

            {/* Chain vulnerability meter */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">Current Chain Depth</span>
                <span className="font-mono text-xs text-gray-300">{chainLength} blocks</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500">Vulnerability</span>
                <span className="text-xs font-bold" style={{ color: vuln.color }}>{vuln.label}</span>
              </div>
              <div className="text-[9px] text-gray-600 mt-1">{vuln.desc}</div>
            </div>

            {/* Attack type picker */}
            <div className="grid grid-cols-2 gap-1.5">
              {ATTACKS.map(atk => {
                const c = COLOR[atk.color];
                return (
                  <button
                    key={atk.id}
                    onClick={() => selectAttack(atk)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      selected.id === atk.id
                        ? `${c.ring} bg-gray-900`
                        : 'border-gray-800 bg-gray-900/40 hover:border-gray-700'
                    }`}
                  >
                    <div className="text-sm mb-0.5">{atk.icon}</div>
                    <div className={`text-[10px] font-semibold ${selected.id === atk.id ? `text-${atk.color}-300` : 'text-gray-400'}`}>
                      {atk.label}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected attack details */}
            <div className="bg-gray-900/60 rounded-xl border border-gray-800 p-3 space-y-3">
              <p className="text-[10px] text-gray-500">{selected.desc}</p>

              {/* Parameter slider */}
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-gray-500">{selected.param.label}</span>
                  <span className="font-mono text-gray-300">
                    {selected.param.key === "hashFraction"
                      ? `${(paramVal * 100).toFixed(0)}%`
                      : paramVal}
                  </span>
                </div>
                <input
                  type="range"
                  min={selected.param.min}
                  max={selected.param.max}
                  step={selected.param.step}
                  value={paramVal}
                  onChange={e => setParamVal(parseFloat(e.target.value))}
                  className="w-full accent-rose-500"
                />
                {selected.param.key === "hashFraction" && (
                  <div className="text-[9px] text-gray-600 mt-0.5">
                    {paramVal >= 0.5 ? "⚠ Majority hashpower — chain will definitely fall" :
                     paramVal >= 1/3  ? "Profitable zone for selfish mining (>33%)" :
                     "Below selfish mining threshold — success depends on depth"}
                  </div>
                )}
              </div>

              {/* Inject / Clear buttons */}
              {attackStatus?.status === 'IN_PROGRESS' ? (
                <button onClick={clear}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                  <X size={12} /> Clear Attack
                </button>
              ) : (
                <button
                  onClick={inject}
                  disabled={!isRunning || loading}
                  className={`w-full text-white text-xs py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-40
                    ${COLOR[selected.color].btn}`}
                >
                  <Zap size={12} />
                  {loading ? "Injecting…" : !isRunning ? "Start simulation first" : `Inject ${selected.label}`}
                </button>
              )}
            </div>

            {/* Live attack status */}
            {attackStatus && (
              <div className={`rounded-xl border p-3 text-[10px] space-y-2 ${STATUS_COLOR[attackStatus.status]}`}>
                <div className="flex items-center gap-2 font-bold text-xs">
                  {STATUS_ICON[attackStatus.status]}
                  <span>{attackStatus.status.replace("_", " ")}</span>
                  <span className="ml-auto font-mono text-gray-500">{attackStatus.ticksElapsed}t</span>
                </div>

                {attackStatus.outcome && (
                  <div className="text-gray-400 leading-relaxed">{attackStatus.outcome}</div>
                )}

                <ProbabilityBar value={attackStatus.successProbability} />

                <div className="grid grid-cols-2 gap-1 text-gray-600 font-mono pt-1">
                  <div>Depth at start: <span className="text-gray-400">{attackStatus.startChainLength}</span></div>
                  <div>Chain now: <span className="text-gray-400">{attackStatus.currentChainLength}</span></div>
                  <div>Reorgs: <span className="text-gray-400">{attackStatus.reorgsSinceInjection}</span></div>
                  <div>Max depth: <span className="text-gray-400">{attackStatus.maxReorgDepth}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
