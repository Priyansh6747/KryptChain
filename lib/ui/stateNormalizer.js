export function normalizeGraphData(state) {
  if (!state || !state.canonicalChain) return { blocks: [], edges: [] };

  const blocksMap = new Map();
  const edges     = [];

  // Build behavior lookup: nodeId → behavior
  const behaviorMap = {};
  state.nodes?.forEach(n => { behaviorMap[n.id] = n.behavior || "honest"; });

  // Build a miner map: blockHash → { minedBy, behavior }
  // We scan all nodes' block lists to tag each block with its author
  const minerMap = {};
  state.nodes?.forEach(n => {
    const tag = (b) => {
      if (!minerMap[b.hash]) {
        minerMap[b.hash] = { minedBy: n.id, behavior: n.behavior || "honest" };
      }
    };
    n.blocks?.forEach(tag);
    n.orphans?.forEach(tag);
  });

  // 1. Canonical chain — branchIndex 0
  state.canonicalChain.forEach(b => {
    const miner = minerMap[b.hash] || {};
    blocksMap.set(b.hash, {
      ...b,
      isCanonical: true,
      branchIndex: 0,
      minedBy:     miner.minedBy  || b.minedBy  || null,
      behavior:    miner.behavior || "honest",
    });
  });

  // 2. All other blocks (orphans / forks from every node's view)
  const allBlocks = [];
  state.nodes?.forEach(n => {
    if (n.blocks)  allBlocks.push(...n.blocks);
    if (n.orphans) allBlocks.push(...n.orphans);
  });
  allBlocks.sort((a, b) => a.index - b.index);

  allBlocks.forEach(b => {
    if (!blocksMap.has(b.hash)) {
      const miner = minerMap[b.hash] || {};
      blocksMap.set(b.hash, {
        ...b,
        isCanonical: false,
        branchIndex: -1,
        minedBy:     miner.minedBy  || b.minedBy  || null,
        behavior:    miner.behavior || "honest",
      });
    }
  });

  const finalBlocks = Array.from(blocksMap.values());

  // 3. Assign branch indices for Y-axis layout
  const indexUsage = new Map();
  finalBlocks.forEach(b => {
    if (b.isCanonical) indexUsage.set(b.index, 1);
  });
  finalBlocks.forEach(b => {
    if (!b.isCanonical) {
      const used    = indexUsage.get(b.index) || 1;
      b.branchIndex = used;
      indexUsage.set(b.index, used + 1);
    }
  });

  // 4. Build parent→child edges
  finalBlocks.forEach(b => {
    if (b.prev_hash && blocksMap.has(b.prev_hash)) {
      const parent = blocksMap.get(b.prev_hash);
      edges.push({
        id:          `${b.prev_hash}->${b.hash}`,
        source:      b.prev_hash,
        target:      b.hash,
        isCanonical: b.isCanonical && parent.isCanonical,
        behavior:    b.behavior || "honest",
      });
    }
  });

  return { blocks: finalBlocks, edges };
}
