import { setSimulation } from '@/lib/engine/global.js';

export async function POST(req) {
  const body = await req.json();
  const sim = setSimulation({
    nodes: body.nodes,
    consensus: body.consensus,
    difficulty: body.config?.difficulty,
    autoGenerateTxs: body.autoGenerateTxs !== undefined ? body.autoGenerateTxs : true,
    tickIntervalMs: 500 // Optional faster ticks
  });
  return Response.json({ success: true, state: sim.getState() });
}
