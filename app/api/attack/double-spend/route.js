import { getSimulation } from '@/lib/engine/global.js';

export async function POST(req) {
  const sim = getSimulation();
  if (!sim) return Response.json({ success: false });

  const node = sim.nodes[1];
  if (!node) return Response.json({ success: false });

  node.behavior = 'selfish';
  sim.globalState.emitEvent('ATTACK_TRIGGERED', node.id, { attack: 'selfish-mining' });

  return Response.json({ success: true });
}
