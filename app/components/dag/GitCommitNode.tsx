import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import type { GitCommit } from "~/shared";
import { CopyableHash } from "./CopyableHash";
import { RelativeTime } from "./RelativeTime";

type GitCommitNodeData = GitCommit & { label: string; [key: string]: unknown };
type GitCommitNodeType = Node<GitCommitNodeData, "gitCommit">;

function getGitHint(
	data: GitCommitNodeData,
	t: (key: string) => string,
): string | null {
	const hasJjKeep = data.refs.some((r) => r.includes("jj/keep"));
	const hasBranch = data.refs.some(
		(r) => !r.includes("HEAD") && !r.includes("jj/"),
	);
	const hasHead = data.refs.some((r) => r.includes("HEAD"));

	if (hasJjKeep && !hasBranch) {
		return t("gitHint.jjKeep");
	}
	if (hasHead && hasBranch) {
		return t("gitHint.headAndBranch");
	}
	if (hasHead) {
		return t("gitHint.head");
	}
	if (hasBranch) {
		return t("gitHint.branch");
	}
	if (data.parents.length === 0) {
		return t("gitHint.rootCommit");
	}
	return null;
}

export function GitCommitNode({ data }: NodeProps<GitCommitNodeType>) {
	const { t } = useTranslation("dag");
	const hasHead = data.refs.some((r) => r.includes("HEAD"));
	const hint = getGitHint(data, t);

	return (
		<div
			className={`rounded-lg border-2 ${hint ? "w-80" : "w-52"} ${
				hasHead
					? "border-git-orange bg-git-orange/10"
					: "border-border-strong bg-surface-card"
			}`}
		>
			<Handle
				type="target"
				position={Position.Bottom}
				className="!bg-text-dim !w-2 !h-2"
			/>
			<div className={hint ? "flex divide-x divide-border" : ""}>
				<div className="px-3 py-2 flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<CopyableHash
							short={data.hashShort}
							full={data.hash}
							className="text-xs text-git-orange font-bold"
						/>
						{hasHead && (
							<span className="text-[10px] font-bold text-white bg-git-orange px-1.5 py-0.5 rounded">
								HEAD
							</span>
						)}
					</div>
					<div className="text-xs text-text-secondary mt-1 truncate">
						{data.message || "(no message)"}
					</div>
					<div className="mt-0.5">
						<RelativeTime timestamp={data.timestamp} />
					</div>
					{data.refs.length > 0 && (
						<div className="flex gap-1 mt-1 flex-wrap">
							{data.refs
								.filter((r) => !r.includes("HEAD"))
								.map((r) => (
									<span
										key={r}
										className="text-[10px] bg-git-orange/15 text-git-orange px-1.5 py-0.5 rounded font-mono"
									>
										{r}
									</span>
								))}
						</div>
					)}
				</div>
				{hint && (
					<div className="w-28 px-2 py-2 text-[9px] text-text-dim leading-tight flex items-center">
						{hint}
					</div>
				)}
			</div>
			<Handle
				type="source"
				position={Position.Top}
				className="!bg-text-dim !w-2 !h-2"
			/>
		</div>
	);
}
