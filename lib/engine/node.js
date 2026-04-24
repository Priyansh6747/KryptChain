import { Chain } from './chain.js';
import { DeterministicRNG } from './crypto.js';

export class Node {
  constructor(id, seed, stake = 10, hashPower = 10) {
    this.id = id;
    this.chain = new Chain();
    this.mempool = [];
    this.stake = stake;
    this.hashPower = hashPower;
    this.rng = new DeterministicRNG(seed);
    this.behavior = 'honest'; // 'honest', 'selfish', 'byzantine'
    this.privateChain = [];
    this.isWithholding = false;
  }

  receiveTransaction(tx, globalState) {
    // If byzantine, randomly mangle the transaction (simulation of bad data)
    if (this.behavior === 'byzantine' && this.rng.random() < 0.2) {
      tx.amount = -999; 
    }

    if (!this.mempool.find(t => t.id === tx.id)) {
      let inChain = false;
      for (const block of this.chain.blocks) {
         if (block.transactions.find(t => t.id === tx.id)) {
           inChain = true;
           break;
         }
      }
      if (!inChain) {
        this.mempool.push(tx);
        return true;
      }
    }
    return false;
  }

  receiveBlock(block, consensus, globalState) {
    let prevBlock = null;
    if (block.index > 0) {
      prevBlock = this.chain.blocks.find(b => b.hash === block.prev_hash) || 
                  this.chain.orphan_blocks.find(b => b.hash === block.prev_hash);
    }
    
    if (block.index > 0 && !prevBlock) {
      // Orphan block. We just store it.
    } else {
      const isValid = consensus.validateBlock(block, prevBlock, globalState);
      if (!isValid) {
        globalState.emitEvent('BLOCK_REJECTED', this.id, { hash: block.hash, reason: 'Invalid consensus rules' });
        return false;
      }
    }

    const { added, reorg } = this.chain.addBlock(block);
    
    if (added) {
      // Basic mempool cleanup
      this.mempool = this.mempool.filter(tx => !block.transactions.find(t => t.id === tx.id));
      globalState.emitEvent('BLOCK_RECEIVED', this.id, { hash: block.hash, index: block.index });
    }

    if (reorg) {
      globalState.emitEvent('REORG', this.id, { depth: reorg.depth });
      
      // Return replaced txs to mempool
      for (const b of reorg.replacedBlocks) {
        for (const tx of b.transactions) {
          if (!this.mempool.find(t => t.id === tx.id)) {
            this.mempool.push(tx);
          }
        }
      }

      // Remove new txs from mempool
      const newChainTxIds = new Set();
      for (const b of reorg.newBlocks) {
        for (const tx of b.transactions) {
          newChainTxIds.add(tx.id);
        }
      }
      this.mempool = this.mempool.filter(tx => !newChainTxIds.has(tx.id));

      // Selfish miner clears private chain if public surpasses it
      if (this.behavior === 'selfish' && this.chain.length > this.privateChain.length) {
        this.privateChain = [];
        this.isWithholding = false;
      }
    }
    return added;
  }

  proposeBlock(consensus, timestamp, globalState) {
    const tip = this.behavior === 'selfish' && this.privateChain.length > 0 
                ? this.privateChain[this.privateChain.length - 1] 
                : this.chain.tip;

    let block = consensus.proposeBlock(this, this.mempool, tip, timestamp, globalState);
    if (!block) return null;

    if (this.behavior === 'byzantine') {
      if (this.rng.random() < 0.3) {
        block.hash = "INVALID_HASH_12345";
      }
    }

    if (this.behavior === 'selfish') {
      this.privateChain.push(block);
      this.isWithholding = true;
      // If our private chain is strictly longer than public, unleash it to cause a reorg
      if (this.privateChain.length > this.chain.length) {
        const unleashed = [...this.privateChain];
        this.privateChain = [];
        this.isWithholding = false;
        // Self-apply to trigger own reorg
        for (const b of unleashed) {
           this.receiveBlock(b, consensus, globalState);
        }
        return unleashed; // Simulation will broadcast array
      }
      return null; // Withhold
    }

    // Self-apply for honest/byzantine before broadcast
    this.receiveBlock(block, consensus, globalState);
    return [block];
  }

  unleashChain(consensus, globalState) {
    if (this.behavior === 'selfish' && this.privateChain.length > 0) {
      const unleashed = [...this.privateChain];
      this.privateChain = [];
      this.isWithholding = false;
      for (const b of unleashed) {
         this.receiveBlock(b, consensus, globalState);
      }
      return unleashed;
    }
    return null;
  }
}
