/**
 * Account-based ledger for tracking balances across the chain.
 * Replayed from genesis on every chain switch (reorg) to guarantee correctness.
 */

const BLOCK_REWARD = 50;
const COINBASE_SENDER = 'COINBASE';

export class Ledger {
  constructor() {
    this.balances = new Map();
    this.processedBlockCount = 0;
  }

  /**
   * Rebuild the entire ledger from a sequence of blocks.
   * This is called after reorgs to ensure state integrity.
   */
  rebuildFromChain(blocks) {
    this.balances = new Map();
    this.processedBlockCount = 0;
    for (const block of blocks) {
      this._applyBlock(block);
    }
  }

  /**
   * Incrementally apply a single new block (when no reorg occurred).
   */
  applyBlock(block) {
    this._applyBlock(block);
  }

  _applyBlock(block) {
    // Block reward goes to the miner/validator
    const miner = block.validator || block.minedBy || null;
    if (miner) {
      this._credit(miner, BLOCK_REWARD);
    }

    // Process transactions
    for (const tx of block.transactions) {
      if (tx.sender !== COINBASE_SENDER) {
        this._debit(tx.sender, tx.amount);
      }
      this._credit(tx.receiver, tx.amount);
    }
    this.processedBlockCount++;
  }

  _credit(account, amount) {
    const current = this.balances.get(account) || 0;
    this.balances.set(account, current + amount);
  }

  _debit(account, amount) {
    const current = this.balances.get(account) || 0;
    this.balances.set(account, current - amount);
  }

  getBalance(account) {
    return this.balances.get(account) || 0;
  }

  /**
   * Check if a transaction is valid against current ledger state.
   * Returns { valid: boolean, reason?: string }
   */
  validateTransaction(tx) {
    if (!tx.sender || !tx.receiver) {
      return { valid: false, reason: 'Missing sender or receiver' };
    }
    if (tx.amount <= 0) {
      return { valid: false, reason: 'Non-positive amount' };
    }
    if (tx.sender === tx.receiver) {
      return { valid: false, reason: 'Self-transfer' };
    }
    // In simulation mode, we allow deficit spending for user accounts
    // but flag it. Real chains would reject here.
    const balance = this.getBalance(tx.sender);
    if (balance < tx.amount) {
      return { valid: true, reason: 'Insufficient balance (allowed in simulation)' };
    }
    return { valid: true };
  }

  /**
   * Get the full balance sheet as a plain object.
   */
  toJSON() {
    const obj = {};
    for (const [account, balance] of this.balances.entries()) {
      obj[account] = balance;
    }
    return obj;
  }
}

export { BLOCK_REWARD, COINBASE_SENDER };
