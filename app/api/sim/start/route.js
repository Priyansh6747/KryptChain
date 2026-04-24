import { getSimulation } from '@/lib/engine/global.js';

export async function POST(req) {
  const sim = getSimulation();
  sim.start();
  return Response.json({ success: true });
}
