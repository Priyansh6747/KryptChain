import { getSimulation } from '@/lib/engine/global.js';

export async function POST() {
  const sim = getSimulation();
  if (!sim) return Response.json({ success: false });
  sim.clearAttack();
  return Response.json({ success: true });
}
