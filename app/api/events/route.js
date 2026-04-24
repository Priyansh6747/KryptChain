import { getSimulation } from '../../../../lib/engine/global.js';

export async function GET() {
  const sim = getSimulation();
  if (!sim) return Response.json({ success: false, events: [] });
  return Response.json({ success: true, events: sim.events });
}
