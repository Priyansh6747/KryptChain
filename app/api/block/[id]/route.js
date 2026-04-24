import { getSimulation } from '@/lib/engine/global.js';

export async function GET(req, { params }) {
  const { id } = await params;
  const sim = getSimulation();
  
  let foundBlock = null;
  for (const node of sim.nodes) {
    const block = node.chain.blocks.find(b => b.hash === id) || node.chain.orphan_blocks.find(b => b.hash === id);
    if (block) {
      foundBlock = block;
      break;
    }
  }

  if (foundBlock) {
    return Response.json({ success: true, block: foundBlock });
  } else {
    return Response.json({ success: false, error: "Block not found" }, { status: 404 });
  }
}
