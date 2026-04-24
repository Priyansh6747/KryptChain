import { getSimulation } from '@/lib/engine/global.js';

export async function GET(req) {
  const sim = getSimulation();
  if (!sim) return Response.json({ success: false });

  const { searchParams } = new URL(req.url);
  const nodeId = searchParams.get('nodeId') || sim.nodes[0]?.id;

  const node = sim.nodes.find(n => n.id === nodeId);
  if (!node) return Response.json({ success: false, error: 'Node not found' });

  return Response.json({
    success: true,
    nodeId: node.id,
    balances: node.ledger.toJSON(),
    processedBlocks: node.ledger.processedBlockCount
  });
}
