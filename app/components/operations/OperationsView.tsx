import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import type { JjCommit, JjOperation } from "~/shared";

function formatArgs(tags: string): string | null {
	if (!tags) return null;
	const match = tags.match(/^args:\s*(.+)$/);
	if (!match) return tags;
	const raw = match[1];
	const tIdx = raw.indexOf(" -T ");
	if (tIdx !== -1) {
		return `${raw.slice(0, tIdx)} -T ...`;
	}
	if (raw.length > 80) {
		return `${raw.slice(0, 77)}...`;
	}
	return raw;
}

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

// Parse description to highlight commit IDs (40-char hex strings)
function DescriptionWithIds({ text }: { text: string }) {
	const parts = text.split(/([0-9a-f]{40})/g);
	if (parts.length === 1) return <>{text}</>;

	return (
		<>
			{parts.map((part, i) =>
				/^[0-9a-f]{40}$/.test(part) ? (
					<span key={i} className="inline-flex items-center gap-1">
						<span className="text-[10px] text-jj-purple bg-jj-purple/15 px-1 py-0.5 rounded">
							commit
						</span>
						<code className="text-xs font-mono text-jj-purple font-bold">
							{part.slice(0, 12)}
						</code>
					</span>
				) : (
					<span key={i}>{part}</span>
				),
			)}
		</>
	);
}

export function OperationsView({
	operations,
	commits,
}: {
	operations: JjOperation[];
	commits: JjCommit[];
}) {
	const { t } = useTranslation("operations");
	const [selectedOpId, setSelectedOpId] = useState<string | null>(null);
	const currentIdx = operations.findIndex((op) => op.isCurrent);
	const divergentCommits = commits.filter((c) => c.divergent);
	const divergentChangeIds = [...new Set(divergentCommits.map((c) => c.changeId))];

	if (operations.length === 0) return null;

	const selectedOp = selectedOpId ? operations.find((op) => op.id === selectedOpId) : null;
	const selectedIdx = selectedOpId ? operations.findIndex((op) => op.id === selectedOpId) : -1;
	// How many steps back from current
	const stepsBack = selectedIdx >= 0 && currentIdx >= 0 ? selectedIdx - currentIdx : 0;

	return (
		<div className="p-6 h-full flex flex-col">
			<h2 className="text-lg font-bold mb-2">Operation Log</h2>
			<p className="text-xs text-text-muted mb-4">
				{t("pageDescription")}
			</p>

			{divergentChangeIds.length > 0 && (
				<div className="mb-4 rounded-lg border-2 border-amber-500/30 bg-amber-500/8 p-4 text-xs text-amber-300 space-y-2">
					<div className="flex items-center gap-2 font-bold text-sm">
						<span className="bg-amber-500 text-white px-1.5 py-0.5 rounded text-[10px]">??</span>
						{t("divergentBanner.title")}
					</div>
					<div>
						change{" "}
						{divergentChangeIds.map((cid) => (
							<code key={cid} className="bg-amber-500/15 px-1 rounded font-mono font-bold">{cid.slice(0, 8)}</code>
						))}
						{" "}{t("divergentBanner.description")}
						<code className="bg-amber-500/15 px-1 rounded font-mono">jj op restore</code> {t("divergentBanner.restoreHint")}
						<a href="/faq#divergent" className="text-amber-400 underline hover:text-amber-300 ml-1">{t("divergentBanner.faqLink")}</a>
					</div>
				</div>
			)}

			<div className="flex gap-6 flex-1 min-h-0">
				{/* Left: timeline */}
				<div className="flex-1 overflow-y-auto min-w-0">
					<div className="space-y-0">
						{operations.map((op, i) => {
							const isSelected = selectedOpId === op.id;
							const isPast = i > currentIdx;

							return (
								<button
									type="button"
									key={op.id}
									onClick={() => setSelectedOpId(isSelected ? null : op.id)}
									className={`flex gap-4 w-full text-left cursor-pointer rounded-lg transition-colors px-2 py-0.5 ${
										isSelected
											? "bg-jj-purple/8 ring-1 ring-jj-purple/30"
											: "hover:bg-surface"
									}`}
								>
									<div className="flex flex-col items-center">
										<div
											className={`w-3 h-3 rounded-full border-2 shrink-0 mt-1 ${
												op.isCurrent
													? "bg-jj-purple border-jj-purple"
													: isSelected
														? "bg-jj-purple/30 border-jj-purple"
														: isPast
															? "bg-surface-raised border-border-strong"
															: "bg-surface-card border-border-strong"
											}`}
										/>
										{i < operations.length - 1 && (
											<div className={`w-0.5 flex-1 ${isPast ? "bg-border" : "bg-border"}`} />
										)}
									</div>
									<div className="pb-3 flex-1 min-w-0">
										<div className="flex items-center gap-3">
											<span className="text-[10px] text-text-dim bg-surface-raised px-1 py-0.5 rounded font-bold">
												op
											</span>
											<span className="font-mono text-xs text-text-dim">
												{op.id.slice(0, 12)}
											</span>
											{op.isCurrent && (
												<span className="text-[10px] font-bold text-white bg-jj-purple px-1.5 py-0.5 rounded">
													current
												</span>
											)}
										</div>
										<div className="text-sm mt-1">
											<DescriptionWithIds text={op.description} />
										</div>
										{formatArgs(op.tags) && (
											<div className="text-[11px] text-text-dim font-mono mt-0.5 truncate">
												{formatArgs(op.tags)}
											</div>
										)}
										<div className="text-xs text-text-dim mt-0.5">
											{op.time}
										</div>
									</div>
								</button>
							);
						})}
					</div>
				</div>

				{/* Right: context-sensitive panel */}
				<div className="w-96 shrink-0 space-y-4 overflow-y-auto">
					{/* Restore panel - shown when an op is selected */}
					{selectedOp && !selectedOp.isCurrent ? (
						<div className="bg-amber-500/8 rounded-lg p-4 border border-amber-500/20 text-xs space-y-3">
							<div className="font-bold text-sm text-amber-300 mb-1">
								{t("restore.title")}
							</div>
							<div className="text-text-secondary leading-relaxed">
								<strong>{selectedOp.description}</strong>
								<div className="text-text-dim text-[10px] mt-0.5">{selectedOp.time}</div>
							</div>

							{/* undo: only if 1 step back */}
							{stepsBack === 1 ? (
								<div className="space-y-2">
									<div className="text-text-primary">
										{t("restore.undoAvailable", { interpolation: { escapeValue: false } }).split("<1>").map((part, i) => {
											if (i === 0) return <span key={i}>{part}</span>;
											const [bold, rest] = part.split("</1>");
											return <span key={i}><strong>{bold}</strong>{rest}</span>;
										})}
									</div>
									<CopyableCmd command="jj undo" />
									<div className="text-text-muted pt-1.5 border-t border-amber-500/20">
										{t("restore.undoNote")}
									</div>
								</div>
							) : (
								<div className="space-y-2">
									<div className="text-text-primary">
										{t("restore.opRestoreNeeded", { stepsBack, interpolation: { escapeValue: false } }).split("<1>").map((part, i) => {
											if (i === 0) return <span key={i}>{part}</span>;
											const [bold, rest] = part.split("</1>");
											return <span key={i}><strong>{bold}</strong>{rest}</span>;
										})}
									</div>
									<CopyableCmd command={`jj op restore ${selectedOp.id.slice(0, 12)}`} />
									<div className="text-text-muted pt-1.5 border-t border-amber-500/20">
										{t("restore.opRestoreNote", { stepsBack })}
									</div>
									<div className="bg-git-red/8 border border-git-red/20 rounded p-2 text-git-red leading-relaxed">
										<strong>{t("restore.undoRepeatWarning", { stepsBack })}</strong>
										<div className="mt-1 text-git-red">
											{t("restore.undoRepeatExplanation")}
										</div>
									</div>
								</div>
							)}

							{/* Always show op restore as alternative for 1-step case */}
							{stepsBack === 1 && (
								<div className="pt-2 border-t border-amber-500/20 text-text-muted space-y-1.5">
									<div>{t("restore.opRestoreAlternative")}</div>
									<CopyableCmd command={`jj op restore ${selectedOp.id.slice(0, 12)}`} />
								</div>
							)}

							{/* Diff commands */}
							<div className="pt-2 border-t border-amber-500/20 space-y-2">
								<div className="font-semibold text-text-primary">{t("beforeRestore.title")}</div>

								<div className="space-y-1.5">
									<div className="text-text-secondary">
										{t("beforeRestore.whatHappened", { interpolation: { escapeValue: false } }).split("<1>").map((part, i) => {
											if (i === 0) return <span key={i}>{part}</span>;
											const [bold, rest] = part.split("</1>");
											return <span key={i}><strong>{bold}</strong>{rest}</span>;
										})}
									</div>
									<CopyableCmd command={`jj op diff --from ${selectedOp.id.slice(0, 12)} --to @`} />
									<div className="text-text-muted">
										{t("beforeRestore.whatHappenedNote")}
									</div>
								</div>

								<div className="space-y-1.5">
									<div className="text-text-secondary">
										{t("beforeRestore.codeDiff", { interpolation: { escapeValue: false } }).split("<1>").map((part, i) => {
											if (i === 0) return <span key={i}>{part}</span>;
											const [bold, rest] = part.split("</1>");
											return <span key={i}><strong>{bold}</strong>{rest}</span>;
										})}
									</div>
									<CopyableCmd command={`jj diff --at-operation ${selectedOp.id.slice(0, 12)} -r @`} />
									<div className="text-text-muted">
										{t("beforeRestore.codeDiffNote")}
									</div>
								</div>

								<div className="bg-jj-blue/8 border border-jj-blue/20 rounded p-2 text-jj-blue leading-relaxed">
									<strong>{t("beforeRestore.opDiffVsDiff.title")}</strong>
									<div className="mt-1 text-jj-blue">
										<strong>jj op diff</strong> {t("beforeRestore.opDiffVsDiff.opDiffDesc")}
										<br />
										<strong>jj diff</strong> {t("beforeRestore.opDiffVsDiff.diffDesc")}
										<br />
										<span className="text-jj-blue">{t("beforeRestore.opDiffVsDiff.workflow")}</span>
									</div>
								</div>
							</div>

							{/* undo vs restore explanation */}
							<div className="pt-2 border-t border-amber-500/20">
								<div className="font-semibold text-text-primary mb-1.5">{t("undoVsRestore.title")}</div>
								<div className="space-y-1 text-text-muted">
									<div><strong>jj undo</strong> {t("undoVsRestore.undoDesc")}</div>
									<div><strong>jj op restore</strong> {t("undoVsRestore.restoreDesc")}</div>
									<div className="pt-1">{t("undoVsRestore.note")}</div>
								</div>
							</div>
						</div>
					) : selectedOp?.isCurrent ? (
						<div className="bg-jj-purple/8 rounded-lg p-4 border border-jj-purple/15 text-xs">
							<div className="font-bold text-sm text-jj-purple mb-2">{t("currentOp.title")}</div>
							<div className="text-text-secondary">
								{t("currentOp.description")}
							</div>
							<div className="mt-2 text-text-muted">
								{t("currentOp.undoHint")}
							</div>
							<div className="mt-1.5">
								<CopyableCmd command="jj undo" />
							</div>
						</div>
					) : null}

					{/* git comparison */}
					<div className="bg-surface rounded-lg p-4 border text-xs space-y-2">
						<div className="font-bold text-sm mb-2">{t("gitComparison.title")}</div>
						<div>
							<strong>jj operation log</strong> {t("gitComparison.opLog", { interpolation: { escapeValue: false } }).split("<1>").map((part, i) => {
								if (i === 0) return <span key={i}>{part}</span>;
								const [bold, rest] = part.split("</1>");
								return <span key={i}><strong>{bold}</strong>{rest}</span>;
							})}
						</div>
						<div>
							<strong>jj undo</strong> {t("gitComparison.undo", { interpolation: { escapeValue: false } }).split("<1>").map((part, i) => {
								if (i === 0) return <span key={i}>{part}</span>;
								const [bold, rest] = part.split("</1>");
								return <span key={i}><strong>{bold}</strong>{rest}</span>;
							})}
						</div>
						<div>
							<strong>jj op restore &lt;id&gt;</strong>{" "}
							{t("gitComparison.opRestore")}
						</div>
					</div>

					{/* ID guide */}
					<div className="bg-jj-purple/8 rounded-lg p-4 border border-jj-purple/15 text-xs space-y-2">
						<div className="font-bold text-sm text-jj-purple mb-2">{t("idGuide.title")}</div>
						<div className="flex items-center gap-2">
							<span className="text-[10px] text-text-dim bg-surface-raised px-1 py-0.5 rounded font-bold shrink-0">
								op
							</span>
							<span>
								{t("idGuide.opIdDesc")} <code className="bg-jj-purple/15 px-1 rounded">jj op restore</code> {t("idGuide.opIdUsage")}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-[10px] text-jj-purple bg-jj-purple/15 px-1 py-0.5 rounded shrink-0">
								commit
							</span>
							<span>
								{t("idGuide.commitIdDesc")} <strong>{t("idGuide.commitIdNote")}</strong>
							</span>
						</div>
						<div className="pt-2 border-t border-jj-purple/20 text-text-muted">
							{t("idGuide.footer")} <code className="bg-jj-purple/15 px-1 rounded">jj log</code> {t("idGuide.footerNote")}
						</div>
					</div>

					{/* What gets recorded */}
					<div className="bg-jj-purple/8 rounded-lg p-4 border border-jj-purple/15 text-xs space-y-2">
						<div className="font-bold text-sm text-jj-purple mb-2">{t("recorded.title")}</div>
						<div>
							<strong>snapshot working copy</strong> {t("recorded.snapshot")}
						</div>
						<div>
							<strong>new empty commit</strong> {t("recorded.newCommit")}
						</div>
						<div>
							<strong>rebase commit</strong> {t("recorded.rebase")}
						</div>
						<div>
							<strong>describe commit</strong> {t("recorded.describe")}
						</div>
						<div className="pt-2 border-t border-jj-purple/20 text-text-muted">
							{t("recorded.footer")}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
