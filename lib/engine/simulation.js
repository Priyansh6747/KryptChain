import { Node } from './node.js';
import { PoWEngine, PoSEngine } from './consensus.js';
import { Block, Transaction } from './types.js';
import { DeterministicRNG } from './crypto.js';

export class Simulation {
  constructor(config = {}) {
    this.numNodes = config.nodes || 5;
    this.consensusType = config.consensus || 'pow'; 
    this.difficulty = config.difficulty || 2;
    this.seed = config.seed || 12345;
    this.autoGenerateTxs = config.autoGenerateTxs !== undefined ? config.autoGenerateTxs : true;
    
    this.rng = new DeterministicRNG(this.seed);
    this.nodes = [];
    this.tickCount = 0;
    this.isRunning = false;
    this.intervalId = null;
    this.tickIntervalMs = config.tickIntervalMs || 1000;
    this.metricsHistory = [];
    
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
      }))
    };
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

    // 1. Generate txs
    if (this.autoGenerateTxs && this.rng.random() < 0.3) {
       const sender = `user-${this.rng.randomInt(1, 100)}`;
       const receiver = `user-${this.rng.randomInt(1, 100)}`;
       const amount = this.rng.randomInt(1, 50);
       const tx = new Transaction(sender, receiver, amount, currentTimestamp, this.rng.randomInt(0, 100000));
       const targetNode = this.rng.randomElement(this.nodes);
       targetNode.receiveTransaction(tx);
    }

    // 2. Gossip txs
    const allTxs = new Map();
    for (const node of this.nodes) {
      for (const tx of node.mempool) {
        allTxs.set(tx.id, tx);
      }
    }
    for (const node of this.nodes) {
      for (const tx of allTxs.values()) {
        node.receiveTransaction(tx);
      }
    }

    // 3. Propose blocks
    const newBlocks = [];
    for (const node of this.nodes) {
      const block = node.proposeBlock(this.consensus, currentTimestamp, this.globalState);
      if (block) {
        newBlocks.push(block);
      }
    }

    // 4. Propagate blocks
    for (const block of newBlocks) {
      for (const node of this.nodes) {
        node.receiveBlock(block, this.consensus, this.globalState);
      }
    }

    // 5. Sync chains
    for (const node of this.nodes) {
      node.syncChain(this.nodes.filter(n => n !== node), this.consensus);
    }

    // 6. Record Metrics
    let txsMined = 0;
    for (const block of newBlocks) {
      txsMined += block.transactions.length;
    }
    const forkCount = this.nodes.reduce((sum, n) => sum + n.chain.orphan_blocks.length, 0);
    
    this.metricsHistory.push({
      tick: this.tickCount,
      tps: txsMined,
      blocksProduced: newBlocks.length,
      forkCount: forkCount
    });

    if (this.metricsHistory.length > 60) {
      this.metricsHistory.shift();
    }
  }

  injectTransaction(sender, receiver, amount) {
    const tx = new Transaction(sender, receiver, amount, this.tickCount * 1000, this.rng.randomInt(0, 100000));
    if (this.nodes.length > 0) {
      this.nodes[0].receiveTransaction(tx);
    }
    return tx;
  }

  getState() {
    return {
      tickCount: this.tickCount,
      isRunning: this.isRunning,
      metricsHistory: this.metricsHistory,
      nodes: this.nodes.map(n => ({
        id: n.id,
        stake: n.stake,
        hashPower: n.hashPower,
        mempoolSize: n.mempool.length,
        chainTip: n.chain.tip ? n.chain.tip.index : -1,
        chainLength: n.chain.length,
        orphanCount: n.chain.orphan_blocks.length,
        // Send last 100 blocks + orphans for graph building
        blocks: n.chain.blocks.slice(-100),
        orphans: n.chain.orphan_blocks.slice(-100)
      })),
      canonicalChain: this.nodes[0] ? this.nodes[0].chain.blocks.slice(-100) : [],
      mempools: this.nodes.map(n => n.mempool),
      globalMempool: this.nodes[0] ? this.nodes[0].mempool : []
    };
  }
}
