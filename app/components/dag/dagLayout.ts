import dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";

const NODE_WIDTH = 320;
const NODE_HEIGHT = 80;
const GAP_X = 20;
const GAP_Y = 20;

export function layoutDag<T extends Record<string, unknown>>(
	nodes: Node<T>[],
	edges: Edge[],
): Node<T>[] {
	if (nodes.length === 0) return [];

	// No edges: stack vertically
	if (edges.length === 0) {
		return nodes.map((node, i) => ({
			...node,
			position: { x: 0, y: i * (NODE_HEIGHT + GAP_Y) },
		}));
	}

	const g = new dagre.graphlib.Graph();
	g.setGraph({ rankdir: "BT", ranksep: 60, nodesep: 40 });
	g.setDefaultEdgeLabel(() => ({}));

	for (const node of nodes) {
		g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
	}

	for (const edge of edges) {
		g.setEdge(edge.source, edge.target);
	}

	dagre.layout(g);

	return nodes.map((node) => {
		const pos = g.node(node.id);
		return {
			...node,
			position: {
				x: pos.x - NODE_WIDTH / 2,
				y: pos.y - NODE_HEIGHT / 2,
			},
		};
	});
}
