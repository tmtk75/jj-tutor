import { useCallback, useMemo, useRef, useState } from "react";
import {
	ReactFlow,
	Background,
	Controls,
	type Node,
	type Edge,
	type NodeMouseHandler,
	type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { JjCommit, RebaseMode, RebasePrediction } from "~/shared";
import { CommitNode } from "../dag/CommitNode";
import { layoutDag } from "../dag/dagLayout";
import { ClientOnly } from "~/components/client-only";

const nodeTypes = { commit: CommitNode };

type Highlight = "source" | "dest" | "moved";

function buildJjGraph(
	commits: JjCommit[],
	highlights?: Map<string, Highlight>,
) {
	const nodes: Node[] = commits.map((c) => ({
		id: c.commitId,
		type: "commit",
		position: { x: 0, y: 0 },
		data: {
			...c,
			label: c.changeId,
			_highlight: highlights?.get(c.commitId) ?? null,
		},
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

const FIT_OPTIONS = { padding: 0.2, minZoom: 0.7, maxZoom: 1 };

function shiftToTop(rf: ReactFlowInstance, containerEl: HTMLElement | null) {
	setTimeout(() => {
		const nodes = rf.getNodes();
		if (nodes.length === 0) return;
		const minY = Math.min(...nodes.map((n) => n.position.y));
		const vp = rf.getViewport();
		const h = containerEl?.clientHeight ?? 600;
		const newY = h * 0.33 - minY * vp.zoom;
		rf.setViewport({ x: vp.x, y: newY, zoom: vp.zoom });
	}, 50);
}

const MODE_INFO: Record<
	RebaseMode,
	{ flag: string; label: string; desc: string }
> = {
	revision: {
		flag: "-r",
		label: "単一リビジョン",
		desc: "選択したコミットだけを移動。子は元の親に再接続。",
	},
	subtree: {
		flag: "-s",
		label: "サブツリー",
		desc: "コミットと子孫をまとめて移動。",
	},
	branch: {
		flag: "-b",
		label: "ブランチ",
		desc: "ブランチ全体を移動（共通祖先まで遡る）。",
	},
};

type SelectionStep = "source" | "dest";

function CopyableCmd({ cmd }: { cmd: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<button
			type="button"
			onClick={() => {
				navigator.clipboard.writeText(cmd);
				setCopied(true);
				setTimeout(() => setCopied(false), 1500);
			}}
			className="inline-flex items-center gap-1.5 font-mono text-xs bg-surface-raised hover:bg-surface-overlay text-text-primary px-2 py-1 rounded transition-colors cursor-pointer"
			title="Click to copy"
		>
			<span>$ {cmd}</span>
			<span className="text-[10px] text-text-dim">
				{copied ? "copied!" : "📋"}
			</span>
		</button>
	);
}

export function RebaseView({
	commits,
	prediction,
	existingConflicts,
	selectedMode,
	selectedSource,
	selectedDest,
	onModeChange,
	onSourceChange,
	onDestChange,
}: {
	commits: JjCommit[];
	prediction: RebasePrediction | null;
	existingConflicts: JjCommit[];
	selectedMode: RebaseMode;
	selectedSource: string;
	selectedDest: string;
	onModeChange: (mode: RebaseMode) => void;
	onSourceChange: (changeId: string) => void;
	onDestChange: (changeId: string) => void;
}) {
	const [selectionStep, setSelectionStep] = useState<SelectionStep>(
		selectedSource ? "dest" : "source",
	);

	const sourceCommit = commits.find((c) => c.changeId === selectedSource);
	const destCommit = commits.find((c) => c.changeId === selectedDest);
	const beforeDagRef = useRef<HTMLDivElement>(null);
	const afterDagRef = useRef<HTMLDivElement>(null);

	// Handle node click on the Before DAG
	const handleNodeClick: NodeMouseHandler = useCallback(
		(_event, node) => {
			const clickedCommit = commits.find(
				(c) => c.commitId === node.id,
			);
			if (!clickedCommit) return;
			if (
				clickedCommit.immutable ||
				clickedCommit.changeId === "zzzzzzzzzzzz"
			) {
				return;
			}

			const changeId = clickedCommit.changeId;

			if (selectionStep === "source") {
				// Click on current source to deselect
				if (changeId === selectedSource) {
					onSourceChange("");
					onDestChange("");
					return;
				}
				onSourceChange(changeId);
				// If dest is same as new source, clear dest
				if (changeId === selectedDest) {
					onDestChange("");
				}
				setSelectionStep("dest");
			} else {
				// Selecting dest
				// Click on current dest to deselect
				if (changeId === selectedDest) {
					onDestChange("");
					return;
				}
				// Click on source to switch back to source selection
				if (changeId === selectedSource) {
					setSelectionStep("source");
					return;
				}
				onDestChange(changeId);
			}
		},
		[
			commits,
			selectionStep,
			selectedSource,
			selectedDest,
			onSourceChange,
			onDestChange,
		],
	);

	// Build interactive Before graph (always shown)
	const beforeHighlights = useMemo(() => {
		const highlights = new Map<string, Highlight>();
		if (sourceCommit) highlights.set(sourceCommit.commitId, "source");
		if (destCommit) highlights.set(destCommit.commitId, "dest");
		return highlights;
	}, [sourceCommit, destCommit]);

	const beforeGraph = useMemo(
		() => buildJjGraph(commits, beforeHighlights),
		[commits, beforeHighlights],
	);

	// Build After graph (only when prediction exists)
	const afterGraph = useMemo(() => {
		if (!prediction || prediction.validationError) return null;
		const highlights = new Map<string, Highlight>();
		const movedCommit = prediction.afterCommits.find(
			(c) => c.changeId === selectedSource,
		);
		const dst = prediction.afterCommits.find(
			(c) => c.changeId === selectedDest,
		);
		if (movedCommit) highlights.set(movedCommit.commitId, "moved");
		if (dst) highlights.set(dst.commitId, "dest");
		return buildJjGraph(prediction.afterCommits, highlights);
	}, [prediction, selectedSource, selectedDest]);

	return (
		<div className="p-6 h-full flex flex-col">
			{/* Header */}
			<div className="flex items-start justify-between mb-3 shrink-0">
				<div>
					<h2 className="text-lg font-bold">Rebase</h2>
					<p className="text-xs text-text-muted">
						DAG 上のコミットをクリックして Source → Destination
						を選択。結果を予測表示します。
					</p>
				</div>
			</div>

			{/* Top bar: Mode + Selection state + Command */}
			<div className="flex items-center gap-4 mb-3 shrink-0 flex-wrap">
				{/* Mode pills */}
				<div className="flex items-center gap-1">
					<span className="text-[10px] font-bold text-text-dim uppercase mr-1">
						Mode
					</span>
					{(
						Object.entries(MODE_INFO) as [
							RebaseMode,
							(typeof MODE_INFO)[RebaseMode],
						][]
					).map(([mode, info]) => (
						<button
							key={mode}
							type="button"
							onClick={() => onModeChange(mode)}
							className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
								selectedMode === mode
									? "bg-jj-purple text-white"
									: "bg-surface-raised text-text-muted hover:bg-surface-overlay"
							}`}
							title={info.desc}
						>
							{info.flag} {info.label}
						</button>
					))}
				</div>

				<div className="w-px h-5 bg-border-strong" />

				{/* Selection indicators */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setSelectionStep("source")}
						className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
							selectionStep === "source"
								? "bg-green-400/8 border-2 border-green-400 text-green-400 font-bold"
								: "bg-surface border border-border text-text-secondary"
						}`}
					>
						<span className="w-2.5 h-2.5 rounded-sm bg-green-400 inline-block" />
						Source:
						{sourceCommit ? (
							<span className="font-mono">
								{sourceCommit.changeId.slice(0, 8)}
								{sourceCommit.isWorkingCopy ? " @" : ""}
							</span>
						) : (
							<span className="text-text-dim italic">
								クリックで選択
							</span>
						)}
						{sourceCommit && (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onSourceChange("");
									onDestChange("");
									setSelectionStep("source");
								}}
								className="text-text-dim hover:text-git-red ml-0.5"
								title="Clear"
							>
								×
							</button>
						)}
					</button>

					<span className="text-text-dim">→</span>

					<button
						type="button"
						onClick={() => {
							if (selectedSource) setSelectionStep("dest");
						}}
						className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
							selectionStep === "dest"
								? "bg-blue-400/8 border-2 border-blue-400 text-blue-400 font-bold"
								: "bg-surface border border-border text-text-secondary"
						} ${!selectedSource ? "opacity-50" : ""}`}
					>
						<span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block" />
						Dest:
						{destCommit ? (
							<span className="font-mono">
								{destCommit.changeId.slice(0, 8)}
								{destCommit.isWorkingCopy ? " @" : ""}
							</span>
						) : (
							<span className="text-text-dim italic">
								{selectedSource
									? "クリックで選択"
									: "Source を先に選択"}
							</span>
						)}
						{destCommit && (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onDestChange("");
								}}
								className="text-text-dim hover:text-git-red ml-0.5"
								title="Clear"
							>
								×
							</button>
						)}
					</button>
				</div>

				{/* Generated command */}
				{prediction && !prediction.validationError && (
					<>
						<div className="w-px h-5 bg-border-strong" />
						<CopyableCmd cmd={prediction.command} />
					</>
				)}
			</div>

			{/* Validation error */}
			{prediction?.validationError && (
				<div className="bg-amber-500/8 border border-amber-500/20 rounded-lg px-4 py-2 mb-3 shrink-0">
					<div className="text-xs text-amber-400">
						{prediction.validationError}
					</div>
				</div>
			)}

			{/* Explanation banner */}
			{prediction && !prediction.validationError && (
				<div className="bg-jj-blue/8 rounded-lg px-4 py-2.5 border border-jj-blue/20 shrink-0 mb-3">
					<div className="flex items-center gap-3 mb-1">
						<div className="font-mono text-sm font-bold text-jj-purple">
							$ {prediction.command}
						</div>
						<div className="text-[10px] text-text-dim">≈</div>
						<div className="font-mono text-sm font-bold text-git-orange">
							{prediction.gitEquivalent}
						</div>
					</div>
					<div className="text-xs text-text-primary">
						{prediction.explanation}
					</div>
				</div>
			)}

			{/* Main: DAG panels */}
			<div className="flex-1 min-h-0 flex flex-col">
				<ClientOnly
					fallback={
						<div className="flex items-center justify-center h-32 text-text-dim">
							Loading...
						</div>
					}
				>
					<>
						{/* Legend */}
						<div className="flex items-center gap-4 mb-1 text-[10px] text-text-dim shrink-0">
							<span className="flex items-center gap-1">
								<span className="w-3 h-3 rounded border-2 border-green-400 inline-block" />
								移動元 (source)
							</span>
							<span className="flex items-center gap-1">
								<span className="w-3 h-3 rounded border-2 border-blue-400 inline-block" />
								移動先 (dest)
							</span>
							{afterGraph && (
								<span className="flex items-center gap-1">
									<span className="w-3 h-3 rounded border-2 border-purple-400 inline-block" />
									移動後
								</span>
							)}
							<span className="ml-auto text-text-dim">
								{selectionStep === "source"
									? "コミットをクリックして Source を選択"
									: "コミットをクリックして Destination を選択"}
							</span>
						</div>

						{/* Headers */}
						<div className="flex gap-2 mb-1 shrink-0">
							<div className="flex-1 flex items-center gap-2">
								<span className="text-xs font-bold text-text-secondary">
									Before
								</span>
								<span className="text-[10px] text-text-dim">
									(クリックで選択)
								</span>
							</div>
							{afterGraph && (
								<>
									<div className="w-4" />
									<div className="flex-1">
										<span className="text-xs font-bold text-jj-purple">
											After
										</span>
									</div>
								</>
							)}
						</div>

						{/* DAG panels */}
						<div className="flex gap-2 flex-1 min-h-0">
							{/* Before (always shown, interactive) */}
							<div
								ref={beforeDagRef}
								className={`${afterGraph ? "flex-1" : "flex-1"} border-2 ${
									selectionStep === "source"
										? "border-green-300"
										: "border-blue-300"
								} rounded-lg relative overflow-hidden transition-colors`}
							>
								<ReactFlow
									nodes={beforeGraph.nodes}
									edges={beforeGraph.edges}
									nodeTypes={nodeTypes}
									onInit={(rf) => {
										rf.fitView(FIT_OPTIONS);
										shiftToTop(rf, beforeDagRef.current);
									}}
									minZoom={0.2}
									maxZoom={1}
									proOptions={{
										hideAttribution: true,
									}}
									nodesDraggable={false}
									nodesConnectable={false}
									elementsSelectable={false}
									onNodeClick={handleNodeClick}
								>
									<Background
										color="#14151f"
										gap={20}
									/>
									<Controls showInteractive={false} />
								</ReactFlow>
							</div>

							{afterGraph && (
								<>
									<div className="flex items-center text-lg text-text-dim">
										→
									</div>

									{/* After */}
									<div ref={afterDagRef} className="flex-1 border-2 border-jj-purple/30 rounded-lg relative overflow-hidden">
										<ReactFlow
											nodes={afterGraph.nodes}
											edges={afterGraph.edges}
											nodeTypes={nodeTypes}
											onInit={(rf) => {
												rf.fitView(FIT_OPTIONS);
												shiftToTop(rf, afterDagRef.current);
											}}
											minZoom={0.2}
											maxZoom={1}
											proOptions={{
												hideAttribution: true,
											}}
											nodesDraggable={false}
											nodesConnectable={false}
											elementsSelectable={false}
										>
											<Background
												color="#2a1f4e"
												gap={20}
											/>
											<Controls showInteractive={false} />
										</ReactFlow>
									</div>
								</>
							)}
						</div>
					</>
				</ClientOnly>
			</div>

			{/* Conflict guidance (bottom) */}
			{(prediction?.wouldConflict ||
				existingConflicts.length > 0) && (
				<div className="mt-3 shrink-0">
					<ConflictGuidance
						prediction={prediction}
						existingConflicts={existingConflicts}
					/>
				</div>
			)}
		</div>
	);
}

function ConflictGuidance({
	prediction,
	existingConflicts,
}: {
	prediction: RebasePrediction | null;
	existingConflicts: JjCommit[];
}) {
	const [expanded, setExpanded] = useState(false);

	return (
		<div className="bg-amber-500/8 border border-amber-500/20 rounded-lg overflow-hidden">
			{/* Clickable header */}
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="w-full flex items-center justify-between px-4 py-2.5 text-left cursor-pointer hover:bg-amber-500/15 transition-colors"
			>
				<div className="flex items-center gap-2">
					<span className="text-amber-400 font-bold text-sm">
						⚠
					</span>
					<span className="text-xs font-bold text-amber-400">
						{prediction?.wouldConflict
							? "コンフリクトが発生する可能性があります"
							: `既存のコンフリクト (${existingConflicts.length} 件)`}
					</span>
				</div>
				<span className="text-xs text-amber-500">
					{expanded ? "▼" : "▶"} 詳細
				</span>
			</button>

			{expanded && (
				<div className="px-4 pb-4 space-y-3 border-t border-amber-500/20">
					{prediction?.conflictExplanation && (
						<div className="text-xs text-amber-400 leading-relaxed whitespace-pre-line mt-3">
							{prediction.conflictExplanation}
						</div>
					)}

					{existingConflicts.length > 0 && (
						<div className="mt-3">
							<div className="text-[10px] font-bold text-git-red mb-1">
								未解消のコンフリクト:
							</div>
							{existingConflicts.map((c) => (
								<div
									key={c.commitId}
									className="text-[10px] font-mono text-git-red"
								>
									{c.changeId.slice(0, 8)}{" "}
									{c.description || "(no description)"}
								</div>
							))}
						</div>
					)}

					{/* jj vs git comparison */}
					<div className="grid grid-cols-2 gap-3">
						<div className="bg-surface rounded p-2.5 border border-jj-purple/20">
							<div className="text-[10px] font-bold text-jj-purple mb-1">
								jj のコンフリクト
							</div>
							<ul className="text-[10px] text-text-secondary space-y-0.5 leading-relaxed">
								<li>
									コンフリクトは
									<strong>コミットに記録</strong>される
								</li>
								<li>作業が中断されない</li>
								<li>後からいつでも解消可能</li>
								<li>他のコミットに先に取り組める</li>
							</ul>
						</div>
						<div className="bg-surface rounded p-2.5 border border-git-orange/20">
							<div className="text-[10px] font-bold text-git-orange mb-1">
								git のコンフリクト
							</div>
							<ul className="text-[10px] text-text-secondary space-y-0.5 leading-relaxed">
								<li>
									rebase が<strong>途中で停止</strong>する
								</li>
								<li>解消するまで次に進めない</li>
								<li>
									<code className="bg-surface-raised px-1 rounded">
										git rebase --continue
									</code>{" "}
									を繰り返す
								</li>
								<li>
									複数コミットだと何度も解消が必要
								</li>
							</ul>
						</div>
					</div>

					{/* Resolution steps */}
					<div>
						<div className="text-[10px] font-bold text-amber-400 mb-1.5">
							解消手順
						</div>
						<div className="space-y-1.5">
							<div className="flex items-start gap-2">
								<span className="text-[10px] bg-amber-500/20 text-amber-300 w-4 h-4 rounded-full flex items-center justify-center shrink-0 font-bold">
									1
								</span>
								<div className="text-[10px] text-text-primary">
									<code className="bg-surface-raised px-1 rounded font-mono">
										jj new {"<conflicted>"}
									</code>
									<span className="text-text-dim ml-1">
										コンフリクトのあるコミットの上に移動
									</span>
								</div>
							</div>
							<div className="flex items-start gap-2">
								<span className="text-[10px] bg-amber-500/20 text-amber-300 w-4 h-4 rounded-full flex items-center justify-center shrink-0 font-bold">
									2
								</span>
								<div className="text-[10px] text-text-primary">
									ファイル内のコンフリクトマーカーを編集して解消
								</div>
							</div>
							<div className="flex items-start gap-2">
								<span className="text-[10px] bg-amber-500/20 text-amber-300 w-4 h-4 rounded-full flex items-center justify-center shrink-0 font-bold">
									3
								</span>
								<div className="text-[10px] text-text-primary">
									<code className="bg-surface-raised px-1 rounded font-mono">
										jj squash
									</code>
									<span className="text-text-dim ml-1">
										修正をコンフリクトコミットに統合
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* Conflict markers */}
					<div>
						<div className="text-[10px] font-bold text-amber-400 mb-1">
							jj のコンフリクトマーカー
						</div>
						<pre className="text-[10px] bg-surface-card rounded p-2 font-mono text-text-primary leading-relaxed border border-amber-500/20">
							{`<<<<<<<
左側の変更（移動元の内容）
%%%%%%%
ベースからの差分
>>>>>>>
右側の変更（移動先の内容）`}
						</pre>
						<div className="text-[10px] text-text-dim mt-1">
							※ git の{" "}
							<code className="bg-surface-raised px-0.5 rounded">
								=======
							</code>{" "}
							区切りと異なり、jj は diff ベース（
							<code className="bg-surface-raised px-0.5 rounded">
								%%%%%%%
							</code>{" "}
							セクション）
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
