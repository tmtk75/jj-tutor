import { useFetcher } from "react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { JjCommit, JjOperation } from "~/shared";

// --- Types ---

interface FileDiff {
	header: string;
	oldFile: string;
	newFile: string;
	hunks: Hunk[];
}

interface Hunk {
	header: string;
	oldStart: number;
	newStart: number;
	lines: DiffLine[];
}

interface DiffLine {
	type: "add" | "remove" | "context";
	content: string;
}

interface SplitRow {
	left: { lineNo: number; type: "remove" | "context" | "empty"; content: string } | null;
	right: { lineNo: number; type: "add" | "context" | "empty"; content: string } | null;
}

// --- Parsers ---

function parseDiff(raw: string): FileDiff[] {
	const files: FileDiff[] = [];
	const lines = raw.split("\n");
	let current: FileDiff | null = null;
	let currentHunk: Hunk | null = null;

	for (const line of lines) {
		if (line.startsWith("diff --git")) {
			if (current) files.push(current);
			current = { header: line, oldFile: "", newFile: "", hunks: [] };
			currentHunk = null;
			continue;
		}
		if (!current) continue;

		if (line.startsWith("--- ")) {
			current.oldFile = line.slice(4);
			continue;
		}
		if (line.startsWith("+++ ")) {
			current.newFile = line.slice(4);
			continue;
		}
		if (line.startsWith("@@")) {
			const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
			currentHunk = {
				header: line,
				oldStart: match ? Number.parseInt(match[1], 10) : 1,
				newStart: match ? Number.parseInt(match[2], 10) : 1,
				lines: [],
			};
			current.hunks.push(currentHunk);
			continue;
		}
		if (
			line.startsWith("Binary files") ||
			line.startsWith("index ") ||
			line.startsWith("new file") ||
			line.startsWith("deleted file") ||
			line.startsWith("rename ") ||
			line.startsWith("old mode") ||
			line.startsWith("new mode")
		) {
			continue;
		}
		if (currentHunk) {
			if (line.startsWith("+")) {
				currentHunk.lines.push({ type: "add", content: line.slice(1) });
			} else if (line.startsWith("-")) {
				currentHunk.lines.push({ type: "remove", content: line.slice(1) });
			} else if (line.startsWith(" ") || line === "") {
				currentHunk.lines.push({ type: "context", content: line.slice(1) });
			}
		}
	}
	if (current) files.push(current);
	return files;
}

function hunkToSplitRows(hunk: Hunk): SplitRow[] {
	const rows: SplitRow[] = [];
	const lines = hunk.lines;
	let oldLine = hunk.oldStart;
	let newLine = hunk.newStart;
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];
		if (line.type === "context") {
			rows.push({
				left: { lineNo: oldLine++, type: "context", content: line.content },
				right: { lineNo: newLine++, type: "context", content: line.content },
			});
			i++;
		} else if (line.type === "remove") {
			const removes: DiffLine[] = [];
			while (i < lines.length && lines[i].type === "remove") {
				removes.push(lines[i]);
				i++;
			}
			const adds: DiffLine[] = [];
			while (i < lines.length && lines[i].type === "add") {
				adds.push(lines[i]);
				i++;
			}
			const maxLen = Math.max(removes.length, adds.length);
			for (let j = 0; j < maxLen; j++) {
				rows.push({
					left: j < removes.length
						? { lineNo: oldLine++, type: "remove", content: removes[j].content }
						: null,
					right: j < adds.length
						? { lineNo: newLine++, type: "add", content: adds[j].content }
						: null,
				});
			}
		} else if (line.type === "add") {
			rows.push({
				left: null,
				right: { lineNo: newLine++, type: "add", content: line.content },
			});
			i++;
		} else {
			i++;
		}
	}
	return rows;
}

function extractFilePath(fileDiff: FileDiff): string {
	if (fileDiff.newFile && fileDiff.newFile !== "/dev/null") {
		return fileDiff.newFile.replace(/^b\//, "");
	}
	if (fileDiff.oldFile && fileDiff.oldFile !== "/dev/null") {
		return fileDiff.oldFile.replace(/^a\//, "");
	}
	const match = fileDiff.header.match(/diff --git a\/(.+) b\//);
	return match ? match[1] : fileDiff.header;
}

function getFileStatus(fileDiff: FileDiff): string {
	if (fileDiff.oldFile === "/dev/null" || fileDiff.oldFile === "") return "A";
	if (fileDiff.newFile === "/dev/null" || fileDiff.newFile === "") return "D";
	return "M";
}

// --- Shared UI components ---

type ViewMode = "unified" | "split";

function StatusBadge({ status }: { status: string }) {
	return (
		<span
			className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
				status === "A"
					? "bg-wc-green/15 text-wc-green"
					: status === "D"
						? "bg-git-red/15 text-git-red"
						: "bg-jj-blue/15 text-jj-blue"
			}`}
		>
			{status === "A" ? "NEW" : status === "D" ? "DEL" : "MOD"}
		</span>
	);
}

function FileHeader({ path, status }: { path: string; status: string }) {
	return (
		<div className="sticky top-0 bg-surface border-b border-border px-3 py-1.5 flex items-center gap-2 z-10">
			<StatusBadge status={status} />
			<span className="font-mono text-[11px] text-text-primary truncate">{path}</span>
		</div>
	);
}

function UnifiedHunk({ hunk }: { hunk: Hunk }) {
	return (
		<div>
			<div className="bg-jj-blue/8 text-jj-blue px-3 py-0.5 text-[10px] border-y border-jj-blue/15">
				{hunk.header}
			</div>
			{hunk.lines.map((line, li) => (
				<div
					key={li}
					className={`px-3 whitespace-pre-wrap break-all text-[11px] leading-[18px] ${
						line.type === "add"
							? "bg-wc-green/8 text-wc-green"
							: line.type === "remove"
								? "bg-git-red/8 text-git-red"
								: "text-text-secondary"
					}`}
				>
					<span className="select-none text-text-dim inline-block w-3 mr-1.5 text-right">
						{line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
					</span>
					{line.content}
				</div>
			))}
		</div>
	);
}

const splitCellBase = "whitespace-pre-wrap break-all px-1.5 font-mono text-[10px] leading-[16px]";
const lineNoBase = "select-none text-text-dim text-right pr-1 w-8 shrink-0 text-[10px] leading-[16px] border-r";

function SplitHunk({ hunk }: { hunk: Hunk }) {
	const rows = useMemo(() => hunkToSplitRows(hunk), [hunk]);

	return (
		<div>
			<div className="bg-jj-blue/8 text-jj-blue px-3 py-0.5 text-[10px] border-y border-jj-blue/15">
				{hunk.header}
			</div>
			{rows.map((row, ri) => (
				<div key={ri} className="flex">
					<div className="flex flex-1 min-w-0 border-r border-border">
						{row.left ? (
							<>
								<div className={`${lineNoBase} ${row.left.type === "remove" ? "bg-git-red/15 border-git-red/20" : "bg-surface border-border"}`}>
									{row.left.lineNo}
								</div>
								<div className={`${splitCellBase} flex-1 min-w-0 ${row.left.type === "remove" ? "bg-git-red/8 text-git-red" : "text-text-secondary"}`}>
									{row.left.content}
								</div>
							</>
						) : (
							<>
								<div className={`${lineNoBase} bg-surface-raised border-border`} />
								<div className="flex-1 bg-surface-raised/50" />
							</>
						)}
					</div>
					<div className="flex flex-1 min-w-0">
						{row.right ? (
							<>
								<div className={`${lineNoBase} ${row.right.type === "add" ? "bg-wc-green/15 border-wc-green/20" : "bg-surface border-border"}`}>
									{row.right.lineNo}
								</div>
								<div className={`${splitCellBase} flex-1 min-w-0 ${row.right.type === "add" ? "bg-wc-green/8 text-wc-green" : "text-text-secondary"}`}>
									{row.right.content}
								</div>
							</>
						) : (
							<>
								<div className={`${lineNoBase} bg-surface-raised border-border`} />
								<div className="flex-1 bg-surface-raised/50" />
							</>
						)}
					</div>
				</div>
			))}
		</div>
	);
}

// --- Diff content renderer (reused in both columns) ---

function DiffContent({
	parsed,
	viewMode,
	loading,
	emptyMessage,
	loadingMessage,
}: {
	parsed: FileDiff[];
	viewMode: ViewMode;
	loading?: boolean;
	emptyMessage: string;
	loadingMessage?: string;
}) {
	const { t } = useTranslation("diff");
	if (loading) {
		return (
			<div className="flex items-center justify-center h-24 text-text-dim text-xs">
				{loadingMessage ?? t("loading")}
			</div>
		);
	}
	if (parsed.length === 0) {
		return (
			<div className="flex items-center justify-center h-24 text-text-dim text-xs">
				{emptyMessage}
			</div>
		);
	}
	return (
		<div className="pb-4">
			{parsed.map((file) => {
				const path = extractFilePath(file);
				const status = getFileStatus(file);
				return (
					<div key={path} className="border-b border-border">
						<FileHeader path={path} status={status} />
						{file.hunks.length === 0 ? (
							<div className="px-3 py-2 text-text-dim text-[10px] italic font-mono">
								(binary / no content change)
							</div>
						) : viewMode === "unified" ? (
							<div className="font-mono">
								{file.hunks.map((hunk, hi) => (
									<UnifiedHunk key={hi} hunk={hunk} />
								))}
							</div>
						) : (
							<div>
								<div className="flex text-[9px] text-text-muted border-b border-border bg-surface">
									<div className="flex-1 px-3 py-0.5 border-r border-border truncate">
										{file.oldFile?.replace(/^a\//, "") || "old"}
									</div>
									<div className="flex-1 px-3 py-0.5 truncate">
										{file.newFile?.replace(/^b\//, "") || "new"}
									</div>
								</div>
								{file.hunks.map((hunk, hi) => (
									<SplitHunk key={hi} hunk={hunk} />
								))}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

// --- Copyable command ---

function CopyableCmd({ command }: { command: string }) {
	const [copied, setCopied] = useState(false);

	const handleClick = useCallback(() => {
		navigator.clipboard.writeText(command);
		setCopied(true);
		setTimeout(() => setCopied(false), 1200);
	}, [command]);

	return (
		<button
			type="button"
			onClick={handleClick}
			title={`Click to copy: ${command}`}
			className="text-[10px] font-mono bg-surface-raised text-text-secondary px-1.5 py-0.5 rounded border border-border cursor-pointer hover:bg-surface-overlay hover:border-border-strong transition-colors inline-flex items-center gap-1"
		>
			{copied ? (
				<span className="text-wc-green">Copied!</span>
			) : (
				<>
					<span className="text-text-dim">$</span>
					{command}
				</>
			)}
		</button>
	);
}

// --- Evolog detail: on-demand full diff ---

function EvologDiffDetail({
	from,
	to,
	viewMode,
}: {
	from: string;
	to: string;
	viewMode: ViewMode;
}) {
	const { t } = useTranslation("diff");
	const fetcher = useFetcher<{ diffContent: string }>();

	useEffect(() => {
		fetcher.load(`/api/op-diff?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
	}, [from, to]);

	const parsed = useMemo(() => {
		if (fetcher.data?.diffContent) {
			return parseDiff(fetcher.data.diffContent);
		}
		return [];
	}, [fetcher.data]);

	if (fetcher.state === "loading") {
		return (
			<div className="text-[10px] text-text-dim py-2 px-2">
				{t("loading")}
			</div>
		);
	}

	if (parsed.length === 0) {
		return (
			<div className="text-[10px] text-text-dim py-2 px-2 italic">
				{t("noDiff")}
			</div>
		);
	}

	return (
		<DiffContent
			parsed={parsed}
			viewMode={viewMode}
			emptyMessage={t("noDiff")}
		/>
	);
}

// --- Evolog types ---

interface EvologEntry {
	commitId: string;
	timestamp: string;
	description: string;
	empty: boolean;
	operationId: string;
	operationDesc: string;
}

interface EvologDiff {
	from: string;
	to: string;
	files: { status: string; path: string }[];
}

// --- Main component ---

export function DiffView({
	commits,
	diffContent,
	rev,
	operations,
	onChangeRev,
}: {
	commits: JjCommit[];
	diffContent: string;
	diffSummary: { status: string; path: string }[];
	rev: string;
	fromRev?: string;
	toRev?: string;
	operations: JjOperation[];
	onChangeRev: (rev: string) => void;
}) {
	const { t } = useTranslation("diff");
	const revParsed = useMemo(() => parseDiff(diffContent), [diffContent]);
	const [viewMode, setViewMode] = useState<ViewMode>("unified");

	// Divergent detection
	const selectedRevCommit = commits.find((c) => c.changeId === rev);
	const hasDivergent = commits.some((c) => c.divergent);
	const divergentChangeIds = [...new Set(commits.filter((c) => c.divergent).map((c) => c.changeId))];

	// Right column: evolog fetcher
	const wc = commits.find((c) => c.isWorkingCopy);
	const [selectedChangeId, setSelectedChangeId] = useState(wc?.changeId || "");
	const evoFetcher = useFetcher<{ evolog: EvologEntry[]; evologDiffs: EvologDiff[] }>();
	const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

	// Fetch evolog when change is selected
	const handleChangeSelect = (changeId: string) => {
		setSelectedChangeId(changeId);
		setExpandedIdx(null);
		if (changeId) {
			evoFetcher.load(`/api/op-diff?changeId=${encodeURIComponent(changeId)}`);
		}
	};

	// Auto-fetch for WC on mount
	useEffect(() => {
		if (wc?.changeId && !evoFetcher.data && evoFetcher.state === "idle") {
			evoFetcher.load(`/api/op-diff?changeId=${encodeURIComponent(wc.changeId)}`);
		}
	}, [wc?.changeId]);

	const evolog = evoFetcher.data?.evolog || [];
	const evologDiffs = evoFetcher.data?.evologDiffs || [];
	const evoLoading = evoFetcher.state === "loading";

	// No longer need affectedOpIds/opToEvologIdx - timeline is evolog-based

	return (
		<div className="h-full flex flex-col">
			{/* Top bar */}
			<div className="px-5 py-3 border-b border-border shrink-0">
				<div className="flex items-center gap-3">
					<h2 className="text-lg font-bold tracking-tight">Diff</h2>
					<span className="text-xs text-text-dim">
						{t("pageSubtitle")}
					</span>
					<div className="ml-auto flex bg-surface-raised rounded border border-border text-[11px] overflow-hidden">
						<button
							type="button"
							onClick={() => setViewMode("unified")}
							className={`px-2.5 py-1 transition-colors cursor-pointer ${
								viewMode === "unified"
									? "bg-jj-purple text-white"
									: "text-text-muted hover:bg-surface-overlay"
							}`}
						>
							Unified
						</button>
						<button
							type="button"
							onClick={() => setViewMode("split")}
							className={`px-2.5 py-1 transition-colors cursor-pointer ${
								viewMode === "split"
									? "bg-jj-purple text-white"
									: "text-text-muted hover:bg-surface-overlay"
							}`}
						>
							Split
						</button>
					</div>
				</div>
			</div>

			{/* Two columns */}
			<div className="flex flex-1 min-h-0">
				{/* Left: Revision Diff */}
				<div className="flex-1 flex flex-col border-r border-border min-w-0">
					<div className="px-4 py-3 border-b border-border bg-jj-purple/8 shrink-0">
						<div className="flex items-center gap-2 mb-1.5">
							<span className="text-xs font-bold text-jj-purple">Revision Diff</span>
							<span className="text-[10px] text-text-dim">{t("revisionDiff.title")}</span>
						</div>
						<p className="text-[11px] text-text-muted leading-relaxed mb-2">
							{t("revisionDiff.description")}
						</p>
						<div className="flex items-center gap-2">
							<select
								id="rev-select"
								value={rev}
								onChange={(e) => onChangeRev(e.target.value)}
								className="border border-border-strong rounded px-2 py-1 text-[11px] font-mono bg-surface-card flex-1 min-w-0"
							>
								{commits
									.filter((c) => c.changeId !== "zzzzzzzzzzzz")
									.map((c) => (
										<option key={c.commitId} value={c.changeId}>
											{c.changeId.slice(0, 8)}
											{c.divergent ? " ??" : ""}
											{c.isWorkingCopy ? " (@)" : ""}
											{c.description
												? ` — ${c.description.slice(0, 30)}`
												: " — (no description)"}
										</option>
									))}
							</select>
						</div>
						{selectedRevCommit?.divergent && (
							<div className="bg-amber-500/8 border border-amber-500/20 rounded p-2 mt-2 text-[11px] text-amber-300 leading-relaxed">
								<strong>{t("divergentWarning.title")}</strong>: {t("divergentWarning.description")}
								<code className="bg-amber-500/15 px-1 rounded font-mono mx-0.5">jj abandon</code> {t("divergentWarning.abandonHint")}
								<code className="bg-amber-500/15 px-1 rounded font-mono mx-0.5">jj op restore</code> {t("divergentWarning.opRestoreHint")}
								<a href="/faq#divergent" className="text-amber-400 underline hover:text-amber-300 ml-1">{t("divergentWarning.faqLink")}</a>
							</div>
						)}
						<div className="flex flex-wrap gap-1.5 mt-2">
							<CopyableCmd command={`jj diff -r ${rev}`} />
							<CopyableCmd command={`jj diff --summary -r ${rev}`} />
						</div>
						<div className="text-[10px] text-text-dim mt-1">
							{revParsed.length} file{revParsed.length !== 1 ? "s" : ""} changed
						</div>
					</div>
					<div className="flex-1 overflow-auto">
						<DiffContent
							parsed={revParsed}
							viewMode={viewMode}
							emptyMessage={t("emptyCommit")}
						/>
					</div>
				</div>

				{/* Right: Operation & Evolution */}
				<div className="flex-1 flex flex-col min-w-0">
					<div className="px-4 py-3 border-b border-border bg-amber-500/8 shrink-0">
						<div className="flex items-center gap-2 mb-1.5">
							<span className="text-xs font-bold text-git-orange">Operation & Evolution</span>
						</div>
						<p className="text-[11px] text-text-muted leading-relaxed mb-2">
							<strong>op log</strong> = {t("operationEvolution.opLogDescription")}
							<strong>evolog</strong> = {t("operationEvolution.evologDescription")}
						</p>
						<div className="flex flex-wrap gap-1.5 mb-3">
							<CopyableCmd command="jj op log" />
							<CopyableCmd command={selectedChangeId ? `jj evolog -r ${selectedChangeId.slice(0, 8)}` : "jj evolog -r @"} />
						</div>
						<div className="flex items-center gap-2">
							<label htmlFor="evo-change-select" className="text-[10px] text-text-muted font-semibold shrink-0">
								change
							</label>
							<select
								id="evo-change-select"
								value={selectedChangeId}
								onChange={(e) => handleChangeSelect(e.target.value)}
								className="border border-border-strong rounded px-2 py-1 text-[11px] font-mono bg-surface-card flex-1 min-w-0"
							>
								<option value="">— select change —</option>
								{commits
									.filter((c) => c.changeId !== "zzzzzzzzzzzz")
									.map((c) => (
										<option key={c.commitId} value={c.changeId}>
											{c.changeId.slice(0, 8)}
											{c.divergent ? " ??" : ""}
											{c.isWorkingCopy ? " (@)" : ""}
											{c.description
												? ` — ${c.description.slice(0, 30)}`
												: " — (no description)"}
										</option>
									))}
							</select>
							{selectedChangeId && evoFetcher.state === "idle" && !evoFetcher.data && (
								<button
									type="button"
									onClick={() => handleChangeSelect(selectedChangeId)}
									className="text-[10px] bg-git-orange text-white px-2 py-0.5 rounded cursor-pointer hover:bg-amber-600 transition-colors"
								>
									Load
								</button>
							)}
						</div>
						{evolog.length > 0 && (
							<div className="text-[10px] text-text-dim mt-1">
								{t("operationEvolution.evologEntries", { count: evolog.length, opCount: operations.length })}
							</div>
						)}
					</div>

					{/* Timeline */}
					<div className="flex-1 overflow-auto">
						{evoLoading ? (
							<div className="flex items-center justify-center h-24 text-text-dim text-xs">
								{t("loading")}
							</div>
						) : !selectedChangeId || evolog.length === 0 ? (
							<div className="p-5">
								{!selectedChangeId ? (
									<div className="text-text-dim text-xs text-center mb-4">
										{t("operationEvolution.selectHint")}
									</div>
								) : null}
								<div className="bg-surface rounded-lg border border-border p-4 text-[11px] text-text-muted leading-relaxed">
									<div className="font-semibold text-text-primary mb-2">{t("operationEvolution.opLogVsEvolog.title")}</div>
									<div className="space-y-1">
										<div><strong>op log</strong>: {t("operationEvolution.opLogVsEvolog.opLog")}</div>
										<div><strong>evolog</strong>: {t("operationEvolution.opLogVsEvolog.evolog")}</div>
									</div>
									<div className="mt-3 font-mono text-[10px] bg-surface-card rounded border border-border p-2">
										<div>$ jj op log      <span className="text-text-dim">{t("operationEvolution.opLogVsEvolog.opLogComment")}</span></div>
										<div>$ jj evolog -r @  <span className="text-text-dim">{t("operationEvolution.opLogVsEvolog.evologComment")}</span></div>
									</div>
								</div>
							</div>
						) : (
							<div>
								{/* Evolog timeline */}
								{evolog.map((entry, i) => {
									const diffData = evologDiffs[i];
									const hasDiff = diffData && diffData.files.length > 0;
									const isExpanded = expandedIdx === i;
									const isLatest = i === 0;

									return (
										<div
											key={`${entry.commitId}-${i}`}
											className="border-b border-border"
										>
											<div className="px-4 py-2">
												{/* Operation info */}
												<div className="flex items-center gap-2">
													<span className="text-git-orange text-[10px] shrink-0">{"\u25CF"}</span>
													<span className="font-mono text-[10px] text-text-dim">
														op {entry.operationId.slice(0, 8)}
													</span>
													<span className="text-[10px] text-text-secondary truncate">
														{entry.operationDesc}
													</span>
												</div>

												{/* Evolog commit info */}
												<div className="flex items-center gap-2 mt-1 ml-4">
													<span className="text-jj-purple font-mono text-[10px] font-semibold">
														commit
													</span>
													<span className="font-mono text-[10px] text-text-muted">
														{entry.commitId.slice(0, 8)}
													</span>
													{isLatest && (
														<span className="text-[9px] bg-jj-purple/15 text-jj-purple px-1 rounded">
															latest
														</span>
													)}
													{entry.empty && (
														<span className="text-[9px] text-text-dim italic">(empty)</span>
													)}
													<span className="text-[10px] text-text-dim">
														{entry.timestamp}
													</span>
												</div>

												{/* Diff toggle */}
												{hasDiff && (
													<button
														type="button"
														onClick={() => setExpandedIdx(isExpanded ? null : i)}
														className="flex items-center gap-1.5 mt-1 ml-4 text-[10px] text-text-muted rounded px-1.5 py-0.5 cursor-pointer hover:bg-surface-raised transition-colors"
													>
														<span>{isExpanded ? "\u25BC" : "\u25B6"}</span>
														<span>
															{diffData.files.length} file{diffData.files.length !== 1 ? "s" : ""} changed
														</span>
														<span className="text-text-dim font-mono">
															({diffData.from.slice(0, 6)}→{diffData.to.slice(0, 6)})
														</span>
													</button>
												)}
												{i === evolog.length - 1 && (
													<div className="ml-4 mt-1 text-[9px] text-text-dim italic">
														{t("firstSnapshot")}
													</div>
												)}
											</div>

											{/* Expanded full diff */}
											{isExpanded && diffData && (
												<div className="border-t border-border bg-surface/30">
													<div className="px-4 py-1.5 flex flex-wrap gap-1.5">
														<CopyableCmd command={`jj diff --from ${diffData.from.slice(0, 8)} --to ${diffData.to.slice(0, 8)}`} />
													</div>
													<EvologDiffDetail
														from={diffData.from}
														to={diffData.to}
														viewMode={viewMode}
													/>
												</div>
											)}
										</div>
									);
								})}

								{/* Legend */}
								<div className="px-4 py-3 border-t border-border bg-surface/30">
									<div className="text-[10px] text-text-muted leading-relaxed space-y-1">
										<div>
											<strong>evolog</strong> = {t("evologLegend.description")}
										</div>
										<div>
											{t("evologLegend.opRelation")}
											<strong>op log</strong> {t("evologLegend.opLogNote")}
											<em>{t("evologLegend.filterNote")}</em>{t("evologLegend.filterSuffix")}
										</div>
									</div>
									<div className="flex flex-wrap gap-1.5 mt-2">
										<CopyableCmd command={`jj evolog -r ${selectedChangeId.slice(0, 8)}`} />
										<CopyableCmd command={`jj evolog -p -r ${selectedChangeId.slice(0, 8)}`} />
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
