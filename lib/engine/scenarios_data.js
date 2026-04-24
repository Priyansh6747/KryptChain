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
  }
};
