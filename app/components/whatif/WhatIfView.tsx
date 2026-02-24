import { useMemo } from "react";
import {
	ReactFlow,
	Background,
	type Node,
	type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTranslation } from "react-i18next";
import { WHATIF_COMMANDS, type JjCommit, type GitCommit, type WhatIfPrediction } from "~/shared";
import { CommitNode } from "../dag/CommitNode";
import { GitCommitNode } from "../dag/GitCommitNode";
import { layoutDag } from "../dag/dagLayout";
import { ClientOnly } from "~/components/client-only";

const nodeTypes = { commit: CommitNode, gitCommit: GitCommitNode };

function buildJjGraph(commits: JjCommit[]) {
	const nodes: Node[] = commits.map((c) => ({
		id: c.commitId,
		type: "commit",
		position: { x: 0, y: 0 },
		data: { ...c, label: c.changeId },
	}));

	const edges: Edge[] = [];
	for (const commit of commits) {
		for (const parentId of commit.parents) {
			if (commits.some((c) => c.commitId === parentId)) {
				edges.push({
					id: `${parentId}-${commit.commitId}`,
					source: parentId,
					target: commit.commitId,
					style: { stroke: "#a78bfa", strokeWidth: 2 },
				});
			}
		}
	}

	return { nodes: layoutDag(nodes, edges), edges };
}

function buildGitGraph(commits: GitCommit[]) {
	const nodes: Node[] = commits.map((c) => ({
		id: c.hash,
		type: "gitCommit",
		position: { x: 0, y: 0 },
		data: { ...c, label: c.hashShort },
	}));

	const edges: Edge[] = [];
	for (const commit of commits) {
		for (const parentHash of commit.parents) {
			if (commits.some((c) => c.hash === parentHash)) {
				edges.push({
					id: `${parentHash}-${commit.hash}`,
					source: parentHash,
					target: commit.hash,
					style: { stroke: "#fb923c", strokeWidth: 2 },
				});
			}
		}
	}

	return { nodes: layoutDag(nodes, edges), edges };
}

// Category labels are now translated via i18n: t("category.<key>")

const FIT_OPTIONS = { padding: 0.2, minZoom: 0.7, maxZoom: 1 };

export function WhatIfView({
	selectedCmd,
	prediction,
	onSelectCmd,
}: {
	selectedCmd: string | null;
	prediction: WhatIfPrediction | null;
	onSelectCmd: (cmdId: string) => void;
}) {
	const { t } = useTranslation("whatif");
	const beforeGraph = useMemo(
		() => (prediction ? buildJjGraph(prediction.beforeCommits) : null),
		[prediction],
	);

	const afterGraph = useMemo(
		() => (prediction ? buildJjGraph(prediction.afterCommits) : null),
		[prediction],
	);

	const gitBeforeGraph = useMemo(
		() => (prediction ? buildGitGraph(prediction.gitBeforeCommits) : null),
		[prediction],
	);

	const gitAfterGraph = useMemo(
		() => (prediction ? buildGitGraph(prediction.gitAfterCommits) : null),
		[prediction],
	);

	const grouped = useMemo(() => {
		const map = new Map<string, typeof WHATIF_COMMANDS>();
		for (const cmd of WHATIF_COMMANDS) {
			const list = map.get(cmd.category) ?? [];
			list.push(cmd);
			map.set(cmd.category, list);
		}
		return map;
	}, []);

	return (
		<div className="p-6 h-full flex flex-col">
			<h2 className="text-lg font-bold mb-2">{t("title")}</h2>
			<p className="text-xs text-text-muted mb-4">
				{t("desc")}
			</p>

			<div className="flex gap-6 flex-1 min-h-0">
				{/* Left: command list */}
				<div className="w-56 shrink-0 overflow-y-auto space-y-4">
					{[...grouped.entries()].map(([category, cmds]) => (
						<div key={category}>
							<div className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1 px-2">
								{t(`category.${category}`, category)}
							</div>
							<div className="space-y-0.5">
								{cmds.map((cmd) => (
									<button
										key={cmd.id}
										type="button"
										onClick={() => onSelectCmd(cmd.id)}
										className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
											selectedCmd === cmd.id
												? "bg-jj-purple text-white"
												: "text-text-primary hover:bg-surface-raised"
										}`}
									>
										<div className="font-mono font-bold">{t(`cmd.${cmd.id}.displayName`, cmd.displayName)}</div>
										<div className={`text-[10px] mt-0.5 leading-relaxed ${selectedCmd === cmd.id ? "text-purple-300" : "text-text-dim"}`}>
											{t(`cmd.${cmd.id}.desc`)}
										</div>
									</button>
								))}
							</div>
						</div>
					))}
				</div>

				{/* Right: prediction detail */}
				<div className="flex-1 flex flex-col gap-3 min-h-0">
					{prediction ? (
						<ClientOnly
							fallback={
								<div className="flex items-center justify-center h-32 text-text-dim">
									Loading...
								</div>
							}
						>
							<>
								{/* Explanation */}
								<div className="bg-jj-blue/8 rounded-lg p-4 border border-jj-blue/20 shrink-0">
									<div className="flex items-center gap-3 mb-1">
										<div className="font-mono text-sm font-bold text-jj-purple">
											$ {prediction.command.command}
										</div>
										<div className="text-[10px] text-text-dim">≈</div>
										<div className="font-mono text-sm font-bold text-git-orange">
											{t(prediction.gitEquivalent)}
										</div>
									</div>
									<div className="text-xs text-text-muted mb-2">
										{t(`cmd.${prediction.command.id}.desc`)}
									</div>
									<div className="text-xs text-text-primary border-t border-jj-blue/20 pt-2">
										{t(prediction.explanation)}
									</div>
								</div>

								{/* 4-column DAGs: jj Before → After │ git Before → After */}
								<div className="flex-1 min-h-0 flex flex-col">
									{/* Headers */}
									<div className="flex gap-2 mb-1 shrink-0">
										<div className="flex-1 flex items-center gap-3">
											<span className="bg-jj-purple text-white px-1.5 py-0.5 rounded text-[10px] font-bold">jj</span>
											<span className="text-xs font-bold text-jj-purple">Before</span>
										</div>
										<div className="w-4" />
										<div className="flex-1">
											<span className="text-xs font-bold text-jj-purple">After</span>
										</div>
										<div className="w-4" />
										<div className="flex-1 flex items-center gap-3">
											<span className="bg-git-orange text-white px-1.5 py-0.5 rounded text-[10px] font-bold">git</span>
											<span className="text-xs font-bold text-git-orange">Before</span>
										</div>
										<div className="w-4" />
										<div className="flex-1">
											<span className="text-xs font-bold text-git-orange">After</span>
										</div>
									</div>

									{/* DAG panels */}
									<div className="flex gap-2 flex-1 min-h-0">
										{/* jj Before */}
										<div className="flex-1 border rounded-lg relative overflow-hidden">
											{beforeGraph && (
												<ReactFlow
													nodes={beforeGraph.nodes}
													edges={beforeGraph.edges}
													nodeTypes={nodeTypes}
													fitView
													fitViewOptions={FIT_OPTIONS}
													minZoom={0.2}
													maxZoom={1}
													proOptions={{ hideAttribution: true }}
													nodesDraggable={false}
													nodesConnectable={false}
													elementsSelectable={false}
												>
													<Background color="#14151f" gap={20} />
												</ReactFlow>
											)}
										</div>

										<div className="flex items-center text-lg text-text-dim">→</div>

										{/* jj After */}
										<div className="flex-1 border-2 border-jj-purple/30 rounded-lg relative overflow-hidden">
											{afterGraph && (
												<ReactFlow
													nodes={afterGraph.nodes}
													edges={afterGraph.edges}
													nodeTypes={nodeTypes}
													fitView
													fitViewOptions={FIT_OPTIONS}
													minZoom={0.2}
													maxZoom={1}
													proOptions={{ hideAttribution: true }}
													nodesDraggable={false}
													nodesConnectable={false}
													elementsSelectable={false}
												>
													<Background color="#2a1f4e" gap={20} />
												</ReactFlow>
											)}
										</div>

										<div className="flex items-center text-lg text-text-dim">│</div>

										{/* git Before */}
										<div className="flex-1 border rounded-lg relative overflow-hidden">
											{gitBeforeGraph && gitBeforeGraph.nodes.length > 0 ? (
												<ReactFlow
													nodes={gitBeforeGraph.nodes}
													edges={gitBeforeGraph.edges}
													nodeTypes={nodeTypes}
													fitView
													fitViewOptions={FIT_OPTIONS}
													minZoom={0.2}
													maxZoom={1}
													proOptions={{ hideAttribution: true }}
													nodesDraggable={false}
													nodesConnectable={false}
													elementsSelectable={false}
												>
													<Background color="#2a1f0e" gap={20} />
												</ReactFlow>
											) : (
												<div className="flex items-center justify-center h-full text-xs text-text-dim bg-git-orange/8 p-3 text-center">
													{t("noCommits")}
												</div>
											)}
										</div>

										<div className="flex items-center text-lg text-text-dim">→</div>

										{/* git After */}
										<div className="flex-1 border-2 border-git-orange/30 rounded-lg relative overflow-hidden">
											{gitAfterGraph && gitAfterGraph.nodes.length > 0 ? (
												<ReactFlow
													nodes={gitAfterGraph.nodes}
													edges={gitAfterGraph.edges}
													nodeTypes={nodeTypes}
													fitView
													fitViewOptions={FIT_OPTIONS}
													minZoom={0.2}
													maxZoom={1}
													proOptions={{ hideAttribution: true }}
													nodesDraggable={false}
													nodesConnectable={false}
													elementsSelectable={false}
												>
													<Background color="#2a1f0e" gap={20} />
												</ReactFlow>
											) : (
												<div className="flex items-center justify-center h-full text-xs text-text-dim bg-git-orange/8 p-3 text-center">
													{t("noCommits")}
												</div>
											)}
										</div>
									</div>
								</div>
							</>
						</ClientOnly>
					) : (
						<div className="flex-1 flex items-center justify-center text-text-dim text-sm">
							{t("emptyState")}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
