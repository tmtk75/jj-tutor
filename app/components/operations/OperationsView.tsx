import { useCallback, useState } from "react";
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
				jj はリポジトリへの全操作を記録します。git の reflog
				よりも強力で、任意の操作を undo/restore できます。
				操作をクリックすると、その時点に戻すコマンドを確認できます。
			</p>

			{divergentChangeIds.length > 0 && (
				<div className="mb-4 rounded-lg border-2 border-amber-500/30 bg-amber-500/8 p-4 text-xs text-amber-300 space-y-2">
					<div className="flex items-center gap-2 font-bold text-sm">
						<span className="bg-amber-500 text-white px-1.5 py-0.5 rounded text-[10px]">??</span>
						Divergent Change が発生中
					</div>
					<div>
						change{" "}
						{divergentChangeIds.map((cid) => (
							<code key={cid} className="bg-amber-500/15 px-1 rounded font-mono font-bold">{cid.slice(0, 8)}</code>
						))}
						{" "}が分岐しています。下のタイムラインから<strong>分岐前の操作</strong>を探して
						<code className="bg-amber-500/15 px-1 rounded font-mono">jj op restore</code> で戻すのが確実です。
						<a href="/faq#divergent" className="text-amber-400 underline hover:text-amber-300 ml-1">詳細はFAQへ →</a>
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
								この操作時点に戻すには
							</div>
							<div className="text-text-secondary leading-relaxed">
								<strong>{selectedOp.description}</strong>
								<div className="text-text-dim text-[10px] mt-0.5">{selectedOp.time}</div>
							</div>

							{/* undo: only if 1 step back */}
							{stepsBack === 1 ? (
								<div className="space-y-2">
									<div className="text-text-primary">
										直前の操作なので <strong>jj undo</strong> が使えます:
									</div>
									<CopyableCmd command="jj undo" />
									<div className="text-text-muted pt-1.5 border-t border-amber-500/20">
										undo は直前の1操作を取り消す。undo 自体も undo できるので安心。
									</div>
								</div>
							) : (
								<div className="space-y-2">
									<div className="text-text-primary">
										{stepsBack} 操作前なので <strong>jj op restore</strong> を使います:
									</div>
									<CopyableCmd command={`jj op restore ${selectedOp.id.slice(0, 12)}`} />
									<div className="text-text-muted pt-1.5 border-t border-amber-500/20">
										op restore はリポジトリ全体をこの操作時点の状態に復元する。
										間の {stepsBack} 操作すべてが巻き戻される。
									</div>
									<div className="bg-git-red/8 border border-git-red/20 rounded p-2 text-git-red leading-relaxed">
										<strong>⚠ jj undo を {stepsBack} 回繰り返すのは NG</strong>
										<div className="mt-1 text-git-red">
											undo 自体が新しい操作として記録されるため、
											2回目の undo は「1回目の undo を取り消す」動作になり元に戻ってしまう。
											2操作以上戻すには op restore 一択。
										</div>
									</div>
								</div>
							)}

							{/* Always show op restore as alternative for 1-step case */}
							{stepsBack === 1 && (
								<div className="pt-2 border-t border-amber-500/20 text-text-muted space-y-1.5">
									<div>op restore でも同じ結果:</div>
									<CopyableCmd command={`jj op restore ${selectedOp.id.slice(0, 12)}`} />
								</div>
							)}

							{/* Diff commands */}
							<div className="pt-2 border-t border-amber-500/20 space-y-2">
								<div className="font-semibold text-text-primary">戻す前に確認</div>

								<div className="space-y-1.5">
									<div className="text-text-secondary">
										1. <strong>何が起きたか</strong>（commit の増減・移動）:
									</div>
									<CopyableCmd command={`jj op diff --from ${selectedOp.id.slice(0, 12)} --to @`} />
									<div className="text-text-muted">
										操作レベルの差分。どの commit が追加/削除/変更されたかを表示。
										コードの中身は出ない。
									</div>
								</div>

								<div className="space-y-1.5">
									<div className="text-text-secondary">
										2. <strong>コードの中身の差分</strong>:
									</div>
									<CopyableCmd command={`jj diff --at-operation ${selectedOp.id.slice(0, 12)} -r @`} />
									<div className="text-text-muted">
										操作時点での WC のファイル差分を表示。実際のコード変更が見える。
									</div>
								</div>

								<div className="bg-jj-blue/8 border border-jj-blue/20 rounded p-2 text-jj-blue leading-relaxed">
									<strong>op diff vs diff の違い</strong>
									<div className="mt-1 text-jj-blue">
										<strong>jj op diff</strong> = 操作の前後で「どの commit が動いたか」（メタ情報）
										<br />
										<strong>jj diff</strong> = 「コードの中身がどう変わったか」（ファイル内容）
										<br />
										<span className="text-jj-blue">op diff で commit ID を確認 → diff --from/--to でコードを見る、という2段階の使い方。</span>
									</div>
								</div>
							</div>

							{/* undo vs restore explanation */}
							<div className="pt-2 border-t border-amber-500/20">
								<div className="font-semibold text-text-primary mb-1.5">undo vs restore</div>
								<div className="space-y-1 text-text-muted">
									<div><strong>jj undo</strong> — 直前の1操作だけ取り消す。undo 自体も操作として記録されるため、連続実行すると「undo の undo」になる</div>
									<div><strong>jj op restore</strong> — 指定時点にリポ全体を復元。何操作前でも一発で戻れる</div>
									<div className="pt-1">どちらも op log に記録されるので、restore した後にさらに restore で元に戻すことも可能。</div>
								</div>
							</div>
						</div>
					) : selectedOp?.isCurrent ? (
						<div className="bg-jj-purple/8 rounded-lg p-4 border border-jj-purple/15 text-xs">
							<div className="font-bold text-sm text-jj-purple mb-2">現在の操作</div>
							<div className="text-text-secondary">
								これが最新の操作です。ここより新しい操作はありません。
							</div>
							<div className="mt-2 text-text-muted">
								直前の操作に戻すには:
							</div>
							<div className="mt-1.5">
								<CopyableCmd command="jj undo" />
							</div>
						</div>
					) : null}

					{/* git comparison */}
					<div className="bg-surface rounded-lg p-4 border text-xs space-y-2">
						<div className="font-bold text-sm mb-2">git との対応</div>
						<div>
							<strong>jj operation log</strong> → <strong>git reflog</strong>
							（ただし jj の方がはるかに詳細）
						</div>
						<div>
							<strong>jj undo</strong> →{" "}
							<strong>git reset / git reflog + checkout</strong>
							（jj の方が安全・簡単）
						</div>
						<div>
							<strong>jj op restore &lt;id&gt;</strong> →
							（git には直接の対応なし。リポ全体を過去の状態に戻せる）
						</div>
					</div>

					{/* ID guide */}
					<div className="bg-jj-purple/8 rounded-lg p-4 border border-jj-purple/15 text-xs space-y-2">
						<div className="font-bold text-sm text-jj-purple mb-2">ID の見方</div>
						<div className="flex items-center gap-2">
							<span className="text-[10px] text-text-dim bg-surface-raised px-1 py-0.5 rounded font-bold shrink-0">
								op
							</span>
							<span>
								— operation ID。操作ごとに付く ID。<code className="bg-jj-purple/15 px-1 rounded">jj op restore</code> で使う
							</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-[10px] text-jj-purple bg-jj-purple/15 px-1 py-0.5 rounded shrink-0">
								commit
							</span>
							<span>
								— commit ID。<strong>操作時点</strong>での対象コミットの ID
							</span>
						</div>
						<div className="pt-2 border-t border-jj-purple/20 text-text-muted">
							commit ID は git の commit hash と同じもの。jj ではファイルを編集するたびに commit ID が変わるため、ここに表示される ID は現在の <code className="bg-jj-purple/15 px-1 rounded">jj log</code> には存在しないことがある。change ID は不変なので追跡にはそちらを使う。
						</div>
					</div>

					{/* What gets recorded */}
					<div className="bg-jj-purple/8 rounded-lg p-4 border border-jj-purple/15 text-xs space-y-2">
						<div className="font-bold text-sm text-jj-purple mb-2">記録されるもの</div>
						<div>
							<strong>snapshot working copy</strong> — ファイル変更を検知して自動スナップショット。変更がなければ記録されない。
						</div>
						<div>
							<strong>new empty commit</strong> — jj new の実行
						</div>
						<div>
							<strong>rebase commit</strong> — jj rebase の実行
						</div>
						<div>
							<strong>describe commit</strong> — jj describe の実行
						</div>
						<div className="pt-2 border-t border-jj-purple/20 text-text-muted">
							全ての jj コマンドはまず working copy をチェックし、差分があれば snapshot を記録してから本来の操作を実行する。
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
