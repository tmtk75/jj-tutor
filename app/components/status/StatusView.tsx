import { useTranslation } from "react-i18next";
import type { JjCommit, JjStatus, GitStatus } from "~/shared";

const STATUS_COLOR: Record<string, string> = {
	A: "text-wc-green",
	M: "text-jj-blue",
	D: "text-git-red",
	R: "text-yellow-400",
};

interface OpComparison {
	label: string;
	jj: { cmd: string; desc: string };
	git: { cmd: string; desc: string };
}

const OP_COMPARISONS: OpComparison[] = [
	{
		label: "変更を記録",
		jj: {
			cmd: "（自動）",
			desc: "ファイル保存 → 自動でコミットに反映。staging 不要。jj は常にスナップショットを取る。",
		},
		git: {
			cmd: "git add . && git commit",
			desc: "git add でステージング → git commit で確定。2段階必要。",
		},
	},
	{
		label: "新しいコミットを作る",
		jj: {
			cmd: "jj new",
			desc: "現在の作業コピーの上に空のコミットを作成。git では空コミットは --allow-empty が必要。",
		},
		git: {
			cmd: "git commit --allow-empty",
			desc: "空コミットは特殊操作。通常は変更をステージしてから commit。",
		},
	},
	{
		label: "コミットを分割",
		jj: {
			cmd: "jj split",
			desc: "インタラクティブに1つのコミットを2つに分割。対話的に変更を選択。",
		},
		git: {
			cmd: "git rebase -i → edit → git reset HEAD~1 → git add -p → git commit × 2",
			desc: "rebase -i で edit に変更 → reset で戻す → 部分的に add → 複数回 commit。手順が多い。",
		},
	},
	{
		label: "直前のコミットに統合",
		jj: {
			cmd: "jj squash",
			desc: "作業コピーの変更を親コミットに統合。git の amend + add に相当。",
		},
		git: {
			cmd: "git add . && git commit --amend",
			desc: "add でステージング → --amend で直前コミットを書き換え。",
		},
	},
	{
		label: "過去のコミットを編集",
		jj: {
			cmd: "jj edit <rev>",
			desc: "過去のコミットに直接移動して編集可能。作業コピーがそのコミットになる。",
		},
		git: {
			cmd: "git rebase -i → edit",
			desc: "rebase -i で edit マーク → そのコミットで停止 → 修正 → git rebase --continue。",
		},
	},
	{
		label: "リベース",
		jj: {
			cmd: "jj rebase -r <rev> -d <dest>",
			desc: "任意のコミットを別の親に移動。conflict があっても中断せずコミットとして記録（後で解消可能）。",
		},
		git: {
			cmd: "git rebase <dest>",
			desc: "conflict 発生で中断。解消 → git rebase --continue を繰り返す必要あり。",
		},
	},
	{
		label: "ブランチ作成",
		jj: {
			cmd: "jj bookmark create <name>",
			desc: "bookmark = git のブランチ。jj ではブランチなしでも開発可能（匿名ブランチ的）。",
		},
		git: {
			cmd: "git branch <name> / git checkout -b <name>",
			desc: "ブランチは必須。ブランチなしではコミットが迷子になる（detached HEAD）。",
		},
	},
	{
		label: "マージ",
		jj: {
			cmd: "jj new <rev1> <rev2>",
			desc: "複数の親を持つ新しいコミットを作成。jj new で任意個数の親を指定可能。",
		},
		git: {
			cmd: "git merge <branch>",
			desc: "2つのブランチをマージ。conflict 時は解消必須。octopus merge も可能だが稀。",
		},
	},
	{
		label: "ファイルの変更を戻す",
		jj: {
			cmd: "jj restore --from @- <path>",
			desc: "指定ファイルを親コミットの状態に復元。全ファイルなら jj restore --from @-。staging の概念がないので1コマンド。",
		},
		git: {
			cmd: "git restore <path> / git checkout -- <path>",
			desc: "unstaged の変更を戻す。staged を戻すには先に git restore --staged が必要。2段階。",
		},
	},
	{
		label: "変更を取り消す（操作単位）",
		jj: {
			cmd: "jj undo / jj op restore",
			desc: "操作単位で取り消し。jj undo で直前の操作を元に戻す。op restore で任意の時点に復元。",
		},
		git: {
			cmd: "git reset / git revert / git reflog",
			desc: "reset (履歴を戻す), revert (新コミットで打ち消し), reflog (参照ログから復元)。用途で使い分け。",
		},
	},
];

function ContextualTips({
	jjStatus,
	gitStatus,
	t,
}: { jjStatus: JjStatus; gitStatus: GitStatus; t: (key: string, options?: Record<string, unknown>) => string }) {
	const hasJjChanges = jjStatus.files.length > 0;
	const hasStaged = gitStatus.staged.length > 0;
	const hasUnstaged = gitStatus.unstaged.length > 0;
	const hasUntracked = gitStatus.untracked.length > 0;

	if (!hasJjChanges && !hasStaged && !hasUnstaged && !hasUntracked) return null;

	return (
		<div className="mb-8 space-y-3">
			<h2 className="text-lg font-bold">{t("tips.title")}</h2>

			{hasUnstaged && (
				<div className="rounded-lg border border-git-red/20 overflow-hidden">
					<div className="bg-git-red/8 px-4 py-2 text-sm font-bold text-git-red flex items-center gap-2">
						<span className="bg-git-orange text-white px-1.5 py-0.5 rounded text-[10px]">git</span>
						{t("tips.unstaged.title")}
					</div>
					<div className="p-4 grid grid-cols-2 divide-x divide-border text-xs">
						<div className="pr-4 space-y-2">
							<div className="font-bold text-git-orange">{t("tips.unstaged.gitRevert")}</div>
							<div>
								<code className="bg-git-orange/8 px-1.5 py-0.5 rounded font-mono text-git-orange">
									git restore &lt;path&gt;
								</code>
							</div>
							<p className="text-text-secondary">
								{t("tips.unstaged.gitRestorePath")}
							</p>
							<div>
								<code className="bg-git-orange/8 px-1.5 py-0.5 rounded font-mono text-git-orange">
									git restore --staged &lt;path&gt;
								</code>
							</div>
							<p className="text-text-secondary">
								{t("tips.unstaged.gitRestoreStaged")}
							</p>
						</div>
						<div className="pl-4 space-y-2">
							<div className="font-bold text-jj-purple">{t("tips.unstaged.jjRevert")}</div>
							<div>
								<code className="bg-jj-purple/8 px-1.5 py-0.5 rounded font-mono text-jj-purple">
									jj restore --from @- &lt;path&gt;
								</code>
							</div>
							<p className="text-text-secondary">
								{t("tips.unstaged.jjRestorePath")}
							</p>
							<div>
								<code className="bg-jj-purple/8 px-1.5 py-0.5 rounded font-mono text-jj-purple">
									jj restore --from @-
								</code>
							</div>
							<p className="text-text-secondary">
								{t("tips.unstaged.jjRestoreAll")}
							</p>
						</div>
					</div>
				</div>
			)}

			{hasStaged && !hasUnstaged && (
				<div className="rounded-lg border border-wc-green/20 overflow-hidden">
					<div className="bg-wc-green/8 px-4 py-2 text-sm font-bold text-wc-green flex items-center gap-2">
						<span className="bg-git-orange text-white px-1.5 py-0.5 rounded text-[10px]">git</span>
						{t("tips.staged.title")}
					</div>
					<div className="p-4 grid grid-cols-2 divide-x divide-border text-xs">
						<div className="pr-4 space-y-2">
							<div className="font-bold text-git-orange">{t("tips.staged.gitConfirm")}</div>
							<div>
								<code className="bg-git-orange/8 px-1.5 py-0.5 rounded font-mono text-git-orange">
									git commit -m "message"
								</code>
							</div>
							<p className="text-text-secondary">{t("tips.staged.gitConfirmDesc")}</p>
						</div>
						<div className="pl-4 space-y-2">
							<div className="font-bold text-jj-purple">{t("tips.staged.jjNote")}</div>
							<p className="text-text-secondary">
								{t("tips.staged.jjNoteDesc")}
							</p>
							<div>
								<code className="bg-jj-purple/8 px-1.5 py-0.5 rounded font-mono text-jj-purple">
									jj new
								</code>
							</div>
							<p className="text-text-secondary">
								{t("tips.staged.jjNewDesc")}
							</p>
						</div>
					</div>
				</div>
			)}

			{hasJjChanges && (
				<div className="rounded-lg border border-jj-purple/20 overflow-hidden">
					<div className="bg-jj-purple/8 px-4 py-2 text-sm font-bold text-jj-purple flex items-center gap-2">
						<span className="bg-jj-purple text-white px-1.5 py-0.5 rounded text-[10px]">jj</span>
						{t("tips.wcChanges.title", { count: jjStatus.files.length })}
					</div>
					<div className="p-4 text-xs space-y-3">
						<div className="grid grid-cols-3 gap-4">
							<div className="space-y-1">
								<div className="font-bold text-jj-purple">{t("tips.wcChanges.moveForward")}</div>
								<code className="bg-jj-purple/8 px-1.5 py-0.5 rounded font-mono text-jj-purple text-[11px]">
									jj new
								</code>
								<p className="text-text-muted">{t("tips.wcChanges.moveForwardDesc")}</p>
							</div>
							<div className="space-y-1">
								<div className="font-bold text-jj-purple">{t("tips.wcChanges.splitPart")}</div>
								<code className="bg-jj-purple/8 px-1.5 py-0.5 rounded font-mono text-jj-purple text-[11px]">
									jj split
								</code>
								<p className="text-text-muted">{t("tips.wcChanges.splitPartDesc")}</p>
							</div>
							<div className="space-y-1">
								<div className="font-bold text-jj-purple">{t("tips.wcChanges.squashToParent")}</div>
								<code className="bg-jj-purple/8 px-1.5 py-0.5 rounded font-mono text-jj-purple text-[11px]">
									jj squash
								</code>
								<p className="text-text-muted">{t("tips.wcChanges.squashToParentDesc")}</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* undo vs restore explanation */}
			<div className="rounded-lg border border-border overflow-hidden">
				<div className="bg-surface-raised px-4 py-2 text-sm font-bold">
					{t("tips.undoVsRestore.title")}
				</div>
				<div className="p-4 grid grid-cols-2 divide-x divide-border text-xs">
					<div className="pr-4 space-y-2">
						<div className="flex items-center gap-2 mb-1">
							<span className="bg-jj-purple text-white px-1.5 py-0.5 rounded text-[10px] font-bold">jj undo</span>
							<span className="text-text-muted">{t("tips.undoVsRestore.undoLabel")}</span>
						</div>
						<p className="text-text-secondary" dangerouslySetInnerHTML={{ __html: t("tips.undoVsRestore.undoDesc") }} />
						<div className="bg-surface rounded p-2 font-mono text-[11px] space-y-1">
							<div>{t("tips.undoVsRestore.undoExample1")}</div>
							<div className="text-text-dim">{t("tips.undoVsRestore.undoExample2")}</div>
							<div>{t("tips.undoVsRestore.undoExample3")}</div>
							<div className="text-green-600">{t("tips.undoVsRestore.undoExample4")}</div>
						</div>
						<p className="text-text-dim">{t("tips.undoVsRestore.undoGit")}</p>
					</div>
					<div className="pl-4 space-y-2">
						<div className="flex items-center gap-2 mb-1">
							<span className="bg-jj-purple text-white px-1.5 py-0.5 rounded text-[10px] font-bold">jj restore</span>
							<span className="text-text-muted">{t("tips.undoVsRestore.restoreLabel")}</span>
						</div>
						<p className="text-text-secondary" dangerouslySetInnerHTML={{ __html: t("tips.undoVsRestore.restoreDesc") }} />
						<div className="bg-surface rounded p-2 font-mono text-[11px] space-y-1">
							<div>{t("tips.undoVsRestore.restoreExample1")}</div>
							<div className="text-green-600">{t("tips.undoVsRestore.restoreExample2")}</div>
							<div className="mt-1">{t("tips.undoVsRestore.restoreExample3")}</div>
							<div className="text-green-600">{t("tips.undoVsRestore.restoreExample4")}</div>
						</div>
						<p className="text-text-dim">{t("tips.undoVsRestore.restoreGit")}</p>
					</div>
				</div>
			</div>
		</div>
	);
}

export function StatusView({
	jjStatus,
	gitStatus,
	commits,
}: { jjStatus: JjStatus; gitStatus: GitStatus; commits: JjCommit[] }) {
	const { t } = useTranslation("status");
	const gitTotalFiles =
		gitStatus.staged.length + gitStatus.unstaged.length + gitStatus.untracked.length;
	const divergentCommits = commits.filter((c) => c.divergent);
	const divergentChangeIds = [...new Set(divergentCommits.map((c) => c.changeId))];

	return (
		<div className="p-6 max-w-6xl h-full overflow-y-auto">
			<h2 className="text-lg font-bold mb-4">{t("title")}</h2>

			{divergentChangeIds.length > 0 && (
				<div className="mb-6 rounded-lg border-2 border-amber-500/30 bg-amber-500/8 overflow-hidden">
					<div className="bg-amber-500/15 px-4 py-2 text-sm font-bold text-amber-300 flex items-center gap-2">
						<span className="bg-amber-500 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">??</span>
						{t("divergent.title")}
					</div>
					<div className="p-4 text-xs text-amber-300 space-y-2">
						<div>
							{t("divergent.desc")}
							{divergentChangeIds.map((cid) => (
								<code key={cid} className="bg-amber-500/15 px-1.5 py-0.5 rounded font-mono ml-1 font-bold">{cid.slice(0, 8)}??</code>
							))}
						</div>
						<div className="text-amber-400 leading-relaxed">
							{t("divergent.explanation")}
							<a href="/faq#divergent" className="text-amber-400 underline hover:text-amber-300 ml-1">{t("divergent.detailLink")}</a>
						</div>
						<div className="grid grid-cols-2 gap-4 pt-2 border-t border-amber-500/20">
							<div className="space-y-1.5">
								<div className="font-bold text-amber-300">{t("divergent.method1Title")}</div>
								<div className="text-amber-400 space-y-1">
									<p dangerouslySetInnerHTML={{ __html: t("divergent.method1Step1") }} />
									<p dangerouslySetInnerHTML={{ __html: t("divergent.method1Step2") }} />
									<p dangerouslySetInnerHTML={{ __html: t("divergent.method1Step3") }} />
									<p dangerouslySetInnerHTML={{ __html: t("divergent.method1Step4") }} />
								</div>
							</div>
							<div className="space-y-1.5">
								<div className="font-bold text-amber-300">{t("divergent.method2Title")}</div>
								<code className="bg-amber-500/15 px-1.5 py-0.5 rounded font-mono text-[11px] block">
									jj op restore OP_ID
								</code>
								<p className="text-amber-400">
									{t("divergent.method2Desc")}
								</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* jj vs git status side by side */}
			<div className="grid grid-cols-2 gap-6 mb-8">
				{/* jj status */}
				<div>
					<h3 className="text-sm font-bold text-jj-purple mb-3 flex items-center gap-2">
						<span className="bg-jj-purple text-white px-2 py-0.5 rounded text-xs">jj</span>
						{t("jjStatus")}
					</h3>
					<div className="bg-surface rounded-lg p-4 border max-h-[50vh] overflow-y-auto">
						<div className="text-xs mb-3">
							<span className="text-text-muted">Working copy: </span>
							<span className="font-mono text-jj-purple font-bold">
								{jjStatus.workingCopyChangeId}
							</span>
							<span className="font-mono text-text-dim ml-2">
								{jjStatus.workingCopyCommitId}
							</span>
						</div>
						<div className="text-xs mb-4">
							<span className="text-text-muted">Parent: </span>
							<span className="font-mono">{jjStatus.parentChangeId}</span>
							<span className="text-text-dim ml-2">{jjStatus.parentDescription}</span>
						</div>

						<div className="bg-jj-blue/8 rounded p-2 mb-3 text-[10px] text-jj-blue border border-jj-blue/15">
							{t("stagingNotice")}
						</div>

						{jjStatus.files.length > 0 ? (
							<div className="space-y-1">
								<div className="text-xs text-text-muted mb-2">
									Changes ({jjStatus.files.length} files):
								</div>
								{jjStatus.files.map((f) => (
									<div key={f.path} className="flex items-center gap-2 text-xs font-mono">
										<span className={`w-5 text-center font-bold ${STATUS_COLOR[f.status] ?? "text-text-muted"}`}>
											{f.status}
										</span>
										<span className="text-text-primary truncate">{f.path}</span>
									</div>
								))}
							</div>
						) : (
							<div className="text-xs text-text-dim">No changes in working copy</div>
						)}
					</div>
				</div>

				{/* git status */}
				<div>
					<h3 className="text-sm font-bold text-git-orange mb-3 flex items-center gap-2">
						<span className="bg-git-orange text-white px-2 py-0.5 rounded text-xs">git</span>
						{t("gitStatusLabel")}
					</h3>
					<div className="bg-surface rounded-lg p-4 border max-h-[50vh] overflow-y-auto">
						<div className="text-xs mb-3">
							<span className="text-text-muted">Branch: </span>
							<span className="font-mono text-git-orange font-bold">
								{gitStatus.branch || "(detached HEAD)"}
							</span>
						</div>

						<div className="bg-git-orange/8 rounded p-2 mb-3 text-[10px] text-git-orange border border-git-orange/15">
							{t("gitStagingNotice")}
						</div>

						{gitTotalFiles > 0 ? (
							<div className="space-y-3">
								{gitStatus.staged.length > 0 && (
									<div>
										<div className="text-xs text-wc-green font-bold mb-1">
											Staged ({gitStatus.staged.length}):
										</div>
										<div className="space-y-1">
											{gitStatus.staged.map((f) => (
												<div key={`s-${f.path}`} className="flex items-center gap-2 text-xs font-mono">
													<span className={`w-5 text-center font-bold ${STATUS_COLOR[f.status] ?? "text-text-muted"}`}>
														{f.status}
													</span>
													<span className="text-text-primary truncate">{f.path}</span>
												</div>
											))}
										</div>
									</div>
								)}
								{gitStatus.unstaged.length > 0 && (
									<div>
										<div className="text-xs text-git-red font-bold mb-1">
											Unstaged ({gitStatus.unstaged.length}):
										</div>
										<div className="space-y-1">
											{gitStatus.unstaged.map((f) => (
												<div key={`u-${f.path}`} className="flex items-center gap-2 text-xs font-mono">
													<span className={`w-5 text-center font-bold ${STATUS_COLOR[f.status] ?? "text-text-muted"}`}>
														{f.status}
													</span>
													<span className="text-text-primary truncate">{f.path}</span>
												</div>
											))}
										</div>
									</div>
								)}
								{gitStatus.untracked.length > 0 && (
									<div>
										<div className="text-xs text-text-muted font-bold mb-1">
											Untracked ({gitStatus.untracked.length}):
										</div>
										<div className="space-y-1">
											{gitStatus.untracked.map((p) => (
												<div key={`t-${p}`} className="flex items-center gap-2 text-xs font-mono">
													<span className="w-5 text-center font-bold text-text-dim">?</span>
													<span className="text-text-muted truncate">{p}</span>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						) : (
							<div className="text-xs text-text-dim">No changes (clean)</div>
						)}
					</div>
				</div>
			</div>

			{/* Contextual tips based on current state */}
			<ContextualTips jjStatus={jjStatus} gitStatus={gitStatus} t={t} />

			{/* Operation comparison */}
			<div>
				<h2 className="text-lg font-bold mb-4">
					{t("opComp.title")}
				</h2>
				<p className="text-xs text-text-muted mb-4">
					{t("opComp.subtitle")}
				</p>
				<div className="space-y-3">
					{OP_COMPARISONS.map((op, idx) => (
						<div key={op.label} className="rounded-lg border overflow-hidden">
							<div className="bg-surface-raised px-4 py-2 text-sm font-bold">
								{t(`opComp.${idx}.label`)}
							</div>
							<div className="grid grid-cols-2 divide-x divide-border">
								<div className="p-4">
									<div className="flex items-center gap-2 mb-2">
										<span className="bg-jj-purple text-white px-2 py-0.5 rounded text-[10px] font-bold">
											jj
										</span>
										<code className="text-xs bg-jj-purple/8 px-2 py-1 rounded font-mono text-jj-purple">
											{op.jj.cmd}
										</code>
									</div>
									<p className="text-xs text-text-secondary leading-relaxed">{t(`opComp.${idx}.jj.desc`)}</p>
								</div>
								<div className="p-4">
									<div className="flex items-center gap-2 mb-2">
										<span className="bg-git-orange text-white px-2 py-0.5 rounded text-[10px] font-bold">
											git
										</span>
										<code className="text-xs bg-git-orange/8 px-2 py-1 rounded font-mono text-git-orange break-all">
											{op.git.cmd}
										</code>
									</div>
									<p className="text-xs text-text-secondary leading-relaxed">{t(`opComp.${idx}.git.desc`)}</p>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
