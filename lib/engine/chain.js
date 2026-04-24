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
      return { added: true, reorg: null };
    }

    const tip = this.tip;
    if (block.prev_hash === tip.hash && block.index === tip.index + 1) {
      this.blocks.push(block);
      this._processOrphans();
      return { added: true, reorg: null };
    } else {
      // Store out-of-order or fork blocks
      if (!this.orphan_blocks.find(b => b.hash === block.hash)) {
         this.orphan_blocks.push(block);
      }
      return this._evaluateTip();
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

  _evaluateTip() {
    let bestTip = this.tip;
    let bestLength = this.blocks.length;

    for (const orphan of this.orphan_blocks) {
      const path = [];
      let current = orphan;
      let connected = false;
      let commonAncestorIndex = -1;

      while (current) {
        path.unshift(current);
        const parentInCanonical = this.blocks.find(b => b.hash === current.prev_hash);
        if (parentInCanonical) {
          connected = true;
          commonAncestorIndex = parentInCanonical.index;
          break;
        }
        current = this.orphan_blocks.find(b => b.hash === current.prev_hash);
      }

      if (connected) {
        const totalLength = (commonAncestorIndex + 1) + path.length;
        if (totalLength > bestLength) {
          bestLength = totalLength;
          bestTip = orphan;
        }
      }
    }

    if (bestTip !== this.tip) {
      // Trigger Reorg
      const path = [];
      let current = bestTip;
      let commonAncestorIndex = -1;

      while (current) {
        path.unshift(current);
        const parentInCanonical = this.blocks.find(b => b.hash === current.prev_hash);
        if (parentInCanonical) {
          commonAncestorIndex = parentInCanonical.index;
          break;
        }
        current = this.orphan_blocks.find(b => b.hash === current.prev_hash);
      }

      const replacedBlocks = this.blocks.splice(commonAncestorIndex + 1);
      this.blocks.push(...path);
      
      this.orphan_blocks.push(...replacedBlocks);
      this.orphan_blocks = this.orphan_blocks.filter(o => !path.find(p => p.hash === o.hash));

      return { added: true, reorg: { replacedBlocks, newBlocks: path, depth: replacedBlocks.length } };
    }

    return { added: false, reorg: null };
  }
}
