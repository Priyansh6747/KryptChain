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

    // Network-level metrics
    this.stats = {
      totalSent: 0,
      totalDelivered: 0,
      totalDropped: 0,
      totalPartitionDropped: 0,
      deliveryLatencies: [] // rolling window of last 100
    };
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
    this.stats.totalSent++;

    if (this.config.partition) {
      const fromA = this.config.partition.groupA.includes(fromNode.id);
      const toA = this.config.partition.groupA.includes(toNode.id);
      const fromB = this.config.partition.groupB.includes(fromNode.id);
      const toB = this.config.partition.groupB.includes(toNode.id);
      
      if ((fromA && toB) || (fromB && toA)) {
        this.stats.totalPartitionDropped++;
        return; // Complete network partition drop
      }
    }

    if (this.rng.random() < this.config.dropRate) {
      this.stats.totalDropped++;
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
      this.stats.totalDelivered++;
      const latency = currentTick - msg.createdAt;
      this.stats.deliveryLatencies.push(latency);
      if (this.stats.deliveryLatencies.length > 100) {
        this.stats.deliveryLatencies.shift();
      }

      if (msg.type === 'TX') {
        msg.toNode.receiveTransaction(msg.payload, globalState);
      } else if (msg.type === 'BLOCK') {
        msg.toNode.receiveBlock(msg.payload, consensus, globalState);
      }
    }

    return delivered.length;
  }

  get avgLatency() {
    if (this.stats.deliveryLatencies.length === 0) return 0;
    const sum = this.stats.deliveryLatencies.reduce((a, b) => a + b, 0);
    return sum / this.stats.deliveryLatencies.length;
  }

  get pendingCount() {
    return this.messages.length;
  }
}
