import { getSimulation } from '@/lib/engine/global.js';

let snapshots = {};

export async function POST(req) {
  const sim = getSimulation();
  if (!sim) return Response.json({ success: false, error: 'No simulation running' });

  const body = await req.json();
  const action = body.action; // 'save' or 'restore'
  const name = body.name || 'default';

  if (action === 'save') {
    // Save the full simulation config + tick count so we can describe the snapshot
    snapshots[name] = {
      savedAt: new Date().toISOString(),
      tick: sim.tickCount,
      seed: sim.seed,
      consensusType: sim.consensusType,
      difficulty: sim.difficulty,
      numNodes: sim.numNodes,
      events: [...sim.events],
      scenarioName: sim.scenarioName || null,
    };
    return Response.json({ success: true, snapshot: name, tick: sim.tickCount });
  }

  if (action === 'list') {
    return Response.json({ success: true, snapshots: Object.keys(snapshots).map(k => ({ name: k, ...snapshots[k] })) });
  }

  return Response.json({ success: false, error: 'Unknown action. Use "save" or "list"' });
}
