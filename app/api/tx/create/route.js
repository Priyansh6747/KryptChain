import { getSimulation } from '../../../../lib/engine/global.js';

export async function POST(req) {
  const body = await req.json();
  const sim = getSimulation();
  const tx = sim.injectTransaction(body.sender, body.receiver, body.amount);
  return Response.json({ success: true, tx });
}
