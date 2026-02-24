import {
	Background,
	Controls,
	type Edge,
	type Node,
	ReactFlow,
	type ReactFlowInstance,
} from "@xyflow/react";
import {
	Fragment,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import "@xyflow/react/dist/style.css";
import { useTranslation } from "react-i18next";
import { useFetcher } from "react-router";
import { ClientOnly } from "~/components/client-only";
import type { GitCommit, JjCommit } from "~/shared";
import { CommitNode } from "./CommitNode";
import { layoutDag } from "./dagLayout";
import { GitCommitNode } from "./GitCommitNode";
import { RelativeTime } from "./RelativeTime";

const nodeTypes = {
	commit: CommitNode,
	gitCommit: GitCommitNode,
};

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

	const layoutNodes = layoutDag(nodes, edges);
	return { nodes: layoutNodes, edges };
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

	const layoutNodes = layoutDag(nodes, edges);
	return { nodes: layoutNodes, edges };
}

const FIT_VIEW_OPTIONS = { padding: 0.2, minZoom: 0.7, maxZoom: 1 };

/** After fitView, shift viewport so the topmost node sits at ~33% from the top. */
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

function GitContextBanner({
	gitMode,
	commitCount,
	hasEdges,
}: {
	gitMode: "branches" | "all";
	commitCount: number;
	hasEdges: boolean;
}) {
	const { t } = useTranslation("dag");

	if (gitMode === "branches" && commitCount === 0) {
		return (
			<div className="absolute bottom-3 left-3 right-3 z-10 bg-git-orange/10 border border-git-orange/20 rounded-lg p-3 text-xs text-text-secondary space-y-1.5">
				<div className="font-bold text-git-orange">
					{t("gitBanner.noBranches.title")}
				</div>
				<div>{t("gitBanner.noBranches.description")}</div>
				<div className="font-mono bg-surface-card/80 rounded px-2 py-1 text-[11px]">
					jj bookmark create main -r @
				</div>
				<div className="text-text-muted">{t("gitBanner.noBranches.hint")}</div>
			</div>
		);
	}

	if (gitMode === "branches" && commitCount > 0) {
		return (
			<div className="absolute bottom-3 left-3 right-14 z-10 bg-git-orange/10 border border-git-orange/20 rounded px-3 py-1.5 text-[11px] text-text-secondary">
				<span className="font-bold text-git-orange">Branches:</span>{" "}
				{t("gitBanner.branches.description")}
			</div>
		);
	}

	if (gitMode === "all" && commitCount > 0) {
		return (
			<div className="absolute bottom-3 left-3 right-14 z-10 bg-git-orange/10 border border-git-orange/20 rounded px-3 py-1.5 text-[11px] text-text-secondary space-y-1">
				<div>
					<span className="font-bold text-git-orange">All refs:</span>{" "}
					<code className="bg-surface-card/80 rounded px-1">
						refs/jj/keep/*
					</code>{" "}
					{t("gitBanner.allRefs.description")}
				</div>
				{!hasEdges && (
					<div className="text-text-muted">
						{t("gitBanner.allRefs.independentNodes")}
					</div>
				)}
			</div>
		);
	}

	return null;
}

function JjContextBanner({ commits }: { commits: JjCommit[] }) {
	const { t } = useTranslation("dag");
	const wc = commits.find((c) => c.isWorkingCopy);
	const immutableCount = commits.filter((c) => c.immutable).length;
	const emptyCount = commits.filter((c) => c.empty).length;

	return (
		<div className="absolute bottom-3 left-3 right-14 z-10 bg-jj-purple/10 border border-jj-purple/20 rounded px-3 py-1.5 text-[11px] text-text-secondary space-y-0.5">
			<div>
				<span className="font-bold text-jj-purple">jj:</span>{" "}
				{t("jjBanner.commitCount", { count: commits.length })}
				{wc && (
					<>
						{" "}
						/ <span className="text-jj-blue font-bold">@</span>{" "}
						{t("jjBanner.workingCopy")}
					</>
				)}
				{immutableCount > 0 && (
					<>
						{" "}
						/ <span className="text-immutable-gray">◆</span>{" "}
						{t("jjBanner.immutable", { count: immutableCount })}
					</>
				)}
				{emptyCount > 0 && (
					<> / {t("jjBanner.emptyCount", { count: emptyCount })}</>
				)}
			</div>
			<div className="text-text-dim">{t("jjBanner.timestampHint")}</div>
		</div>
	);
}

export function DagView({
	jjCommits,
	gitCommits,
	gitMode,
	onToggleGitMode,
}: {
	jjCommits: JjCommit[];
	gitCommits: GitCommit[];
	gitMode: "branches" | "all";
	onToggleGitMode: (mode: "branches" | "all") => void;
}) {
	const { t } = useTranslation("dag");
	const [selectedCommitId, setSelectedCommitId] = useState<string | null>(null);
	const selectedCommit =
		jjCommits.find((c) => c.commitId === selectedCommitId) ?? null;

	const [panelHeight, setPanelHeight] = useState(() =>
		typeof window !== "undefined" ? Math.round(window.innerHeight * 0.33) : 300,
	);
	const isDragging = useRef(false);
	const startY = useRef(0);
	const startHeight = useRef(0);

	useEffect(() => {
		const onMouseMove = (e: MouseEvent) => {
			if (!isDragging.current) return;
			const delta = startY.current - e.clientY;
			const maxH = Math.round(window.innerHeight * 0.7);
			const newHeight = Math.min(
				Math.max(startHeight.current + delta, 120),
				maxH,
			);
			setPanelHeight(newHeight);
		};
		const onMouseUp = () => {
			isDragging.current = false;
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		};
		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("mouseup", onMouseUp);
		return () => {
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("mouseup", onMouseUp);
		};
	}, []);

	const onDragStart = useCallback(
		(e: React.MouseEvent) => {
			isDragging.current = true;
			startY.current = e.clientY;
			startHeight.current = panelHeight;
			document.body.style.cursor = "row-resize";
			document.body.style.userSelect = "none";
		},
		[panelHeight],
	);

	const [expandedEvologIdx, setExpandedEvologIdx] = useState<number | null>(
		null,
	);
	const jjDagRef = useRef<HTMLDivElement>(null);
	const gitDagRef = useRef<HTMLDivElement>(null);

	const fetcher = useFetcher<{
		evolog: {
			commitId: string;
			timestamp: string;
			description: string;
			empty: boolean;
		}[];
		diff: { status: string; path: string }[];
		evologDiffs: {
			from: string;
			to: string;
			files: { status: string; path: string }[];
		}[];
	}>();

	const jjGraph = useMemo(() => buildJjGraph(jjCommits), [jjCommits]);
	const gitGraph = useMemo(() => buildGitGraph(gitCommits), [gitCommits]);

	useEffect(() => {
		if (selectedCommit) {
			fetcher.load(`/api/commit-detail?rev=${selectedCommit.changeId}`);
			setExpandedEvologIdx(null);
		}
	}, [selectedCommit?.changeId]);

	const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
		setSelectedCommitId((prev) => (prev === node.id ? null : node.id));
	}, []);

	return (
		<div className="flex flex-col h-full">
			<div className="flex flex-1 min-h-0">
				{/* jj DAG */}
				<div ref={jjDagRef} className="flex-1 border-r border-border relative">
					<div className="absolute top-3 left-4 z-10 text-sm font-bold text-jj-purple bg-surface-card/80 px-2 py-1 rounded border border-jj-purple/20">
						jj world
					</div>
					<JjContextBanner commits={jjCommits} />
					<ClientOnly
						fallback={
							<div className="flex items-center justify-center h-full text-text-muted">
								Loading...
							</div>
						}
					>
						<ReactFlow
							nodes={jjGraph.nodes}
							edges={jjGraph.edges}
							nodeTypes={nodeTypes}
							onNodeClick={onNodeClick}
							onInit={(rf) => {
								rf.fitView(FIT_VIEW_OPTIONS);
								shiftToTop(rf, jjDagRef.current);
							}}
							minZoom={0.3}
							maxZoom={2}
							proOptions={{ hideAttribution: true }}
						>
							<Background color="#2a1f4e" gap={20} />
							<Controls position="bottom-right" />
						</ReactFlow>
					</ClientOnly>
				</div>

				{/* git DAG */}
				<div ref={gitDagRef} className="flex-1 relative">
					<div className="absolute top-3 left-4 z-10 flex items-center gap-3">
						<span className="text-sm font-bold text-git-orange bg-surface-card/80 px-2 py-1 rounded border border-git-orange/20">
							git world
						</span>
						<div className="flex bg-surface-card/90 rounded border border-border-strong text-[11px] overflow-hidden">
							<button
								type="button"
								onClick={() => onToggleGitMode("branches")}
								className={`px-2 py-0.5 transition-colors ${
									gitMode === "branches"
										? "bg-git-orange text-white"
										: "text-text-muted hover:bg-surface-raised"
								}`}
							>
								Branches
							</button>
							<button
								type="button"
								onClick={() => onToggleGitMode("all")}
								className={`px-2 py-0.5 transition-colors ${
									gitMode === "all"
										? "bg-git-orange text-white"
										: "text-text-muted hover:bg-surface-raised"
								}`}
							>
								All (jj internal)
							</button>
						</div>
					</div>
					<GitContextBanner
						gitMode={gitMode}
						commitCount={gitCommits.length}
						hasEdges={gitGraph.edges.length > 0}
					/>
					{gitCommits.length > 0 ? (
						<ClientOnly
							fallback={
								<div className="flex items-center justify-center h-full text-text-muted">
									Loading...
								</div>
							}
						>
							<ReactFlow
								nodes={gitGraph.nodes}
								edges={gitGraph.edges}
								nodeTypes={nodeTypes}
								onInit={(rf) => {
									rf.fitView(FIT_VIEW_OPTIONS);
									shiftToTop(rf, gitDagRef.current);
								}}
								minZoom={0.3}
								maxZoom={2}
								proOptions={{ hideAttribution: true }}
							>
								<Background color="#2a1f0e" gap={20} />
								<Controls position="bottom-right" />
							</ReactFlow>
						</ClientOnly>
					) : null}
				</div>
			</div>

			{/* Detail panel - 3 columns */}
			{selectedCommit && (
				<>
					{/* Drag handle */}
					<div
						onMouseDown={onDragStart}
						className="h-1.5 bg-surface-raised hover:bg-jj-purple/30 cursor-row-resize flex-shrink-0 transition-colors"
					/>
					<div
						className="bg-surface flex flex-col flex-shrink-0"
						style={{ height: panelHeight }}
					>
						<div className="flex items-center gap-4 px-4 py-2 border-b border-border shrink-0">
							<h3 className="font-bold text-sm">
								<span className="text-jj-purple font-mono">
									{selectedCommit.changeId}
								</span>
							</h3>
							<div className="flex gap-2">
								{selectedCommit.isWorkingCopy && (
									<span className="bg-jj-blue/15 text-jj-blue px-2 py-0.5 rounded text-[10px]">
										working copy
									</span>
								)}
								{selectedCommit.empty && (
									<span className="bg-yellow-500/15 text-yellow-400 px-2 py-0.5 rounded text-[10px]">
										empty
									</span>
								)}
								{selectedCommit.immutable && (
									<span className="bg-surface-raised text-text-muted px-2 py-0.5 rounded text-[10px]">
										immutable
									</span>
								)}
								{selectedCommit.divergent && (
									<span className="bg-amber-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">
										?? divergent
									</span>
								)}
							</div>
							<span className="text-xs text-text-muted ml-auto">
								{selectedCommit.description || "(no description)"}
							</span>
							<button
								type="button"
								onClick={() => setSelectedCommitId(null)}
								className="text-xs text-text-dim hover:text-text-secondary transition-colors"
							>
								close
							</button>
						</div>
						{selectedCommit.divergent && (
							<div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-300 leading-relaxed">
								<strong>{t("detail.divergent.title")}</strong>{" "}
								{t("detail.divergent.description", {
									changeId: selectedCommit.changeId.slice(0, 8),
								})}
								<span className="block mt-1">
									<strong>{t("detail.divergent.resolution")}</strong>
									<code className="bg-amber-500/15 px-1 rounded font-mono ml-1">
										jj abandon {selectedCommit.commitId.slice(0, 8)}
									</code>{" "}
									{t("detail.divergent.abandonHint")}
									<code className="bg-amber-500/15 px-1 rounded font-mono ml-1">
										jj op restore
									</code>{" "}
									{t("detail.divergent.opRestoreHint")}
									<a
										href="/faq#divergent"
										className="text-amber-400 underline hover:text-amber-300 ml-1"
									>
										{t("detail.divergent.faqLink")}
									</a>
								</span>
							</div>
						)}
						<div className="flex flex-1 min-h-0 divide-x divide-border">
							{/* Detail */}
							<div className="w-1/4 p-3 overflow-auto text-xs space-y-2">
								<div className="font-bold text-text-dim text-[10px] uppercase tracking-wider">
									Detail
								</div>
								<div>
									<span className="text-text-dim">Change ID: </span>
									<span className="font-mono text-jj-purple">
										{selectedCommit.changeId}
									</span>
								</div>
								<div>
									<span className="text-text-dim">Commit ID: </span>
									<span className="font-mono text-text-secondary">
										{selectedCommit.commitId}
									</span>
								</div>
								<div>
									<span className="text-text-dim">Author: </span>
									<span>{selectedCommit.authorEmail}</span>
								</div>
								<div>
									<span className="text-text-dim">Time: </span>
									<RelativeTime timestamp={selectedCommit.timestamp} />
								</div>
								<div>
									<span className="text-text-dim">Parents: </span>
									<span className="font-mono">
										{selectedCommit.parents.join(", ") || "(root)"}
									</span>
								</div>
								{selectedCommit.bookmarks.length > 0 && (
									<div className="flex gap-1 flex-wrap">
										{selectedCommit.bookmarks.map((b) => (
											<span
												key={b}
												className="text-[10px] bg-wc-green/15 text-wc-green px-1.5 py-0.5 rounded font-mono"
											>
												{b}
											</span>
										))}
									</div>
								)}
							</div>

							{/* Evolog */}
							<div className="w-2/5 p-3 overflow-auto text-xs">
								<div className="font-bold text-text-dim text-[10px] uppercase tracking-wider mb-2">
									Evolog
									<span className="font-normal normal-case text-text-dim ml-2">
										{t("detail.evolog.subtitle")}
									</span>
								</div>
								{fetcher.state === "loading" ? (
									<div className="text-text-dim">Loading...</div>
								) : fetcher.data?.evolog ? (
									<div className="space-y-0.5">
										{fetcher.data.evolog.map((entry, i) => {
											const diffData = fetcher.data?.evologDiffs?.[i];
											const isExpanded = expandedEvologIdx === i;
											const hasDiff = diffData && diffData.files.length > 0;

											return (
												<Fragment key={entry.commitId}>
													<button
														type="button"
														onClick={() =>
															hasDiff &&
															setExpandedEvologIdx(isExpanded ? null : i)
														}
														className={`w-full text-left flex items-center gap-2 px-2 py-1 rounded transition-colors ${
															i === 0
																? "bg-jj-purple/10 border border-jj-purple/20"
																: isExpanded
																	? "bg-jj-blue/10 border border-jj-blue/20"
																	: "hover:bg-surface-raised"
														} ${hasDiff ? "cursor-pointer" : "cursor-default"}`}
													>
														<span className="font-mono text-[10px] text-text-muted w-20 shrink-0">
															{entry.commitId}
														</span>
														<RelativeTime timestamp={entry.timestamp} />
														{entry.empty && (
															<span className="text-[9px] bg-yellow-500/15 text-yellow-400 px-1 rounded">
																empty
															</span>
														)}
														{hasDiff && (
															<span className="text-[9px] text-jj-blue ml-auto shrink-0">
																{isExpanded ? "▼" : "▶"} {diffData.files.length}{" "}
																files
															</span>
														)}
														{i === 0 && (
															<span className="text-[9px] text-jj-purple ml-auto shrink-0">
																latest
															</span>
														)}
													</button>
													{isExpanded && diffData && (
														<div className="ml-4 pl-2 border-l-2 border-jj-blue/30 py-1 space-y-0.5">
															<div className="text-[9px] text-text-dim mb-1">
																{t("detail.evolog.diffLabel")}
															</div>
															{diffData.files.map((f) => (
																<div
																	key={f.path}
																	className="flex items-center gap-1.5 font-mono text-[11px]"
																>
																	<span
																		className={`font-bold w-3 text-center ${
																			f.status === "A"
																				? "text-wc-green"
																				: f.status === "M"
																					? "text-jj-blue"
																					: f.status === "D"
																						? "text-git-red"
																						: "text-text-muted"
																		}`}
																	>
																		{f.status}
																	</span>
																	<span className="text-text-secondary truncate">
																		{f.path}
																	</span>
																</div>
															))}
														</div>
													)}
												</Fragment>
											);
										})}
										<div className="text-[10px] text-text-dim mt-2 border-t border-border pt-2">
											{t("detail.evolog.explanation")}
										</div>
									</div>
								) : null}
							</div>

							{/* Changed Files */}
							<div className="flex-1 p-3 overflow-auto text-xs">
								<div className="font-bold text-text-dim text-[10px] uppercase tracking-wider mb-2">
									Changed Files
									<span className="font-normal normal-case text-text-dim ml-2">
										{t("detail.changedFiles.subtitle")}
									</span>
								</div>
								{fetcher.state === "loading" ? (
									<div className="text-text-dim">Loading...</div>
								) : fetcher.data?.diff ? (
									fetcher.data.diff.length > 0 ? (
										<div className="space-y-0.5">
											{fetcher.data.diff.map((f) => (
												<div
													key={f.path}
													className="flex items-center gap-2 font-mono"
												>
													<span
														className={`text-[10px] font-bold w-4 text-center ${
															f.status === "A"
																? "text-wc-green"
																: f.status === "M"
																	? "text-jj-blue"
																	: f.status === "D"
																		? "text-git-red"
																		: "text-text-muted"
														}`}
													>
														{f.status}
													</span>
													<span className="text-text-secondary truncate">
														{f.path}
													</span>
												</div>
											))}
										</div>
									) : (
										<div className="text-text-dim">
											{t("detail.changedFiles.noChanges")}
										</div>
									)
								) : null}
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
