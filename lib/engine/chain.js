export class Chain {
  constructor() {
    this.blocks = [];
    this.orphan_blocks = [];
  }

  get tip() {
    if (this.blocks.length === 0) return null;
    return this.blocks[this.blocks.length - 1];
  }

  get length() {
    return this.blocks.length;
  }

  addBlock(block) {
    if (this.blocks.length === 0) {
      // Genesis block or first block seen
      this.blocks.push(block);
      return true;
    }

    const tip = this.tip;
    if (block.prev_hash === tip.hash && block.index === tip.index + 1) {
      this.blocks.push(block);
      this._processOrphans();
      return true;
    } else {
      // Store out-of-order or fork blocks
      if (!this.orphan_blocks.find(b => b.hash === block.hash)) {
         this.orphan_blocks.push(block);
      }
      return false;
    }
  }

  _processOrphans() {
    let added = true;
    while (added) {
      added = false;
      const tip = this.tip;
      const childIndex = this.orphan_blocks.findIndex(b => b.prev_hash === tip.hash && b.index === tip.index + 1);
      if (childIndex !== -1) {
        const block = this.orphan_blocks.splice(childIndex, 1)[0];
        this.blocks.push(block);
        added = true;
      }
    }
  }

  replaceChain(newBlocks) {
    this.blocks = [...newBlocks];
  }
}
