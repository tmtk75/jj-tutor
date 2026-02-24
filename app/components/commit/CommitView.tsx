import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { JjCommit, JjStatus } from "~/shared";

interface FileEntry {
	status: string;
	path: string;
}

// Which commit a file is assigned to in the split simulator
type SplitAssignment = "first" | "second";

const STATUS_COLOR: Record<string, string> = {
	A: "text-wc-green",
	M: "text-jj-blue",
	D: "text-git-red",
	R: "text-yellow-400",
};

// --- Operation cards data ---
interface OpCard {
	id: string;
	command: string;
	name: string;
	description: string;
	gitEquivalent: string;
	before: string;
	after: string;
	requiresChanges: boolean;
}

const OPERATIONS: OpCard[] = [
	{
		id: "commit",
		command: 'jj commit -m "message"',
		name: "Commit",
		description:
			"WC に説明を付けて確定し、その上に新しい空の WC を作成する。jj describe + jj new と同等。",
		gitEquivalent: 'git add -A && git commit -m "message"',
		before: `  ○ (empty WC)    ← new
  │
  ● WC "message"  ← confirmed
  │
  ◆ parent`,
		after: `  ● WC "message"  ← was WC
  │
  ◆ parent`,
		requiresChanges: false,
	},
	{
		id: "split",
		command: "jj split",
		name: "Split",
		description:
			"WC の変更を対話的に2つのコミットに分割。エディタが開き、最初のコミットに含めるファイル/ハンクを選択。残りは新しい WC に残る。",
		gitEquivalent: "git reset HEAD~ && git add -p && git commit (複数ステップ)",
		before: `  ○ (empty WC)
  │
  ● first commit   ← selected files
  │
  ● WC (remaining) ← rest stays here
  │
  ◆ parent`,
		after: `  ● WC (all files)
  │
  ◆ parent`,
		requiresChanges: true,
	},
	{
		id: "squash",
		command: "jj squash",
		name: "Squash",
		description:
			"WC の変更を親コミットに吸収する。git commit --amend 相当。WC は空になるが change ID は保持。",
		gitEquivalent: "git add -A && git commit --amend",
		before: `  ○ WC (empty)     ← changes absorbed
  │
  ● parent+changes ← merged here
  │
  ◆ grandparent`,
		after: `  ● WC (changes)
  │
  ◆ parent`,
		requiresChanges: true,
	},
	{
		id: "describe",
		command: 'jj describe -m "message"',
		name: "Describe",
		description:
			"WC の説明（コミットメッセージ）を設定/変更する。DAG 構造もファイルも変わらない。",
		gitEquivalent: "git commit --amend -m (hash が変わる)",
		before: `  ● WC "message"   ← description set
  │
  ◆ parent`,
		after: `  ● WC (no desc)
  │
  ◆ parent`,
		requiresChanges: false,
	},
];

// --- Split simulator ---
function SplitSimulator({ files, t }: { files: FileEntry[]; t: (key: string, options?: Record<string, unknown>) => string }) {
	const [assignments, setAssignments] = useState<Record<string, SplitAssignment>>(() => {
		const init: Record<string, SplitAssignment> = {};
		for (const f of files) {
			init[f.path] = "first";
		}
		return init;
	});

	const toggle = (path: string) => {
		setAssignments((prev) => ({
			...prev,
			[path]: prev[path] === "first" ? "second" : "first",
		}));
	};

	const firstFiles = useMemo(
		() => files.filter((f) => assignments[f.path] === "first"),
		[files, assignments],
	);
	const secondFiles = useMemo(
		() => files.filter((f) => assignments[f.path] === "second"),
		[files, assignments],
	);

	if (files.length === 0) {
		return (
			<div className="text-xs text-text-dim py-4 text-center">
				{t("splitSim.noChanges")}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="text-xs text-text-muted" dangerouslySetInnerHTML={{ __html: t("splitSim.instructions") }} />

			{/* File assignment area */}
			<div className="border rounded-lg overflow-hidden">
				<div className="bg-surface px-3 py-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider border-b">
					{t("splitSim.filesHeader")}
				</div>
				<div className="divide-y divide-border">
					{files.map((f) => {
						const isFirst = assignments[f.path] === "first";
						return (
							<button
								key={f.path}
								type="button"
								onClick={() => toggle(f.path)}
								className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
									isFirst
										? "bg-jj-purple/8 hover:bg-jj-purple/15"
										: "bg-jj-blue/8 hover:bg-jj-blue/15"
								}`}
							>
								<span className={`font-bold w-3 text-center ${STATUS_COLOR[f.status] ?? "text-text-muted"}`}>
									{f.status}
								</span>
								<span className="font-mono text-text-primary truncate flex-1">
									{f.path}
								</span>
								<span
									className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
										isFirst
											? "bg-jj-purple/20 text-jj-purple"
											: "bg-jj-blue/15 text-jj-blue"
									}`}
								>
									{isFirst ? "Commit 1" : "Commit 2"}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Before → After visualization */}
			<div className="flex gap-4">
				{/* Before */}
				<div className="flex-1 border rounded-lg p-3">
					<div className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-2">
						{t("splitSim.beforeLabel")}
					</div>
					<div className="font-mono text-xs space-y-1">
						<div className="flex items-center gap-2">
							<span className="text-jj-blue font-bold">@</span>
							<span className="text-text-primary">WC ({files.length} files)</span>
						</div>
						<div className="pl-4 text-text-dim">│</div>
						<div className="flex items-center gap-2 pl-4">
							<span className="text-text-dim">◆</span>
							<span className="text-text-muted">parent</span>
						</div>
					</div>
				</div>

				<div className="flex items-center text-text-dim text-lg">→</div>

				{/* After */}
				<div className="flex-1 border-2 border-jj-purple/30 rounded-lg p-3">
					<div className="text-[10px] font-bold text-jj-purple uppercase tracking-wider mb-2">
						{t("splitSim.afterLabel")}
					</div>
					<div className="font-mono text-xs space-y-1">
						<div className="flex items-center gap-2">
							<span className="text-jj-blue font-bold">@</span>
							<span className="text-jj-blue">
								WC — {t("splitSim.remaining")} ({secondFiles.length} files)
							</span>
						</div>
						{secondFiles.length > 0 && (
							<div className="pl-6 space-y-0.5">
								{secondFiles.map((f) => (
									<div key={f.path} className="text-[10px] text-jj-blue font-mono truncate">
										{f.status} {f.path}
									</div>
								))}
							</div>
						)}
						<div className="pl-4 text-text-dim">│</div>
						<div className="flex items-center gap-2 pl-4">
							<span className="text-jj-purple">●</span>
							<span className="text-jj-purple">
								{t("splitSim.firstCommit")} ({firstFiles.length} files)
							</span>
						</div>
						{firstFiles.length > 0 && (
							<div className="pl-10 space-y-0.5">
								{firstFiles.map((f) => (
									<div key={f.path} className="text-[10px] text-jj-purple font-mono truncate">
										{f.status} {f.path}
									</div>
								))}
							</div>
						)}
						<div className="pl-4 text-text-dim">│</div>
						<div className="flex items-center gap-2 pl-4">
							<span className="text-text-dim">◆</span>
							<span className="text-text-muted">parent</span>
						</div>
					</div>
				</div>
			</div>

			{/* Split flow explanation */}
			<div className="bg-surface rounded-lg p-3 text-xs text-text-secondary space-y-1.5">
				<div className="font-bold text-text-primary">{t("splitSim.flowTitle")}</div>
				<ol className="list-decimal list-inside space-y-1 text-[11px]">
					<li dangerouslySetInnerHTML={{ __html: t("splitSim.step1") }} />
					<li>{t("splitSim.step2")}</li>
					<li>{t("splitSim.step3")}</li>
					<li dangerouslySetInnerHTML={{ __html: t("splitSim.step4") }} />
				</ol>
				<div className="text-text-dim mt-2">
					{t("splitSim.gitNote")}
				</div>
			</div>
		</div>
	);
}

// --- Main component ---
export function CommitView({
	commits,
	diffSummary,
	status,
}: {
	commits: JjCommit[];
	diffSummary: FileEntry[];
	status: JjStatus;
}) {
	const { t } = useTranslation("commit");
	const [expandedOp, setExpandedOp] = useState<string | null>("split");

	const wc = commits.find((c) => c.isWorkingCopy);
	const parent = wc?.parents[0]
		? commits.find((c) => c.commitId === wc.parents[0])
		: undefined;

	const hasChanges = diffSummary.length > 0;

	return (
		<div className="h-full overflow-auto">
			<div className="p-6 max-w-5xl">
				<h2 className="text-lg font-bold mb-1">{t("title")}</h2>
				<p className="text-xs text-text-muted mb-6">
					{t("subtitle")}
				</p>

				{/* WC status */}
				<div className="bg-jj-blue/8 border border-jj-blue/20 rounded-lg p-4 mb-6">
					<div className="flex items-center gap-3 mb-2">
						<span className="text-[10px] font-bold text-white bg-jj-blue px-1.5 py-0.5 rounded">
							@
						</span>
						<span className="font-mono text-sm text-jj-purple font-bold">
							{wc?.changeId.slice(0, 8) ?? "???"}
						</span>
						<span className="text-xs text-text-muted">
							{wc?.description || "(no description)"}
						</span>
						{wc?.empty && (
							<span className="text-[10px] bg-yellow-500/15 text-yellow-400 px-1.5 py-0.5 rounded">
								empty
							</span>
						)}
					</div>
					{parent && (
						<div className="text-[11px] text-text-muted mb-2">
							parent: <span className="font-mono text-jj-purple">{parent.changeId.slice(0, 8)}</span>
							{" "}{parent.description || "(no description)"}
						</div>
					)}
					{hasChanges ? (
						<div className="flex gap-3 flex-wrap">
							{diffSummary.map((f) => (
								<div
									key={f.path}
									className="flex items-center gap-1 text-[11px] font-mono"
								>
									<span className={`font-bold ${STATUS_COLOR[f.status] ?? "text-text-muted"}`}>
										{f.status}
									</span>
									<span className="text-text-secondary">{f.path}</span>
								</div>
							))}
						</div>
					) : (
						<div className="text-xs text-text-dim">
							{t("wcStatus.noChanges")}
						</div>
					)}
				</div>

				{/* Operation cards */}
				<div className="space-y-3 mb-8">
					<h3 className="text-sm font-bold text-text-primary">
						{t("whatToDo")}
					</h3>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
						{OPERATIONS.map((op) => {
							const isExpanded = expandedOp === op.id;
							const isDisabled = op.requiresChanges && !hasChanges;

							return (
								<button
									key={op.id}
									type="button"
									onClick={() => setExpandedOp(isExpanded ? null : op.id)}
									disabled={isDisabled}
									className={`text-left border rounded-lg p-4 transition-all ${
										isExpanded
											? "border-jj-purple bg-jj-purple/8 shadow-sm"
											: isDisabled
												? "border-border bg-surface opacity-50 cursor-not-allowed"
												: "border-border hover:border-jj-purple/50 hover:shadow-[0_2px_8px_rgba(0,0,0,0.3)] cursor-pointer"
									}`}
								>
									<div className="flex items-center gap-2 mb-1">
										<span className="font-bold text-sm">{op.name}</span>
										<code className="text-[10px] bg-surface-raised text-text-secondary px-1.5 py-0.5 rounded font-mono">
											{op.command}
										</code>
									</div>
									<div className="text-xs text-text-secondary mb-2">
										{t(`op.${op.id}.desc`)}
									</div>
									<div className="text-[10px] text-text-dim">
										git: <code className="bg-surface-raised px-1 rounded">{op.gitEquivalent}</code>
									</div>

									{isExpanded && (
										<div className="mt-3 pt-3 border-t border-jj-purple/20">
											<div className="flex gap-4">
												<div className="flex-1">
													<div className="text-[10px] font-bold text-text-dim uppercase mb-1">
														Before
													</div>
													<pre className="text-[11px] font-mono text-text-secondary bg-surface-card rounded p-2 border whitespace-pre leading-relaxed">
														{op.after}
													</pre>
												</div>
												<div className="flex items-center text-text-dim">→</div>
												<div className="flex-1">
													<div className="text-[10px] font-bold text-jj-purple uppercase mb-1">
														After
													</div>
													<pre className="text-[11px] font-mono text-text-secondary bg-jj-purple/8 rounded p-2 border border-jj-purple/20 whitespace-pre leading-relaxed">
														{op.before}
													</pre>
												</div>
											</div>
										</div>
									)}
								</button>
							);
						})}
					</div>
				</div>

				{/* Split simulator */}
				<div className="border-t border-border pt-6">
					<h3 className="text-sm font-bold text-text-primary mb-1">
						{t("splitSim.title")}
					</h3>
					<p className="text-xs text-text-muted mb-4" dangerouslySetInnerHTML={{ __html: t("splitSim.subtitle") }} />
					<SplitSimulator files={diffSummary} t={t} />
				</div>
			</div>
		</div>
	);
}
