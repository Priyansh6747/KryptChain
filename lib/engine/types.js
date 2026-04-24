import { createHash } from './crypto.js';

export class Transaction {
  constructor(sender, receiver, amount, timestamp, idNonce) {
    this.sender = sender;
    this.receiver = receiver;
    this.amount = amount;
    this.timestamp = timestamp;
    // idNonce ensures uniqueness even if same exact tx happens at same ms
    this.id = createHash({ sender, receiver, amount, timestamp, idNonce });
  }
}

export class Block {
  constructor(index, prev_hash, transactions, timestamp, nonce = 0, validator = null) {
    this.index = index;
    this.prev_hash = prev_hash;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.nonce = nonce; // For PoW
    this.validator = validator; // For PoS
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return createHash({
      index: this.index,
      prev_hash: this.prev_hash,
      timestamp: this.timestamp,
      transactions: this.transactions.map(t => t.id),
      nonce: this.nonce,
      validator: this.validator
    });
  }
}
