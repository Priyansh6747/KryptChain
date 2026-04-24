import { getSimulation } from '@/lib/engine/global.js';

export async function GET() {
  const sim = getSimulation();
  return Response.json(sim.getState());
}
