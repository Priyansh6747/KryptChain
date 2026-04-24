export class NetworkMessage {
  constructor(id, fromNode, toNode, type, payload, delay, createdAt) {
    this.id = id;
    this.fromNode = fromNode;
    this.toNode = toNode;
    this.type = type; // "TX" | "BLOCK"
    this.payload = payload;
    this.delay = delay;
    this.createdAt = createdAt;
  }
}

export class NetworkQueue {
  constructor(rng) {
    this.rng = rng;
    this.messages = [];
    this.config = {
      baseLatency: 2, // ticks
      jitter: 1,      // ticks
      dropRate: 0.0,   // 0.0 to 1.0
      partition: null // { groupA: [], groupB: [] }
    };
    this.messageIdCounter = 0;
  }

  setConfig(config) {
    if (config.baseLatency !== undefined) this.config.baseLatency = config.baseLatency;
    if (config.jitter !== undefined) this.config.jitter = config.jitter;
    if (config.dropRate !== undefined) this.config.dropRate = config.dropRate;
    if (config.partition !== undefined) this.config.partition = config.partition;
  }

  broadcast(fromNode, allNodes, type, payload, currentTick) {
    for (const toNode of allNodes) {
      if (fromNode.id === toNode.id) continue;
      this.send(fromNode, toNode, type, payload, currentTick);
    }
  }

  send(fromNode, toNode, type, payload, currentTick) {
    if (this.config.partition) {
      const fromA = this.config.partition.groupA.includes(fromNode.id);
      const toA = this.config.partition.groupA.includes(toNode.id);
      const fromB = this.config.partition.groupB.includes(fromNode.id);
      const toB = this.config.partition.groupB.includes(toNode.id);
      
      if ((fromA && toB) || (fromB && toA)) {
        return; // Complete network partition drop
      }
    }

    if (this.rng.random() < this.config.dropRate) {
      return; // Message dropped
    }
    const delay = this.config.baseLatency + this.rng.randomInt(0, this.config.jitter);
    const msg = new NetworkMessage(
      `msg-${this.messageIdCounter++}`,
      fromNode,
      toNode,
      type,
      payload,
      delay,
      currentTick
    );
    this.messages.push(msg);
  }

  deliver(currentTick, consensus, globalState) {
    const remaining = [];
    const delivered = [];

    for (const msg of this.messages) {
      if (currentTick >= msg.createdAt + msg.delay) {
        delivered.push(msg);
      } else {
        remaining.push(msg);
      }
    }

    this.messages = remaining;

    for (const msg of delivered) {
      if (msg.type === 'TX') {
        msg.toNode.receiveTransaction(msg.payload, globalState);
      } else if (msg.type === 'BLOCK') {
        msg.toNode.receiveBlock(msg.payload, consensus, globalState);
      }
    }
  }
}
