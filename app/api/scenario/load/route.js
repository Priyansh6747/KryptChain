import { setSimulation } from '@/lib/engine/global.js';
import { scenarios } from '@/lib/engine/scenarios_data.js';

export async function POST(req) {
  const body = await req.json();
  const script = scenarios[body.scenario];
  if (!script) return Response.json({ success: false, error: "Scenario not found" }, { status: 404 });

  const sim = setSimulation({
    nodes: script.config.nodes,
    consensus: script.config.consensus,
    difficulty: script.config.difficulty,
    autoGenerateTxs: script.config.autoGenerateTxs,
    tickIntervalMs: script.config.tickIntervalMs
  });
  
  sim.setScenario(body.scenario);

  return Response.json({ success: true, state: sim.getState() });
}
