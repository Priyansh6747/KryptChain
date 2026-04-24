import { getSimulation } from '@/lib/engine/global.js';

export async function POST(req) {
  const body = await req.json();
  const sim = getSimulation();
  if (!sim) return Response.json({ success: false, error: "Not running" }, { status: 400 });

  sim.network.setConfig(body);
  return Response.json({ success: true, config: sim.network.config });
}
