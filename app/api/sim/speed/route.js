import { getSimulation } from '@/lib/engine/global.js';

export async function POST(req) {
  const body = await req.json();
  const sim = getSimulation();
  if (!sim) return Response.json({ success: false });

  if (body.tickIntervalMs) {
    sim.tickIntervalMs = body.tickIntervalMs;
    if (sim.isRunning) {
      sim.stop();
      sim.start();
    }
  }
  return Response.json({ success: true, tickIntervalMs: sim.tickIntervalMs });
}
