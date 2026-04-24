"use client";
import { useEffect, useRef, useState } from "react";
import anime from "animejs";
import Link from "next/link";

const X_SPACING = 120;
const Y_SPACING = 80;
const ANNOTATION_LIFETIME_TICKS = 8;

// Behavior → visual tokens
const BEHAVIOR_STYLE = {
  selfish:  { fill: "#78350f", stroke: "#f59e0b", glow: "url(#glow-amber)" },
  byzantine:{ fill: "#7f1d1d", stroke: "#ef4444", glow: "url(#glow-red)"   },
};

// Event type → annotation label fn + color
const EVENT_META = {
  REORG:          { label: m => `⟳ Reorg — depth ${m?.depth ?? "?"}`,                color: "#f87171" },
  BLOCK_REJECTED: { label: m => `✗ Rejected: ${m?.reason ?? "bad block"}`,            color: "#fbbf24" },
  SCENARIO_STEP:  { label: m => m?.description ?? "Scenario step",                    color: "#60a5fa" },
  BLOCK_MINED:    { label: m => `⛏ Block #${m?.index ?? "?"} mined`,                  color: "#4ade80" },
};

const legend = [
  { color: "#34d399", label: "Canonical"      },
  { color: "#374151", label: "Orphan / Fork"  },
  { color: "#f59e0b", label: "Selfish Miner"  },
  { color: "#ef4444", label: "Byzantine / Invalid" },
];

export default function BlockchainGraph({ blocks, edges, hoveredBlockHash, tickCount }) {
  const containerRef = useRef(null);
  const seenBlocks   = useRef(new Set());
  const seenEdges    = useRef(new Set());
  const seenEvents   = useRef(new Set());
  const [annotations, setAnnotations] = useState([]);

  // ── Dimensions ──────────────────────────────────────────
  const maxIndex  = blocks.length ? Math.max(...blocks.map(b => b.index),       0) : 0;
  const maxBranch = blocks.length ? Math.max(...blocks.map(b => b.branchIndex), 0) : 0;
  const width  = Math.max(800, (maxIndex  + 2) * X_SPACING);
  const height = Math.max(400, (maxBranch + 3) * Y_SPACING + 60);

  const coords = (b) => ({ x: b.index * X_SPACING + 50, y: b.branchIndex * Y_SPACING + 100 });

  // ── Block style from normalised data ────────────────────
  const blockStyle = (block) => {
    const beh       = block.behavior || "honest";
    const isHovered = block.hash === hoveredBlockHash;
    const isInvalid = block.hash?.includes("INVALID") || block.hash?.includes("MALICIOUS");
    const custom    = BEHAVIOR_STYLE[beh];

    if (isInvalid)
      return { fill: "#7f1d1d", stroke: "#ef4444", sw: isHovered ? 4 : 2, glow: "url(#glow-red)" };
    if (custom)
      return { ...custom, sw: isHovered ? 4 : 2, stroke: isHovered ? "#3b82f6" : custom.stroke };
    return {
      fill:  block.isCanonical ? "#065f46" : "#1c1f2e",
      stroke: isHovered ? "#3b82f6" : (block.isCanonical ? "#34d399" : "#374151"),
      sw: isHovered ? 4 : 2,
      glow: undefined,
    };
  };

  const blockBadge = (block) => {
    const beh = block.behavior || "honest";
    const inv = block.hash?.includes("INVALID") || block.hash?.includes("MALICIOUS");
    if (inv)               return { text: "☠", color: "#ef4444" };
    if (beh === "selfish") return { text: "⚠", color: "#f59e0b" };
    if (beh === "byzantine") return { text: "✗", color: "#ef4444" };
    if (!block.isCanonical)  return { text: "↩", color: "#6b7280" };
    return null;
  };

  const edgeStyle = (edge) => {
    const beh = edge.behavior || "honest";
    if (edge.isCanonical)  return { color:"#10b981", marker:"url(#arr-green)", w:2.5, dash: undefined };
    if (beh === "selfish") return { color:"#f59e0b", marker:"url(#arr-amber)", w:1.5, dash:"4 3"     };
    if (beh === "byzantine") return { color:"#ef4444", marker:"url(#arr-red)", w:1.5, dash:"4 3"    };
    return                        { color:"#374151", marker:"url(#arr-gray)", w:1.5, dash:"4 3"     };
  };

  // ── Animate new blocks / edges ───────────────────────────
  useEffect(() => {
    const newB = blocks.filter(b => !seenBlocks.current.has(b.hash)).map(b => b.hash);
    const newE = edges .filter(e => !seenEdges .current.has(e.id)) .map(e => e.id);

    if (newB.length) {
      anime({ targets: newB.map(id => `[id="block-${CSS.escape(id)}"]`),
        scale:[0.4,1], opacity:[0,1], duration:650, easing:"easeOutElastic(1,.8)" });
      newB.forEach(id => seenBlocks.current.add(id));
    }
    if (newE.length) {
      anime({ targets: newE.map(id => `[id="edge-${id.replace(/[^a-zA-Z0-9_-]/g,"")}"]`),
        strokeDashoffset:[anime.setDashoffset,0], opacity:[0,1], duration:450, easing:"easeInOutSine" });
      newE.forEach(id => seenEdges.current.add(id));
    }
    if (newB.length && containerRef.current)
      containerRef.current.scrollTo({ left: containerRef.current.scrollWidth, behavior:"smooth" });
  }, [blocks, edges]);

  // ── Scroll to hovered block ──────────────────────────────
  useEffect(() => {
    if (!hoveredBlockHash || !containerRef.current) return;
    const block = blocks.find(b => b.hash === hoveredBlockHash);
    if (!block) return;
    const { x } = coords(block);
    containerRef.current.scrollTo({
      left: Math.max(0, x - containerRef.current.clientWidth / 2 + 20),
      behavior: "smooth",
    });
  }, [hoveredBlockHash, blocks]);

  // ── Poll events → spawn fading annotations ───────────────
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      try {
        const res  = await fetch("/api/events");
        const data = await res.json();
        if (!data.success || cancelled) return;

        const fresh = [];
        for (const ev of data.events) {
          const key = `${ev.type}-${ev.tick}-${ev.nodeId}`;
          if (seenEvents.current.has(key)) continue;
          seenEvents.current.add(key);

          const meta = EVENT_META[ev.type];
          if (!meta) continue;

          fresh.push({
            id:        key,
            blockHash: ev.metadata?.hash ?? null,
            label:     meta.label(ev.metadata),
            color:     meta.color,
            bornTick:  ev.tick ?? tickCount,
            type:      ev.type,
          });
        }
        if (fresh.length)
          setAnnotations(prev => [...prev.slice(-40), ...fresh]);
      } catch(_) {}
    };

    poll();
    const id = setInterval(poll, 1200);
    return () => { cancelled = true; clearInterval(id); };
  }, [tickCount]);

  // ── Expire annotations by tick age ──────────────────────
  useEffect(() => {
    setAnnotations(prev => prev.filter(a => (tickCount - a.bornTick) < ANNOTATION_LIFETIME_TICKS));
  }, [tickCount]);

  return (
    <div
      className="w-full h-full overflow-x-auto overflow-y-auto custom-scrollbar bg-gray-950 rounded-xl border border-gray-800 relative shadow-inner"
      ref={containerRef}
    >
      {/* Legend */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-800 px-3 py-2 pointer-events-none">
        {legend.map(l => (
          <div key={l.label} className="flex items-center gap-2 text-[10px] text-gray-400">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>

      <svg width={width} height={height} className="min-h-full overflow-visible">
        <defs>
          {[
            { id:"arr-gray",  fill:"#374151" },
            { id:"arr-green", fill:"#10b981" },
            { id:"arr-amber", fill:"#f59e0b" },
            { id:"arr-red",   fill:"#ef4444" },
          ].map(({ id, fill }) => (
            <marker key={id} id={id} markerWidth="8" markerHeight="6" refX="20" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill={fill} />
            </marker>
          ))}
          <filter id="glow-amber" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-red" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Edges */}
        <g>
          {edges.map(edge => {
            const src = blocks.find(b => b.hash === edge.source);
            const tgt = blocks.find(b => b.hash === edge.target);
            if (!src || !tgt) return null;
            const { x:x1, y:y1 } = coords(src);
            const { x:x2, y:y2 } = coords(tgt);
            const s   = edgeStyle(edge);
            const pid = `edge-${edge.id.replace(/[^a-zA-Z0-9_-]/g,"")}`;
            const d   = `M ${x1} ${y1} C ${(x1+x2)/2} ${y1}, ${(x1+x2)/2} ${y2}, ${x2} ${y2}`;
            return (
              <path key={edge.id} id={pid} d={d} fill="none"
                stroke={s.color} strokeWidth={s.w}
                strokeDasharray={s.dash} markerEnd={s.marker}
                className="transition-all duration-500"
              />
            );
          })}
        </g>

        {/* Blocks */}
        <g>
          {blocks.map(block => {
            const { x, y } = coords(block);
            const s        = blockStyle(block);
            const badge    = blockBadge(block);
            return (
              <Link href={`/block/${block.hash}`} key={block.hash}>
                <g id={`block-${block.hash}`} className="cursor-pointer" style={{ filter: s.glow }}>
                  {/* Outer halo */}
                  <rect x={x-23} y={y-23} width={46} height={46} rx={11}
                    fill="transparent" stroke={s.stroke} strokeWidth={1} opacity={0.15} />
                  {/* Body */}
                  <rect x={x-20} y={y-20} width={40} height={40} rx={8}
                    fill={s.fill} stroke={s.stroke} strokeWidth={s.sw}
                    className="transition-all duration-300" />
                  {/* Block index */}
                  <text x={x} y={y+5} textAnchor="middle" fill="white" fontSize={12} fontWeight="bold"
                    className="pointer-events-none select-none">{block.index}</text>
                  {/* Short hash */}
                  <text x={x} y={y+36} textAnchor="middle" fill="#4b5563" fontSize={9}
                    className="pointer-events-none select-none">{block.hash.substring(0,6)}..</text>
                  {/* Miner label */}
                  {block.minedBy && (
                    <text x={x} y={y-27} textAnchor="middle" fill={s.stroke} fontSize={8} opacity={0.7}
                      className="pointer-events-none select-none">{block.minedBy}</text>
                  )}
                  {/* Behavior badge */}
                  {badge && (
                    <text x={x+22} y={y-14} textAnchor="start" fill={badge.color} fontSize={12} fontWeight="bold"
                      className="pointer-events-none select-none">{badge.text}</text>
                  )}
                </g>
              </Link>
            );
          })}
        </g>

        {/* Fading annotations */}
        <g className="pointer-events-none">
          {annotations.map(ann => {
            const age   = tickCount - ann.bornTick;
            const alpha = Math.max(0, 1 - age / ANNOTATION_LIFETIME_TICKS);
            let ax = 80, ay = 60;

            if (ann.blockHash) {
              const block = blocks.find(b => b.hash === ann.blockHash);
              if (block) { const { x, y } = coords(block); ax = x; ay = y - 48; }
            }

            const maxLen  = 36;
            const text    = ann.label.length > maxLen ? ann.label.slice(0, maxLen) + "…" : ann.label;
            const pillW   = Math.min(text.length * 5.8 + 14, 230);

            return (
              <g key={ann.id} opacity={alpha}>
                <rect x={ax - 4} y={ay - 13} width={pillW} height={17} rx={5}
                  fill="#0f172a" stroke={ann.color} strokeWidth={0.8} opacity={0.9} />
                <text x={ax + 2} y={ay - 4} fill={ann.color} fontSize={9} fontFamily="monospace"
                  dominantBaseline="middle">{text}</text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
