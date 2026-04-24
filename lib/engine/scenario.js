import { scenarios } from './scenarios_data.js';

export class ScenarioEngine {
  constructor(simulation, scenarioName) {
    this.sim = simulation;
    this.scenarioName = scenarioName;
    this.script = scenarios[scenarioName];
    if (!this.script) throw new Error(`Scenario ${scenarioName} not found`);
  }

  tick(currentTick) {
    if (!this.script.timeline) return;

    const events = this.script.timeline.filter(e => e.tick === currentTick);
    for (const event of events) {
      this.executeAction(event);
    }
  }

  executeAction(event) {
    const { action, payload, description } = event;
    
    this.sim.globalState.emitEvent('SCENARIO_STEP', 'SYSTEM', { action, description: description || action });

    switch(action) {
      case 'inject_tx':
        this.sim.injectTransaction(payload.sender, payload.receiver, payload.amount);
        break;
      case 'set_behavior': {
        const node = this.sim.nodes.find(n => n.id === payload.nodeId);
        if (node) node.behavior = payload.behavior;
        break;
      }
      case 'partition_network':
        this.sim.network.setConfig({ partition: { groupA: payload.groupA, groupB: payload.groupB } });
        break;
      case 'heal_partition':
        this.sim.network.setConfig({ partition: null });
        break;
      case 'release_chain': {
        const node = this.sim.nodes.find(n => n.id === payload.nodeId);
        if (node && node.unleashChain) {
           const blocks = node.unleashChain(this.sim.consensus, this.sim.globalState);
           if (blocks && blocks.length > 0) {
             for (const block of blocks) {
               this.sim.network.broadcast(node, this.sim.nodes, 'BLOCK', block, this.sim.tickCount);
             }
           }
        }
        break;
      }
      case 'set_hash_power': {
        const node = this.sim.nodes.find(n => n.id === payload.nodeId);
        if (node) node.hashPower = payload.hashPower;
        break;
      }
      case 'set_stake': {
        const node = this.sim.nodes.find(n => n.id === payload.nodeId);
        if (node) node.stake = payload.stake;
        break;
      }
    }
  }
}
