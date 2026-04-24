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
  }

  receiveTransaction(tx) {
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
    // Only basic validation here for early rejection.
    // The engine handles full validation before propagation, but peers also validate.
    let prevBlock = null;
    if (block.index > 0) {
      prevBlock = this.chain.blocks.find(b => b.hash === block.prev_hash) || 
                  this.chain.orphan_blocks.find(b => b.hash === block.prev_hash);
    }
    
    // Validate
    if (block.index > 0 && !prevBlock) {
      // Orphan block. We just store it.
    } else {
      const isValid = consensus.validateBlock(block, prevBlock, globalState);
      if (!isValid) return false;
    }

    const added = this.chain.addBlock(block);
    if (added) {
      // Remove mined txs from mempool
      this.mempool = this.mempool.filter(tx => !block.transactions.find(t => t.id === tx.id));
    }
    return added;
  }

  proposeBlock(consensus, timestamp, globalState) {
    const tip = this.chain.tip;
    return consensus.proposeBlock(this, this.mempool, tip, timestamp, globalState);
  }

  syncChain(peers, consensus) {
    const chains = [this.chain.blocks, ...peers.map(p => p.chain.blocks)];
    const bestChain = consensus.selectChain(chains);
    if (bestChain && bestChain !== this.chain.blocks) {
      this.chain.replaceChain(bestChain);
      // Clean mempool against new chain
      const newChainTxIds = new Set();
      for (const block of bestChain) {
        for (const tx of block.transactions) {
          newChainTxIds.add(tx.id);
        }
      }
      this.mempool = this.mempool.filter(tx => !newChainTxIds.has(tx.id));
    }
  }
}
