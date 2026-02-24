import { useState } from "react";
import { useTranslation } from "react-i18next";

// Static data: only non-translatable fields (command strings and item IDs)
const FAQ_ITEMS_META: { id?: string; cmds: string[] }[] = [
	{ cmds: ["jj undo", "jj op restore <op-id>", "jj restore --from @- <path>", "jj restore --from @-"] },
	{ cmds: ["jj log -r <change-id>", "jj log -r <commit-id>"] },
	{ cmds: ["jj split", "jj split <path>"] },
	{ cmds: ["jj new", 'jj commit -m "message"', 'jj describe -m "message"'] },
	{ cmds: ["jj abandon", "jj new"] },
	{ cmds: [] },
	{ cmds: ["jj bookmark create <name> -r @", "jj bookmark set <name> -r @", "jj bookmark delete <name>", "jj git push"] },
	{ cmds: ["jj new @-", "jj new @--", "jj new <change-id>", "jj edit <change-id>"] },
	{ cmds: ['jj describe -m "message"', "jj new <change-id>", "jj bookmark set <name> -r @"] },
	{ cmds: ["jj bookmark set <name> -r @", "jj bookmark list", "jj git push"] },
	{ cmds: ["jj resolve", "jj log -r 'conflict()'"] },
	{ cmds: ["jj rebase -r <rev> -d <dest>", "jj rebase -s <rev> -d <dest>", "jj rebase -b <rev> -d <dest>"] },
	{ cmds: ["jj op log", "jj undo", "jj op restore <op-id>", "jj op diff --op <op-id>"] },
	{ cmds: ["jj evolog -r @", "jj evolog -r <change-id>"] },
	{ id: "divergent", cmds: ["jj log", "jj abandon -r COMMIT_ID", "jj op log", "jj op restore OP_ID"] },
	{ cmds: ["jj git init", "jj git init --colocate", "jj git clone <url>"] },
	{ cmds: ["git clean -df", "git clean -xdf -e .jj"] },
	{ cmds: ["jj undo"] },
	{ cmds: ["jj st", "git status"] },
	{ cmds: ["jj restore --from <rev>- --to <rev> <path>", "jj restore --from <rev>- --to <rev> <path> --ignore-immutable", "jj undo"] },
	{ cmds: ["jj log", "jj diff -r @", 'jj describe -m "message"', "jj new"] },
];

export function FaqView() {
	const { t } = useTranslation("faq");
	const [selectedIdx, setSelectedIdx] = useState(() => {
		if (typeof window !== "undefined") {
			const hash = window.location.hash.slice(1);
			if (hash) {
				const idx = FAQ_ITEMS_META.findIndex((item) => item.id === hash);
				if (idx >= 0) return idx;
			}
		}
		return 0;
	});
	const selectedMeta = FAQ_ITEMS_META[selectedIdx];
	const detail = t(`items.${selectedIdx}.detail`, { defaultValue: "" });
	const gitComparison = t(`items.${selectedIdx}.gitComparison`, { defaultValue: "" });

	return (
		<div className="p-6 h-full flex flex-col">
			<h2 className="text-lg font-bold mb-2">{t("pageTitle")}</h2>
			<p className="text-xs text-text-muted mb-4">
				{t("pageDescription")}
			</p>

			<div className="flex gap-6 flex-1 min-h-0">
				{/* Left: question list */}
				<div className="w-72 shrink-0 overflow-y-auto space-y-1">
					{FAQ_ITEMS_META.map((_item, i) => (
						<button
							key={i}
							type="button"
							onClick={() => setSelectedIdx(i)}
							className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
								selectedIdx === i
									? "bg-jj-purple text-white"
									: "text-text-primary hover:bg-surface-raised"
							}`}
						>
							<span className={`font-bold mr-1.5 ${selectedIdx === i ? "text-purple-300" : "text-jj-purple"}`}>Q.</span>
							{t(`items.${i}.q`)}
						</button>
					))}
				</div>

				{/* Right: answer detail */}
				<div className="flex-1 overflow-y-auto">
					{selectedMeta && (
						<div className="space-y-4">
							<div className="bg-jj-purple/8 rounded-lg p-4 border border-jj-purple/20">
								<div className="flex gap-3 mb-3">
									<span className="text-jj-purple font-bold text-lg shrink-0">Q.</span>
									<h3 className="text-base font-bold">{t(`items.${selectedIdx}.q`)}</h3>
								</div>
								<div className="flex gap-3">
									<span className="text-jj-purple font-bold text-lg shrink-0">A.</span>
									<p className="text-sm text-text-primary leading-relaxed">{t(`items.${selectedIdx}.a`)}</p>
								</div>
							</div>

							{detail && (
								<div className="bg-surface rounded-lg p-4 border border-border text-sm text-text-primary leading-relaxed">
									{detail.split("\n").map((line, i) => {
										if (line.startsWith("## ")) {
											return <h3 key={i} className="font-bold text-base text-text-primary mt-4 mb-2 first:mt-0">{line.slice(3)}</h3>;
										}
										if (line.startsWith("### ")) {
											return <h4 key={i} className="font-bold text-sm text-text-secondary mt-3 mb-1">{line.slice(4)}</h4>;
										}
										if (line === "```") {
											return null;
										}
										if (line.startsWith("```")) {
											return null;
										}
										if (i > 0 && detail.split("\n")[i - 1]?.startsWith("```")) {
											return null;
										}
										// Check if inside a code block
										const lines = detail.split("\n");
										let inCode = false;
										for (let j = 0; j < i; j++) {
											if (lines[j] === "```" || lines[j]?.startsWith("```")) inCode = !inCode;
										}
										if (inCode) {
											return <code key={i} className="block font-mono text-xs bg-surface-raised border border-border rounded px-3 py-0.5 text-text-secondary">{line}</code>;
										}
										if (line === "") return <div key={i} className="h-1" />;
										return <p key={i}>{line}</p>;
									})}
								</div>
							)}

							{selectedMeta.cmds.length > 0 && (
								<div>
									<h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
										{t("relatedCommands")}
									</h4>
									<div className="grid grid-cols-2 gap-2">
										{selectedMeta.cmds.map((cmd, ci) => (
											<div key={cmd} className="bg-jj-purple/8 rounded-lg px-4 py-2.5 border border-jj-purple/20">
												<div className="text-[11px] text-text-muted mb-0.5">{t(`items.${selectedIdx}.cmdLabels.${ci}`)}</div>
												<code className="text-xs font-mono text-jj-purple font-bold">{cmd}</code>
											</div>
										))}
									</div>
								</div>
							)}

							{gitComparison && (
								<div>
									<h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
										{t("gitComparisonTitle")}
									</h4>
									<div className="bg-git-orange/8 rounded-lg p-4 border border-git-orange/20">
										<div className="flex items-center gap-2 mb-2">
											<span className="bg-git-orange text-white px-1.5 py-0.5 rounded text-[10px] font-bold">git</span>
											<span className="text-xs font-bold text-text-secondary">{t("gitDifference")}</span>
										</div>
										<p className="text-sm text-text-secondary leading-relaxed">{gitComparison}</p>
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
