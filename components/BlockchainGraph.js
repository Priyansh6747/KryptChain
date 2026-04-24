"use client";
import { useEffect, useRef } from "react";
import anime from "animejs";
import Link from "next/link";

const X_SPACING = 120;
const Y_SPACING = 80;

export default function BlockchainGraph({ blocks, edges }) {
  const containerRef = useRef(null);
  const seenBlocks = useRef(new Set());
  const seenEdges = useRef(new Set());

  const maxIndex = Math.max(...blocks.map(b => b.index), 0);
  const maxBranch = Math.max(...blocks.map(b => b.branchIndex), 0);
  const width = Math.max(800, (maxIndex + 2) * X_SPACING);
  const height = Math.max(400, (maxBranch + 2) * Y_SPACING);

  useEffect(() => {
    const newBlockIds = blocks.filter(b => !seenBlocks.current.has(b.hash)).map(b => b.hash);
    const newEdgeIds = edges.filter(e => !seenEdges.current.has(e.id)).map(e => e.id);

    if (newBlockIds.length > 0) {
      anime({
        targets: newBlockIds.map(id => `[id="block-${id}"]`),
        scale: [0.5, 1],
        opacity: [0, 1],
        duration: 800,
        easing: "easeOutElastic(1, .8)",
      });
      newBlockIds.forEach(id => seenBlocks.current.add(id));
    }

    if (newEdgeIds.length > 0) {
      anime({
        targets: newEdgeIds.map(id => `[id="edge-${id.replace(/[^a-zA-Z0-9_-]/g, '')}"]`),
        strokeDashoffset: [anime.setDashoffset, 0],
        opacity: [0, 1],
        duration: 600,
        easing: "easeInOutSine",
      });
      newEdgeIds.forEach(id => seenEdges.current.add(id));
    }

    if (newBlockIds.length > 0 && containerRef.current) {
      // Smooth scroll to the end
      containerRef.current.scrollTo({
        left: containerRef.current.scrollWidth,
        behavior: 'smooth'
      });
    }
  }, [blocks, edges]);

  const getBlockCoords = (block) => {
    return {
      x: block.index * X_SPACING + 50,
      y: block.branchIndex * Y_SPACING + 100,
    };
  };

  return (
    <div 
      className="w-full h-full overflow-x-auto overflow-y-auto custom-scrollbar bg-gray-950 rounded-xl border border-gray-800 relative shadow-inner"
      ref={containerRef}
    >
      <svg width={width} height={height} className="min-h-full">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="25" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#4b5563" />
          </marker>
          <marker id="arrowhead-canon" markerWidth="10" markerHeight="7" refX="25" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
          </marker>
        </defs>

        <g className="edges">
          {edges.map((edge) => {
            const sourceBlock = blocks.find(b => b.hash === edge.source);
            const targetBlock = blocks.find(b => b.hash === edge.target);
            if (!sourceBlock || !targetBlock) return null;

            const { x: x1, y: y1 } = getBlockCoords(sourceBlock);
            const { x: x2, y: y2 } = getBlockCoords(targetBlock);

            const isCanon = edge.isCanonical;
            const pathId = `edge-${edge.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;

            const pathD = `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`;

            return (
              <path
                key={edge.id}
                id={pathId}
                d={pathD}
                fill="none"
                stroke={isCanon ? "#10b981" : "#4b5563"}
                strokeWidth={isCanon ? 3 : 2}
                markerEnd={isCanon ? "url(#arrowhead-canon)" : "url(#arrowhead)"}
                className="transition-colors duration-500"
              />
            );
          })}
        </g>

        <g className="blocks">
          {blocks.map((block) => {
            const { x, y } = getBlockCoords(block);
            const isCanon = block.isCanonical;
            
            return (
              <Link href={`/block/${block.hash}`} key={block.hash}>
                <g id={`block-${block.hash}`} className="cursor-pointer hover:opacity-80 transition-opacity">
                  <rect
                    x={x - 20}
                    y={y - 20}
                    width="40"
                    height="40"
                    rx="8"
                    fill={isCanon ? "#059669" : "#1f2937"}
                    stroke={isCanon ? "#34d399" : "#4b5563"}
                    strokeWidth="2"
                    className="transition-colors duration-500"
                  />
                  <text x={x} y={y + 4} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" className="pointer-events-none">
                    {block.index}
                  </text>
                  <text x={x} y={y + 35} textAnchor="middle" fill="#9ca3af" fontSize="10" className="pointer-events-none">
                    {block.hash.substring(0, 4)}..
                  </text>
                  {!isCanon && (
                     <text x={x + 25} y={y - 15} textAnchor="start" fill="#ef4444" fontSize="10" className="pointer-events-none font-bold">
                       Fork
                     </text>
                  )}
                </g>
              </Link>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
