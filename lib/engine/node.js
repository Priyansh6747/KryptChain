import { Chain } from './chain.js';
import { DeterministicRNG } from './crypto.js';
import { Ledger } from './ledger.js';

const MEMPOOL_MAX_SIZE = 200;

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
    this.forkChainLength = 0; // canonical chain length when withholding started
    this.ledger = new Ledger();

    // Per-node stats
    this.stats = {
      blocksProposed: 0,
      blocksReceived: 0,
      blocksRejected: 0,
      reorgsExperienced: 0,
      txsReceived: 0,
      txsRejected: 0
    };
  }

  receiveTransaction(tx, globalState) {
    // Byzantine nodes corrupt a COPY, not the original object
    if (this.behavior === 'byzantine' && this.rng.random() < 0.2) {
      // Clone and mangle — don't pollute the shared reference
      tx = { ...tx, amount: -999 };
    }

    // Validate: reject negative/zero amounts
    if (tx.amount <= 0) {
      this.stats.txsRejected++;
      globalState.emitEvent('TX_REJECTED', this.id, { txId: tx.id, reason: 'Non-positive amount' });
      return false;
    }

    // Deduplicate against mempool
    if (this.mempool.find(t => t.id === tx.id)) {
      return false;
    }

    // Deduplicate against chain
    for (const block of this.chain.blocks) {
       if (block.transactions.find(t => t.id === tx.id)) {
         return false;
       }
    }

    // Mempool size cap
    if (this.mempool.length >= MEMPOOL_MAX_SIZE) {
      this.mempool.shift(); // Drop oldest
    }

    this.mempool.push(tx);
    this.stats.txsReceived++;
    return true;
  }

  receiveBlock(block, consensus, globalState) {
    // Reject blocks we already have
    if (this.chain.blocks.find(b => b.hash === block.hash)) {
      return false;
    }
    if (this.chain.orphan_blocks.find(b => b.hash === block.hash)) {
      return false;
    }

    let prevBlock = null;
    if (block.index > 0) {
      prevBlock = this.chain.blocks.find(b => b.hash === block.prev_hash) || 
                  this.chain.orphan_blocks.find(b => b.hash === block.prev_hash);
    }
    
    if (block.index > 0 && !prevBlock) {
      // Orphan block — store without validation (we can't validate without parent)
    } else {
      const isValid = consensus.validateBlock(block, prevBlock, globalState);
      if (!isValid) {
        this.stats.blocksRejected++;
        globalState.emitEvent('BLOCK_REJECTED', this.id, { hash: block.hash, reason: 'Invalid consensus rules' });
        return false;
      }
    }

    const { added, reorg } = this.chain.addBlock(block);
    
    if (added) {
      this.stats.blocksReceived++;
      // Basic mempool cleanup
      this.mempool = this.mempool.filter(tx => !block.transactions.find(t => t.id === tx.id));
      // Incrementally apply to ledger
      this.ledger.applyBlock(block);
      globalState.emitEvent('BLOCK_RECEIVED', this.id, { hash: block.hash, index: block.index });
    }

    if (reorg) {
      this.stats.reorgsExperienced++;
      globalState.emitEvent('REORG', this.id, { depth: reorg.depth });
      
      // Rebuild ledger from the entire new canonical chain
      this.ledger.rebuildFromChain(this.chain.blocks);

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

      // Selfish miner clears private chain if honest network overtook the fork
      if (this.behavior === 'selfish') {
        const honestProgressSinceFork = this.chain.length - this.forkChainLength;
        if (honestProgressSinceFork >= this.privateChain.length && this.privateChain.length > 0) {
          // Honest network has caught up — abort private chain, restart from new tip
          this.privateChain = [];
          this.isWithholding = false;
          this.forkChainLength = 0;
        }
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

    // Tag the block with its miner for reward tracking
    block.minedBy = this.id;

    if (this.behavior === 'byzantine') {
      if (this.rng.random() < 0.3) {
        block.hash = "INVALID_HASH_12345";
      }
    }

    this.stats.blocksProposed++;

    if (this.behavior === 'selfish') {
      // Record the fork point when we first start withholding
      if (!this.isWithholding) {
        this.forkChainLength = this.chain.length;
      }
      this.privateChain.push(block);
      this.isWithholding = true;

      // Unleash when private chain is strictly longer than honest progress since fork.
      // this.chain.length grows as the node receives honest blocks — so
      // honestProgress = this.chain.length - this.forkChainLength
      const honestProgressSinceFork = this.chain.length - this.forkChainLength;
      if (this.privateChain.length > honestProgressSinceFork) {
        const unleashed = [...this.privateChain];
        this.privateChain   = [];
        this.isWithholding  = false;
        this.forkChainLength = 0;
        // Self-apply the private chain to trigger a reorg on this node
        for (const b of unleashed) {
           this.receiveBlock(b, consensus, globalState);
        }
        return unleashed;
      }
      return null; // still withholding
    }

    // Self-apply for honest/byzantine before broadcast
    this.receiveBlock(block, consensus, globalState);
    return [block];
  }

  unleashChain(consensus, globalState) {
    if (this.behavior === 'selfish' && this.privateChain.length > 0) {
      const unleashed   = [...this.privateChain];
      this.privateChain  = [];
      this.isWithholding = false;
      this.forkChainLength = 0;
      for (const b of unleashed) {
         this.receiveBlock(b, consensus, globalState);
      }
      return unleashed;
    }
    return null;
  }
}
