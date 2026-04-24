import { getSimulation } from '@/lib/engine/global.js';

export async function POST(req, { params }) {
  const { id } = await params;
  const body = await req.json();
  const sim = getSimulation();
  if (!sim) return Response.json({ success: false, error: "Not running" }, { status: 400 });

  const node = sim.nodes.find(n => n.id === id);
  if (node) {
    node.behavior = body.behavior;
    return Response.json({ success: true, node: node.id, behavior: node.behavior });
  }
  return Response.json({ success: false, error: "Node not found" }, { status: 404 });
}
