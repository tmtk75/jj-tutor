import { useMemo, useState } from "react";
import {
	ReactFlow,
	Background,
	Controls,
	type Node,
	type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { JjCommit } from "~/shared";
import { CommitNode } from "../dag/CommitNode";
import { layoutDag } from "../dag/dagLayout";
import { ClientOnly } from "~/components/client-only";

const nodeTypes = { commit: CommitNode };
const FIT_OPTIONS = { padding: 0.2, minZoom: 0.7, maxZoom: 1 };

const PRESETS = [
	{ expr: "@", label: "@", desc: "ワーキングコピー" },
	{ expr: "@ | @-", label: "@ | @-", desc: "WC とその親" },
	{ expr: "ancestors(@, 3)", label: "ancestors(@,3)", desc: "WC から3世代" },
	{ expr: "heads(all())", label: "heads()", desc: "全ヘッド" },
	{ expr: "roots(all())", label: "roots()", desc: "ルート" },
	{ expr: "conflicts()", label: "conflicts()", desc: "コンフリクト中" },
	{ expr: "divergent()", label: "divergent()", desc: "divergent" },
	{ expr: "bookmarks()", label: "bookmarks()", desc: "ブックマーク付き" },
	{ expr: "mine()", label: "mine()", desc: "自分のコミット" },
	{ expr: "empty()", label: "empty()", desc: "空コミット" },
	{
		expr: 'description("fix")',
		label: 'desc("fix")',
		desc: '説明に "fix" を含む',
	},
	{ expr: "mutable()", label: "mutable()", desc: "変更可能" },
	{ expr: "immutable()", label: "immutable()", desc: "immutable" },
];

const REFERENCE: { func: string; desc: string; example: string }[] = [
	{ func: "@", desc: "ワーキングコピー", example: "@" },
	{ func: "@-", desc: "WC の親", example: "@-" },
	{ func: "@--", desc: "WC の祖父母", example: "@--" },
	{
		func: "ancestors(x, n)",
		desc: "x から n 世代の祖先",
		example: "ancestors(@, 5)",
	},
	{
		func: "descendants(x)",
		desc: "x の全子孫",
		example: "descendants(@-)",
	},
	{ func: "heads(x)", desc: "x のヘッド（子を持たない）", example: "heads(all())" },
	{
		func: "roots(x)",
		desc: "x のルート（親を持たない）",
		example: "roots(all())",
	},
	{ func: "all()", desc: "全コミット", example: "all()" },
	{ func: "conflicts()", desc: "コンフリクト中のコミット", example: "conflicts()" },
	{
		func: "divergent()",
		desc: "divergent な change",
		example: "divergent()",
	},
	{ func: "empty()", desc: "空コミット", example: "empty()" },
	{ func: "mine()", desc: "自分のコミット", example: "mine()" },
	{ func: "mutable()", desc: "変更可能なコミット", example: "mutable()" },
	{ func: "immutable()", desc: "変更不可なコミット", example: "immutable()" },
	{
		func: "bookmarks()",
		desc: "ブックマーク付きコミット",
		example: "bookmarks()",
	},
	{
		func: "description(x)",
		desc: "説明に x を含む",
		example: 'description("fix")',
	},
	{ func: "x | y", desc: "和集合（union）", example: "@ | @-" },
	{
		func: "x & y",
		desc: "積集合（intersection）",
		example: "mine() & conflicts()",
	},
	{
		func: "x ~ y",
		desc: "差集合（difference）",
		example: "all() ~ immutable()",
	},
	{ func: "x..y", desc: "x から y の間（range）", example: "@-..@" },
];

function buildJjGraph(
	commits: JjCommit[],
	matchedSet: Set<string> | null,
) {
	const nodes: Node[] = commits.map((c) => {
		const isMatch = matchedSet ? matchedSet.has(c.commitId) : false;
		return {
			id: c.commitId,
			type: "commit",
			position: { x: 0, y: 0 },
			data: {
				...c,
				label: c.changeId,
				_highlight: matchedSet && isMatch ? "match" : null,
				_dimmed: matchedSet ? !isMatch : false,
			},
		};
	});

	const edges: Edge[] = [];
	for (const commit of commits) {
		for (const parentId of commit.parents) {
			if (commits.some((c) => c.commitId === parentId)) {
				const isMatch =
					matchedSet &&
					matchedSet.has(commit.commitId) &&
					matchedSet.has(parentId);
				edges.push({
					id: `${parentId}-${commit.commitId}`,
					source: parentId,
					target: commit.commitId,
					style: {
						stroke: isMatch ? "#a78bfa" : "#484c60",
						strokeWidth: isMatch ? 2 : 1,
					},
				});
			}
		}
	}

	return { nodes: layoutDag(nodes, edges), edges };
}

export function RevsetView({
	commits,
	matchedIds,
	error,
	expr,
	currentInput,
	onSubmit,
}: {
	commits: JjCommit[];
	matchedIds: string[] | null;
	error: string | null;
	expr: string | null;
	currentInput: string;
	onSubmit: (revset: string) => void;
}) {
	const [input, setInput] = useState(currentInput || "@");
	const [refExpanded, setRefExpanded] = useState(false);

	const matchedSet = useMemo(
		() => (matchedIds ? new Set(matchedIds) : null),
		[matchedIds],
	);

	const graph = useMemo(
		() => buildJjGraph(commits, matchedSet),
		[commits, matchedSet],
	);

	const handlePreset = (presetExpr: string) => {
		setInput(presetExpr);
		onSubmit(presetExpr);
	};

	return (
		<div className="p-6 h-full flex flex-col">
			{/* Header */}
			<div className="mb-3 shrink-0">
				<h2 className="text-lg font-bold">Revset Playground</h2>
				<p className="text-xs text-text-muted">
					revset 式を入力すると、マッチするコミットを DAG
					上でハイライト表示します。
				</p>
			</div>

			{/* Input */}
			<form
				onSubmit={(e) => {
					e.preventDefault();
					onSubmit(input);
				}}
				className="flex gap-2 mb-2 shrink-0"
			>
				<div className="flex-1 relative">
					<span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim font-mono text-sm">
						jj log -r &apos;
					</span>
					<input
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						className="w-full border border-border-strong rounded-lg bg-surface-card text-text-primary pl-[6.5rem] pr-8 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-jj-purple/50 focus:border-jj-purple"
						placeholder="revset expression..."
					/>
					<span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim font-mono text-sm">
						&apos;
					</span>
				</div>
				<button
					type="submit"
					className="px-4 py-2 bg-jj-purple text-white rounded-lg text-sm font-bold hover:bg-jj-purple/90 transition-colors"
				>
					Run
				</button>
			</form>

			{/* Result status */}
			{expr && (
				<div className="mb-2 shrink-0">
					{error ? (
						<div className="bg-git-red/8 border border-git-red/20 rounded-lg px-3 py-2">
							<div className="text-xs font-bold text-git-red mb-1">
								Error
							</div>
							<pre className="text-[10px] text-git-red font-mono whitespace-pre-wrap leading-relaxed max-h-24 overflow-y-auto">
								{error}
							</pre>
						</div>
					) : (
						<div className="flex items-center gap-3 text-xs text-text-muted">
							<span className="font-mono bg-surface-raised px-2 py-0.5 rounded">
								$ jj log -r &apos;{expr}&apos;
							</span>
							<span className="font-bold text-jj-purple">
								{matchedIds?.length ?? 0} match
								{(matchedIds?.length ?? 0) !== 1 ? "es" : ""}
							</span>
						</div>
					)}
				</div>
			)}

			{/* Presets */}
			<div className="mb-3 shrink-0">
				<div className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">
					よく使う revset
				</div>
				<div className="flex flex-wrap gap-1.5">
					{PRESETS.map((p) => (
						<button
							key={p.expr}
							type="button"
							onClick={() => handlePreset(p.expr)}
							className={`px-2 py-1 rounded-md text-[11px] font-mono transition-colors ${
								expr === p.expr
									? "bg-jj-purple text-white"
									: "bg-surface-raised text-text-secondary hover:bg-surface-overlay"
							}`}
							title={p.desc}
						>
							{p.label}
						</button>
					))}
				</div>
			</div>

			{/* DAG */}
			<div className="flex-1 min-h-0 border border-border rounded-lg relative overflow-hidden">
				<ClientOnly
					fallback={
						<div className="flex items-center justify-center h-32 text-text-dim">
							Loading...
						</div>
					}
				>
					<ReactFlow
						nodes={graph.nodes}
						edges={graph.edges}
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
						<Controls showInteractive={false} />
					</ReactFlow>
				</ClientOnly>
			</div>

			{/* Legend */}
			{matchedSet && (
				<div className="flex items-center gap-4 mt-1 text-[10px] text-text-dim shrink-0">
					<span className="flex items-center gap-1">
						<span className="w-3 h-3 rounded border-2 border-jj-purple inline-block" />
						マッチ
					</span>
					<span className="flex items-center gap-1">
						<span className="w-3 h-3 rounded border border-border-strong inline-block opacity-40" />
						非マッチ
					</span>
				</div>
			)}

			{/* Reference (collapsible) */}
			<div className="mt-3 shrink-0 border border-border rounded-lg overflow-hidden">
				<button
					type="button"
					onClick={() => setRefExpanded(!refExpanded)}
					className="w-full flex items-center justify-between px-4 py-2 bg-surface hover:bg-surface-raised transition-colors cursor-pointer"
				>
					<span className="text-xs font-bold text-text-secondary">
						Revset リファレンス
					</span>
					<span className="text-xs text-text-dim">
						{refExpanded ? "▼" : "▶"}
					</span>
				</button>
				{refExpanded && (
					<div className="px-4 py-3 max-h-60 overflow-y-auto">
						<table className="w-full text-[11px]">
							<thead>
								<tr className="text-left text-text-dim border-b border-border">
									<th className="pb-1 font-semibold w-40">
										関数 / 演算子
									</th>
									<th className="pb-1 font-semibold">
										説明
									</th>
									<th className="pb-1 font-semibold w-36">
										例
									</th>
									<th className="pb-1 w-8" />
								</tr>
							</thead>
							<tbody>
								{REFERENCE.map((r) => (
									<tr
										key={r.func}
										className="border-b border-border hover:bg-surface"
									>
										<td className="py-1.5 font-mono text-jj-purple font-bold">
											{r.func}
										</td>
										<td className="py-1.5 text-text-secondary">
											{r.desc}
										</td>
										<td className="py-1.5 font-mono text-text-muted">
											{r.example}
										</td>
										<td className="py-1.5">
											<button
												type="button"
												onClick={() =>
													handlePreset(r.example)
												}
												className="text-[10px] text-jj-purple hover:text-jj-purple/70 font-bold"
												title="Try this"
											>
												Try
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
