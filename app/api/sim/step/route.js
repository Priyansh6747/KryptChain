import { getSimulation } from '@/lib/engine/global.js';

export async function POST(req) {
  const sim = getSimulation();
  sim.step();
  return Response.json({ success: true, state: sim.getState() });
}
