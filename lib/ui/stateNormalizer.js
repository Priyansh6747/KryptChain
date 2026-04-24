export function normalizeGraphData(state) {
  if (!state || !state.canonicalChain) return { blocks: [], edges: [] };

  const blocksMap = new Map();
  const edges = [];

  // 1. Map Canonical Blocks
  state.canonicalChain.forEach((b) => {
    blocksMap.set(b.hash, {
      ...b,
      isCanonical: true,
      branchIndex: 0,
    });
  });

  // 2. Map all known blocks to find orphans/forks
  const allBlocks = [];
  state.nodes.forEach((n) => {
    if (n.blocks) allBlocks.push(...n.blocks);
    if (n.orphans) allBlocks.push(...n.orphans);
  });

  allBlocks.sort((a, b) => a.index - b.index);

  allBlocks.forEach((b) => {
    if (!blocksMap.has(b.hash)) {
      blocksMap.set(b.hash, {
        ...b,
        isCanonical: false,
        branchIndex: -1
      });
    }
  });

  const finalBlocks = Array.from(blocksMap.values());
  
  // 3. Assign Branch Index for Y-axis plotting
  const indexUsage = new Map();
  finalBlocks.forEach(b => {
    if (b.isCanonical) {
      indexUsage.set(b.index, 1);
    }
  });

  finalBlocks.forEach(b => {
    if (!b.isCanonical) {
      let used = indexUsage.get(b.index) || 1;
      b.branchIndex = used;
      indexUsage.set(b.index, used + 1);
    }
  });

  // 4. Build Edges (Parent -> Child)
  finalBlocks.forEach(b => {
    if (b.prev_hash && blocksMap.has(b.prev_hash)) {
      const parent = blocksMap.get(b.prev_hash);
      edges.push({
        id: `${b.prev_hash}->${b.hash}`,
        source: b.prev_hash,
        target: b.hash,
        isCanonical: b.isCanonical && parent.isCanonical
      });
    }
  });

  return { blocks: finalBlocks, edges };
}
