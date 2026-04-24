import { Block } from './types.js';
import { DeterministicRNG } from './crypto.js';

export class ConsensusEngine {
  proposeBlock(node, mempool, prevBlock, timestamp, globalState) {
    throw new Error("Not implemented");
  }

  validateBlock(block, prevBlock, globalState) {
    throw new Error("Not implemented");
  }

  selectChain(chains) {
    throw new Error("Not implemented");
  }
}

export class PoWEngine extends ConsensusEngine {
  constructor(difficulty) {
    super();
    this.difficulty = difficulty;
    // For example, difficulty 2 means hash must start with "00"
    this.target = "0".repeat(difficulty);
  }

  proposeBlock(node, mempool, prevBlock, timestamp, globalState) {
    const index = prevBlock ? prevBlock.index + 1 : 0;
    const prevHash = prevBlock ? prevBlock.hash : "0".repeat(64);
    
    // Simulate mining by attempting `node.hashPower` hashes per tick
    for (let i = 0; i < node.hashPower; i++) {
       const nonce = node.rng.randomInt(0, Number.MAX_SAFE_INTEGER);
       const block = new Block(index, prevHash, mempool.slice(0, 10), timestamp, nonce, null);
       if (block.hash.startsWith(this.target)) {
         return block; // Successfully mined a block
       }
    }
    return null;
  }

  validateBlock(block, prevBlock, globalState) {
    if (prevBlock && block.prev_hash !== prevBlock.hash) return false;
    if (prevBlock && block.index !== prevBlock.index + 1) return false;
    if (!block.hash.startsWith(this.target)) return false;
    
    // Verify hash is actually correct
    if (block.hash !== block.calculateHash()) return false;
    return true;
  }

  selectChain(chains) {
    // Longest chain rule for PoW
    return chains.reduce((best, current) => {
      if (!best) return current;
      return current.length > best.length ? current : best;
    }, null);
  }
}

export class PoSEngine extends ConsensusEngine {
  constructor() {
    super();
  }

  proposeBlock(node, mempool, prevBlock, timestamp, globalState) {
    const totalStake = globalState.nodes.reduce((sum, n) => sum + n.stake, 0);
    if (totalStake === 0) return null;

    // Deterministically select validator based on timestamp and prevHash
    const slotSeed = prevBlock ? parseInt(prevBlock.hash.substring(0, 8), 16) + timestamp : timestamp;
    const rng = new DeterministicRNG(slotSeed);
    
    let pointer = rng.random() * totalStake;
    let selectedNodeId = null;
    for (const n of globalState.nodes) {
      pointer -= n.stake;
      if (pointer <= 0) {
        selectedNodeId = n.id;
        break;
      }
    }

    if (node.id === selectedNodeId) {
      const index = prevBlock ? prevBlock.index + 1 : 0;
      const prevHash = prevBlock ? prevBlock.hash : "0".repeat(64);
      
      const block = new Block(index, prevHash, mempool.slice(0, 10), timestamp, 0, node.id);
      return block;
    }
    
    return null;
  }

  validateBlock(block, prevBlock, globalState) {
    if (prevBlock && block.prev_hash !== prevBlock.hash) return false;
    if (prevBlock && block.index !== prevBlock.index + 1) return false;
    if (!block.validator) return false;
    if (block.hash !== block.calculateHash()) return false;
    
    const totalStake = globalState.nodes.reduce((sum, n) => sum + n.stake, 0);
    if (totalStake === 0) return false;

    const timestamp = block.timestamp;
    const slotSeed = prevBlock ? parseInt(prevBlock.hash.substring(0, 8), 16) + timestamp : timestamp;
    const rng = new DeterministicRNG(slotSeed);
    
    let pointer = rng.random() * totalStake;
    let expectedValidator = null;
    for (const n of globalState.nodes) {
      pointer -= n.stake;
      if (pointer <= 0) {
        expectedValidator = n.id;
        break;
      }
    }

    return block.validator === expectedValidator;
  }

  selectChain(chains) {
    // Longest chain rule for PoS as well (simplified)
    return chains.reduce((best, current) => {
      if (!best) return current;
      return current.length > best.length ? current : best;
    }, null);
  }
}
