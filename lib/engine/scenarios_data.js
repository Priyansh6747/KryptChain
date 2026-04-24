export const scenarios = {
  double_spend: {
    name: "Double Spend Attack",
    description: "An attacker creates a transaction, waits for it to be confirmed, then mines a private fork without the transaction. If their hash power is high enough, they release the fork to reorganize the chain and erase the transaction.",
    config: {
      nodes: 5,
      consensus: 'pow',
      autoGenerateTxs: false,
      tickIntervalMs: 500,
      difficulty: 2
    },
    timeline: [
      { tick: 2, action: 'set_hash_power', payload: { nodeId: 'node-1', hashPower: 1000 }, description: 'Attacker node-1 acquires massive hash power' },
      { tick: 5, action: 'inject_tx', payload: { sender: 'Attacker', receiver: 'Exchange', amount: 100 }, description: 'Attacker sends 100 KRYPT to Exchange' },
      { tick: 8, action: 'set_behavior', payload: { nodeId: 'node-1', behavior: 'selfish' }, description: 'Attacker node-1 begins mining a private chain' },
      { tick: 45, action: 'release_chain', payload: { nodeId: 'node-1' }, description: 'Attacker node-1 unleashes private chain to trigger reorg' }
    ]
  },
  selfish_mining: {
    name: "Selfish Mining",
    description: "A miner strategically withholds blocks to waste honest miners' power, releasing them only when the public chain approaches the length of their private chain.",
    config: { nodes: 5, consensus: 'pow', autoGenerateTxs: true, tickIntervalMs: 500, difficulty: 2 },
    timeline: [
      { tick: 2, action: 'set_hash_power', payload: { nodeId: 'node-0', hashPower: 800 }, description: 'Selfish miner acquires large hash power' },
      { tick: 5, action: 'set_behavior', payload: { nodeId: 'node-0', behavior: 'selfish' }, description: 'Node-0 begins selfish mining' }
    ]
  },
  split_brain: {
    name: "Network Partition",
    description: "The network suffers a routing failure, splitting into two isolated groups. Both mine independently. When the partition heals, the shorter chain is orphaned.",
    config: { nodes: 6, consensus: 'pow', autoGenerateTxs: true, tickIntervalMs: 500, difficulty: 2 },
    timeline: [
      { tick: 5, action: 'partition_network', payload: { groupA: ['node-0', 'node-1', 'node-2'], groupB: ['node-3', 'node-4', 'node-5'] }, description: 'Network splits into Group A and Group B' },
      { tick: 40, action: 'heal_partition', payload: {}, description: 'Network partition heals. Incoming blocks will trigger a massive reorg.' }
    ]
  },
  pos_centralization: {
    name: "PoS Centralization",
    description: "A single entity acquires a supermajority of the network stake. Observe how frequently they are chosen as the block validator compared to others.",
    config: { nodes: 5, consensus: 'pos', autoGenerateTxs: true, tickIntervalMs: 500 },
    timeline: [
      { tick: 5, action: 'set_stake', payload: { nodeId: 'node-0', stake: 100000 }, description: 'Node-0 acquires 99% of total network stake' }
    ]
  },
  majority_attack: {
    name: "51% Attack",
    description: "An attacker with >50% hash power takes over the chain. They can censor transactions and rewrite history. Security is economic, not absolute.",
    config: { nodes: 5, consensus: 'pow', autoGenerateTxs: true, tickIntervalMs: 500, difficulty: 2 },
    timeline: [
      { tick: 3, action: 'inject_tx', payload: { sender: 'Victim', receiver: 'Merchant', amount: 500 }, description: 'Victim sends 500 KRYPT to Merchant' },
      { tick: 5, action: 'set_hash_power', payload: { nodeId: 'node-0', hashPower: 5000 }, description: 'Attacker acquires 51%+ hash power' },
      { tick: 5, action: 'set_behavior', payload: { nodeId: 'node-0', behavior: 'selfish' }, description: 'Attacker begins private mining' },
      { tick: 10, action: 'set_hash_power', payload: { nodeId: 'node-1', hashPower: 5 }, description: 'Honest miners lose hash power share' },
      { tick: 10, action: 'set_hash_power', payload: { nodeId: 'node-2', hashPower: 5 }, description: 'Honest miners lose hash power share' },
      { tick: 10, action: 'set_hash_power', payload: { nodeId: 'node-3', hashPower: 5 }, description: 'Honest miners lose hash power share' },
      { tick: 10, action: 'set_hash_power', payload: { nodeId: 'node-4', hashPower: 5 }, description: 'Honest miners lose hash power share' },
      { tick: 30, action: 'release_chain', payload: { nodeId: 'node-0' }, description: 'Attacker unleashes majority chain — entire network reorgs' }
    ]
  },
  high_latency: {
    name: "High Latency Network",
    description: "What happens when block propagation takes 10+ ticks? Forks emerge naturally as miners race without knowing about each other's blocks. Tests finality assumptions.",
    config: { nodes: 8, consensus: 'pow', autoGenerateTxs: true, tickIntervalMs: 300, difficulty: 2 },
    timeline: [
      { tick: 2, action: 'set_network_config', payload: { baseLatency: 10, jitter: 5, dropRate: 0.05 }, description: 'Network degrades: 10-15 tick latency, 5% drop rate' },
    ]
  },
  byzantine_flood: {
    name: "Byzantine Flood",
    description: "Multiple nodes go byzantine simultaneously, flooding the network with invalid blocks. Tests how well honest nodes reject garbage and maintain chain integrity.",
    config: { nodes: 8, consensus: 'pow', autoGenerateTxs: true, tickIntervalMs: 400, difficulty: 2 },
    timeline: [
      { tick: 3, action: 'set_behavior', payload: { nodeId: 'node-2', behavior: 'byzantine' }, description: 'Node-2 goes byzantine' },
      { tick: 3, action: 'set_behavior', payload: { nodeId: 'node-3', behavior: 'byzantine' }, description: 'Node-3 goes byzantine' },
      { tick: 3, action: 'set_behavior', payload: { nodeId: 'node-4', behavior: 'byzantine' }, description: 'Node-4 goes byzantine' },
      { tick: 3, action: 'set_hash_power', payload: { nodeId: 'node-2', hashPower: 500 }, description: 'Byzantine nodes mine aggressively' },
      { tick: 3, action: 'set_hash_power', payload: { nodeId: 'node-3', hashPower: 500 }, description: 'Byzantine nodes mine aggressively' },
      { tick: 3, action: 'set_hash_power', payload: { nodeId: 'node-4', hashPower: 500 }, description: 'Byzantine nodes mine aggressively' },
    ]
  }
};
