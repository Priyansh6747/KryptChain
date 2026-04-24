import { getSimulation } from '@/lib/engine/global.js';

export async function GET() {
  const sim = getSimulation();
  if (!sim || !sim.attackMonitor) return Response.json({ success: true, attackStatus: null });
  return Response.json({ success: true, attackStatus: sim.attackMonitor.getState() });
}
