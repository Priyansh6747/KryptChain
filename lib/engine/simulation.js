import { Node } from './node.js';
import { PoWEngine, PoSEngine } from './consensus.js';
import { Block, Transaction } from './types.js';
import { DeterministicRNG } from './crypto.js';
import { NetworkQueue } from './network.js';
import { ScenarioEngine } from './scenario.js';

export class Simulation {
  constructor(config = {}) {
    this.numNodes = config.nodes || 5;
    this.consensusType = config.consensus || 'pow'; 
    this.difficulty = config.difficulty || 2;
    this.seed = config.seed || 12345;
    this.autoGenerateTxs = config.autoGenerateTxs !== undefined ? config.autoGenerateTxs : true;
    
    this.rng = new DeterministicRNG(this.seed);
    this.network = new NetworkQueue(this.rng);
    this.nodes = [];
    this.tickCount = 0;
    this.isRunning = false;
    this.intervalId = null;
    this.tickIntervalMs = config.tickIntervalMs || 1000;
    this.metricsHistory = [];
    this.events = [];

    // Cumulative simulation stats
    this.totalReorgs = 0;
    this.totalBlocksMined = 0;
    this.totalTxsProcessed = 0;
    
    if (this.consensusType === 'pow') {
      this.consensus = new PoWEngine(this.difficulty);
    } else {
      this.consensus = new PoSEngine();
    }

    for (let i = 0; i < this.numNodes; i++) {
      const stake = this.rng.randomInt(10, 100);
      const hashPower = this.rng.randomInt(10, 100);
      this.nodes.push(new Node(`node-${i}`, this.rng.randomInt(0, 1000000), stake, hashPower));
    }

    const genesisBlock = new Block(0, "0".repeat(64), [], 0, 0, null);
    genesisBlock.hash = "0".repeat(64); 
    for (const node of this.nodes) {
      node.chain.blocks.push(genesisBlock);
    }
  }

  get globalState() {
    return {
      nodes: this.nodes.map(n => ({
        id: n.id,
        stake: n.stake,
        hashPower: n.hashPower
      })),
      emitEvent: (type, nodeId, metadata) => {
        this.events.push({
          type,
          tick: this.tickCount,
          timestamp: this.tickCount * 1000,
          nodeId,
          metadata
        });
        if (this.events.length > 1000) this.events.shift();
        
        // Track cumulative stats from events
        if (type === 'REORG') this.totalReorgs++;
      }
    };
  }

  setScenario(scenarioName) {
    this.scenarioEngine = new ScenarioEngine(this, scenarioName);
    this.scenarioName = scenarioName;
    this.globalState.emitEvent('SCENARIO_STARTED', 'SYSTEM', { scenario: scenarioName });
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.intervalId = setInterval(() => this.step(), this.tickIntervalMs);
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    clearInterval(this.intervalId);
    this.intervalId = null;
  }

  step() {
    this.tickCount++;
    const currentTimestamp = this.tickCount * 1000; 

    // 0. Process Network Queue (Deliver pending messages)
    this.network.deliver(this.tickCount, this.consensus, this.globalState);

    // 0.5 Run Scenario Script
    if (this.scenarioEngine) {
      this.scenarioEngine.tick(this.tickCount);
    }

    // 1. Generate txs
    if (this.autoGenerateTxs && this.rng.random() < 0.3) {
       const sender = `user-${this.rng.randomInt(1, 100)}`;
       const receiver = `user-${this.rng.randomInt(1, 100)}`;
       if (sender !== receiver) {
         const amount = this.rng.randomInt(1, 50);
         const tx = new Transaction(sender, receiver, amount, currentTimestamp, this.rng.randomInt(0, 100000));
         const targetNode = this.rng.randomElement(this.nodes);
         targetNode.receiveTransaction(tx, this.globalState);
         this.network.broadcast(targetNode, this.nodes, 'TX', tx, this.tickCount);
       }
    }

    // 2. Propose blocks
    const newBlocks = [];
    for (const node of this.nodes) {
      const blocks = node.proposeBlock(this.consensus, currentTimestamp, this.globalState);
      if (blocks && blocks.length > 0) {
        newBlocks.push(...blocks);
        for (const block of blocks) {
          this.globalState.emitEvent('BLOCK_MINED', node.id, { hash: block.hash, index: block.index });
          
          // Broadcast based on behavior
          if (node.behavior === 'honest' || node.behavior === 'byzantine') {
            this.network.broadcast(node, this.nodes, 'BLOCK', block, this.tickCount);
          } else if (node.behavior === 'selfish' && !node.isWithholding) {
            this.network.broadcast(node, this.nodes, 'BLOCK', block, this.tickCount);
          }
        }
      }
    }

    // 3. Record Metrics
    let txsMined = 0;
    for (const block of newBlocks) {
      txsMined += block.transactions.length;
    }
    this.totalBlocksMined += newBlocks.length;
    this.totalTxsProcessed += txsMined;

    const forkCount = this.nodes.reduce((sum, n) => sum + n.chain.orphan_blocks.length, 0);
    
    // Compute chain agreement: how many nodes share the same tip hash
    const tipCounts = {};
    for (const node of this.nodes) {
      const tipHash = node.chain.tip ? node.chain.tip.hash : 'none';
      tipCounts[tipHash] = (tipCounts[tipHash] || 0) + 1;
    }
    const maxAgreement = Math.max(...Object.values(tipCounts));
    const consensusRatio = maxAgreement / this.nodes.length;

    this.metricsHistory.push({
      tick: this.tickCount,
      tps: txsMined,
      blocksProduced: newBlocks.length,
      forkCount: forkCount,
      consensusRatio: consensusRatio,
      pendingMessages: this.network.pendingCount,
      avgNetworkLatency: parseFloat(this.network.avgLatency.toFixed(2))
    });

    if (this.metricsHistory.length > 120) {
      this.metricsHistory.shift();
    }
  }

  injectTransaction(sender, receiver, amount) {
    const tx = new Transaction(sender, receiver, amount, this.tickCount * 1000, this.rng.randomInt(0, 100000));
    if (this.nodes.length > 0) {
      const targetNode = this.nodes[0];
      targetNode.receiveTransaction(tx, this.globalState);
      this.network.broadcast(targetNode, this.nodes, 'TX', tx, this.tickCount);
    }
    return tx;
  }

  getState() {
    // Compute which tip is the global "canonical" one (majority agreement)
    const tipCounts = {};
    for (const node of this.nodes) {
      const tipHash = node.chain.tip ? node.chain.tip.hash : 'none';
      tipCounts[tipHash] = (tipCounts[tipHash] || 0) + 1;
    }
    const canonicalTip = Object.entries(tipCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';

    return {
      tickCount: this.tickCount,
      isRunning: this.isRunning,
      consensusType: this.consensusType,
      difficulty: this.difficulty,
      seed: this.seed,
      metricsHistory: this.metricsHistory,
      nodes: this.nodes.map(n => ({
        id: n.id,
        stake: n.stake,
        hashPower: n.hashPower,
        behavior: n.behavior,
        mempoolSize: n.mempool.length,
        chainTip: n.chain.tip ? n.chain.tip.index : -1,
        chainTipHash: n.chain.tip ? n.chain.tip.hash : null,
        chainLength: n.chain.length,
        orphanCount: n.chain.orphan_blocks.length,
        isWithholding: n.isWithholding,
        privateChainLength: n.privateChain.length,
        stats: n.stats,
        // Top 5 balances from this node's ledger
        topBalances: Object.entries(n.ledger.toJSON())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([account, balance]) => ({ account, balance })),
        // Send last 100 blocks + orphans for graph building
        blocks: n.chain.blocks.slice(-100),
        orphans: n.chain.orphan_blocks.slice(-100)
      })),
      canonicalChain: this.nodes[0] ? this.nodes[0].chain.blocks.slice(-100) : [],
      canonicalTip,
      mempools: this.nodes.map(n => n.mempool),
      globalMempool: this.nodes[0] ? this.nodes[0].mempool : [],
      scenarioName: this.scenarioName || null,
      networkStats: {
        pendingMessages: this.network.pendingCount,
        avgLatency: parseFloat(this.network.avgLatency.toFixed(2)),
        totalSent: this.network.stats.totalSent,
        totalDelivered: this.network.stats.totalDelivered,
        totalDropped: this.network.stats.totalDropped,
        totalPartitionDropped: this.network.stats.totalPartitionDropped,
        config: this.network.config
      },
      globalStats: {
        totalReorgs: this.totalReorgs,
        totalBlocksMined: this.totalBlocksMined,
        totalTxsProcessed: this.totalTxsProcessed
      }
    };
  }
}
