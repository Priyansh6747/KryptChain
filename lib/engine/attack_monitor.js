/**
 * AttackMonitor — Evaluates whether an ongoing attack is succeeding or failing
 * using the actual probability mechanics from the Bitcoin whitepaper (Nakamoto 2008).
 *
 * Key insight: attack success is NOT binary. It's probabilistic and depends on:
 *   - Chain depth (confirmations) at attack start
 *   - Attacker's fraction of total hash power
 *   - How many blocks the attacker has mined since injection
 */
export class AttackMonitor {
  constructor(simulation, attackType, config = {}) {
    this.sim          = simulation;
    this.attackType   = attackType;
    this.config       = config;
    this.startTick    = simulation.tickCount;
    this.attackerNodeId = config.attackerNodeId;
    this.targetTxId   = config.targetTxId || null;

    // Snapshot state at attack start for delta calculations
    this.startChainLength      = simulation.nodes[0]?.chain.length || 0;
    this.startOrphanRate       = this._orphanRate();
    this.startTotalOrphans     = simulation.nodes.reduce((s, n) => s + n.chain.orphan_blocks.length, 0);
    this.startReorgs           = simulation.totalReorgs;

    // Track reorg depths we observe
    this.maxReorgDepth         = 0;
    this.reorgsSinceInjection  = 0;

    this.status  = 'IN_PROGRESS';   // 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'PARTIAL'
    this.outcome = null;
    this.reason  = null;
  }

  // ─── Nakamoto (2008) double-spend success probability ────────────────────
  // P(attacker catches up from 0 when chain is z-blocks ahead)
  // Uses Poisson distribution to model attacker's progress while honest chain advances.
  nakamotoProb(q, z) {
    if (q <= 0) return 0;
    if (q >= 0.5) return 0.999; // majority always wins eventually
    const p  = 1 - q;
    const lambda = z * (q / p);

    // P(success) = 1 - Σ_{k=0}^{z} [ Poisson(k,λ) * (1 - (q/p)^(z-k)) ]
    let sum = 0;
    for (let k = 0; k <= z; k++) {
      const poisson = Math.exp(-lambda) * Math.pow(lambda, k) / this._factorial(k);
      const overtake = Math.pow(q / p, z - k);
      sum += poisson * (1 - overtake);
    }
    return Math.min(0.999, Math.max(0.001, 1 - sum));
  }

  _factorial(n) {
    if (n <= 1) return 1;
    let f = 1;
    for (let i = 2; i <= Math.min(n, 20); i++) f *= i; // cap at 20! to prevent overflow
    return f;
  }

  _orphanRate() {
    const totalBlocks  = this.sim.nodes.reduce((s, n) => s + n.chain.blocks.length, 0);
    const totalOrphans = this.sim.nodes.reduce((s, n) => s + n.chain.orphan_blocks.length, 0);
    return totalBlocks > 0 ? totalOrphans / totalBlocks : 0;
  }

  _attackerHashFraction() {
    const attacker = this.sim.nodes.find(n => n.id === this.attackerNodeId);
    if (!attacker) return 0;
    const total = this.sim.nodes.reduce((s, n) => s + n.hashPower, 0);
    return total > 0 ? attacker.hashPower / total : 0;
  }

  _txStillInChain() {
    if (!this.targetTxId) return true;
    const chain = this.sim.nodes[0]?.chain.blocks || [];
    return chain.some(b => b.transactions.some(t => t.id === this.targetTxId));
  }

  tick() {
    if (this.status !== 'IN_PROGRESS') return;

    const elapsed    = this.sim.tickCount - this.startTick;
    const newReorgs  = this.sim.totalReorgs - this.startReorgs;
    this.reorgsSinceInjection = newReorgs;

    // Track max reorg depth from events
    const recentReorgEvents = this.sim.events.filter(e =>
      e.type === 'REORG' && e.tick >= this.startTick
    );
    for (const ev of recentReorgEvents) {
      if ((ev.metadata?.depth || 0) > this.maxReorgDepth) {
        this.maxReorgDepth = ev.metadata.depth;
      }
    }

    switch (this.attackType) {
      case 'double_spend':  this._evaluateDoubleSpend(elapsed);  break;
      case 'selfish_mining':this._evaluateSelfishMining(elapsed); break;
      case 'partition':     this._evaluatePartition(elapsed);     break;
      case 'byzantine_flood': this._evaluateByzantine(elapsed);  break;
    }
  }

  _evaluateDoubleSpend(elapsed) {
    const q = this._attackerHashFraction();
    const z = this.startChainLength;

    // Attack fails fast if probability is vanishingly small
    if (z > 6 && q < 0.35 && elapsed > 5) {
      this.status  = 'FAILED';
      this.outcome = `Chain depth ${z} blocks was too deep — attacker's ${(q*100).toFixed(0)}% hash power insufficient`;
      this.reason  = 'CHAIN_TOO_DEEP';
      return;
    }

    // Attack succeeded if target tx was reorged out
    if (!this._txStillInChain() && elapsed > 3) {
      this.status  = 'SUCCEEDED';
      this.outcome = `Transaction erased from canonical chain via ${this.maxReorgDepth}-block reorg. ${(q*100).toFixed(0)}% hash power was enough to overcome ${z}-block depth.`;
      this.reason  = 'TX_REORGED';
      return;
    }

    // Timeout: attacker couldn't catch up
    if (elapsed > 60) {
      this.status  = 'FAILED';
      this.outcome = `Attack timed out after 60 ticks. Chain grew ${this.sim.nodes[0]?.chain.length - this.startChainLength} more blocks — attacker fell too far behind.`;
      this.reason  = 'TIMED_OUT';
    }
  }

  _evaluateSelfishMining(elapsed) {
    if (elapsed < 10) return; // need baseline window
    const currentOrphanRate = this._orphanRate();
    const orphanDelta       = currentOrphanRate - this.startOrphanRate;
    const q                 = this._attackerHashFraction();

    // Selfish mining is mathematically profitable only if q > 1/3
    // With gamma=0 (no propagation advantage), threshold is 1/3
    if (q >= 1/3 && orphanDelta > 0.1) {
      this.status  = 'SUCCEEDED';
      this.outcome = `Selfish miner with ${(q*100).toFixed(0)}% hash power raised network orphan rate by ${(orphanDelta*100).toFixed(1)}%. Honest miners wasted ${(orphanDelta*100).toFixed(1)}% of their work.`;
      this.reason  = 'ORPHAN_RATE_ELEVATED';
      return;
    }

    if (q < 1/3 && elapsed > 40) {
      this.status  = 'FAILED';
      this.outcome = `Selfish miner with only ${(q*100).toFixed(0)}% hash power (needs >33%) could not sustain advantage. Orphan delta: ${(orphanDelta*100).toFixed(1)}%.`;
      this.reason  = 'INSUFFICIENT_HASHPOWER';
      return;
    }

    if (elapsed > 60) {
      this.status  = orphanDelta > 0.05 ? 'PARTIAL' : 'FAILED';
      this.outcome = `Inconclusive. Orphan rate changed by ${(orphanDelta*100).toFixed(1)}% over 60 ticks.`;
    }
  }

  _evaluatePartition(elapsed) {
    if (this.reorgsSinceInjection > 0 && elapsed > 10) {
      const depth = this.maxReorgDepth;
      this.status  = 'SUCCEEDED';
      this.outcome = `Network partition caused a ${depth}-block reorg when it healed. The shorter sub-chain was orphaned.`;
      this.reason  = 'PARTITION_REORG';
      return;
    }
    if (elapsed > 80) {
      this.status  = 'FAILED';
      this.outcome = 'Partition healed without a significant reorg.';
      this.reason  = 'NO_REORG';
    }
  }

  _evaluateByzantine(elapsed) {
    if (elapsed < 5) return;
    const totalBlocks    = this.sim.nodes.reduce((s,n) => s + n.chain.blocks.length, 0);
    const rejectedEvents = this.sim.events.filter(e => e.type === 'BLOCK_REJECTED' && e.tick >= this.startTick).length;
    const rejectionRate  = totalBlocks > 0 ? rejectedEvents / totalBlocks : 0;

    if (rejectionRate > 0.3) {
      this.status  = 'PARTIAL';
      this.outcome = `Byzantine flood degraded network: ${(rejectionRate*100).toFixed(0)}% of blocks rejected. Honest chain still intact.`;
      this.reason  = 'DEGRADED';
    } else if (elapsed > 50) {
      this.status  = 'FAILED';
      this.outcome = `Honest nodes rejected all byzantine blocks. Network integrity maintained.`;
      this.reason  = 'REJECTED_BY_CONSENSUS';
    }
  }

  // ─── Probability & state for UI ─────────────────────────────────────────
  getSuccessProbability() {
    const q = this._attackerHashFraction();
    const z = this.startChainLength;

    switch (this.attackType) {
      case 'double_spend':
        return this.nakamotoProb(q, Math.max(z, 1));
      case 'selfish_mining':
        // Profitable above 1/3: linear scale between 0 and 1 around that threshold
        if (q >= 0.5) return 0.99;
        if (q >= 1/3) return 0.4 + (q - 1/3) * 3; // 0.4 → 0.9 between 33% and 50%
        return Math.max(0.01, q * 1.2); // very low below 33%
      case 'partition':
        // Deeper chains when partition hits → bigger reorg potential
        return Math.min(0.95, 0.3 + (this.sim.nodes[0]?.chain.length || 1) * 0.02);
      case 'byzantine_flood':
        return 0.15; // byzantine floods rarely succeed in well-implemented chains
      default:
        return 0;
    }
  }

  getState() {
    const q      = this._attackerHashFraction();
    const depth  = this.sim.nodes[0]?.chain.length || 0;
    const elapsed = this.sim.tickCount - this.startTick;

    return {
      attackType:          this.attackType,
      status:              this.status,
      outcome:             this.outcome,
      reason:              this.reason,
      attackerNodeId:      this.attackerNodeId,
      startTick:           this.startTick,
      startChainLength:    this.startChainLength,
      currentChainLength:  depth,
      confirmationsGrown:  depth - this.startChainLength,
      attackerHashFraction: parseFloat((q * 100).toFixed(1)),
      successProbability:  parseFloat(this.getSuccessProbability().toFixed(4)),
      reorgsSinceInjection: this.reorgsSinceInjection,
      maxReorgDepth:       this.maxReorgDepth,
      ticksElapsed:        elapsed,
      txStillInChain:      this._txStillInChain(),
    };
  }
}
