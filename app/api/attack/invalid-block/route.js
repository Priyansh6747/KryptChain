import { getSimulation } from '../../../../../lib/engine/global.js';
import { Block } from '../../../../../lib/engine/types.js';

export async function POST(req) {
  const sim = getSimulation();
  if (!sim) return Response.json({ success: false });

  const invalidBlock = new Block(9999, "bad_hash", [], sim.tickCount * 1000);
  invalidBlock.hash = "MALICIOUS_INVALID_HASH_123";
  
  sim.globalState.emitEvent('ATTACK_TRIGGERED', sim.nodes[0].id, { attack: 'invalid-block' });
  sim.network.broadcast(sim.nodes[0], sim.nodes, 'BLOCK', invalidBlock, sim.tickCount);

  return Response.json({ success: true });
}
