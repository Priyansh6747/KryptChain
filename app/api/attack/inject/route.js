import { getSimulation } from '@/lib/engine/global.js';

export async function POST(req) {
  const sim = getSimulation();
  if (!sim) return Response.json({ success: false, error: 'No simulation running' }, { status: 400 });
  if (sim.consensusType !== 'pow') {
    return Response.json({ success: false, error: 'Attack injection only supported in PoW mode' }, { status: 400 });
  }

  const body = await req.json();
  const { attackType, ...config } = body;

  if (!['double_spend', 'selfish_mining', 'partition', 'byzantine_flood'].includes(attackType)) {
    return Response.json({ success: false, error: 'Unknown attackType' }, { status: 400 });
  }

  const result = sim.injectAttack(attackType, config);
  if (!result) {
    return Response.json({ success: false, error: 'No eligible attacker node found' }, { status: 400 });
  }

  return Response.json({ success: true, attackStatus: result });
}
