import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { JjCommit } from "~/shared";
import { CopyableHash } from "./CopyableHash";
import { RelativeTime } from "./RelativeTime";

type CommitNodeData = JjCommit & { label: string; [key: string]: unknown };
type CommitNodeType = Node<CommitNodeData, "commit">;

function getNodeHint(data: CommitNodeData): string | null {
	const isRoot = data.changeId === "zzzzzzzzzzzz";
	if (isRoot)
		return "全リポジトリ共通の仮想 root。git には存在しない概念。";
	if (data.isWorkingCopy && data.empty)
		return "@ = 作業コピー（empty）。git と違い作業コピー自体がコミット。git add 不要。jj new で新しい空コミットを作成。";
	if (data.isWorkingCopy)
		return "@ = 作業コピー。変更は自動で記録（git add 不要）。分割: jj split / 親に統合: jj squash";
	if (data.immutable)
		return "immutable: 書き換え不可。jj rebase の対象外。git の保護ブランチに近い。";
	if (data.divergent)
		return "divergent (??) : 同じ change ID が複数のコミットに分岐。jj describe と自動スナップショットが同時に起きると発生しやすい。jj abandon で片方を捨てるか jj op restore で戻す。";
	if (data.conflict)
		return "conflict: 競合あり。git と違い競合状態でもコミット可能。jj resolve で解消。";
	if (data.empty)
		return "empty: 変更なし。jj new で作成。git では空コミットは --allow-empty が必要だが jj では普通。";
	return "通常コミット。jj edit で過去コミットを直接編集可能（git rebase -i に相当）。";
}

export function CommitNode({ data }: NodeProps<CommitNodeType>) {
	const isRoot = data.changeId === "zzzzzzzzzzzz";

	const borderColor = data.divergent
		? "border-amber-500"
		: data.isWorkingCopy
			? "border-jj-blue"
			: data.immutable
				? "border-immutable-gray"
				: data.conflict
					? "border-git-red"
					: "border-border-strong";

	const bgColor = data.isWorkingCopy
		? "bg-jj-blue/10"
		: data.immutable
			? "bg-surface"
			: "bg-surface-card";

	const hint = getNodeHint(data);

	const highlight = data._highlight as
		| "source"
		| "dest"
		| "moved"
		| "match"
		| null
		| undefined;
	const dimmed = Boolean(data._dimmed);
	const highlightRing = highlight === "source"
		? "ring-2 ring-green-400"
		: highlight === "dest"
			? "ring-2 ring-blue-400"
			: highlight === "moved"
				? "ring-2 ring-purple-400"
				: highlight === "match"
					? "ring-2 ring-jj-purple"
					: "";
	const highlightLabel = highlight === "source"
		? "移動元"
		: highlight === "dest"
			? "移動先"
			: highlight === "moved"
				? "移動後"
				: highlight === "match"
					? "match"
					: null;

	return (
		<div
			className={`rounded-lg border-2 ${borderColor} ${bgColor} ${highlightRing} ${hint ? "w-80" : "w-52"} relative ${dimmed ? "opacity-40" : ""}`}
		>
			{highlightLabel && (
				<span
					className={`absolute -top-2.5 left-2 text-[9px] font-bold px-1.5 py-0 rounded ${
						highlight === "source"
							? "bg-green-400 text-white"
							: highlight === "dest"
								? "bg-blue-400 text-white"
								: highlight === "match"
									? "bg-jj-purple text-white"
									: "bg-purple-500 text-white"
					}`}
				>
					{highlightLabel}
				</span>
			)}
			<Handle type="target" position={Position.Bottom} className="!bg-text-dim !w-2 !h-2" />
			<div className={hint ? "flex divide-x divide-border" : ""}>
				<div className="px-3 py-2 flex-1 min-w-0">
					<div className="flex items-center gap-1.5">
						<CopyableHash
							short={data.changeId.slice(0, 8)}
							full={data.changeId}
							className="text-xs text-jj-purple font-bold"
						/>
						{!isRoot && (
							<CopyableHash
								short={data.commitId.slice(0, 8)}
								full={data.commitId}
								className="text-[10px] text-text-dim"
							/>
						)}
						{data.isWorkingCopy && (
							<span className="text-[10px] font-bold text-white bg-jj-blue px-1.5 py-0.5 rounded">
								@
							</span>
						)}
						{data.immutable && <span className="text-sm text-immutable-gray">◆</span>}
						{data.conflict && (
							<span className="text-[10px] font-bold text-white bg-git-red px-1.5 py-0.5 rounded">
								conflict
							</span>
						)}
						{data.divergent && (
							<span className="text-[10px] font-bold text-white bg-amber-500 px-1.5 py-0.5 rounded">
								??
							</span>
						)}
					</div>
					<div className="text-xs text-text-secondary mt-1 truncate">
						{data.description || "(no description)"}
					</div>
					{!isRoot && (
						<div className="mt-0.5">
							<RelativeTime timestamp={data.timestamp} />
						</div>
					)}
					{data.bookmarks.length > 0 && (
						<div className="flex gap-1 mt-1 flex-wrap">
							{data.bookmarks.map((b) => (
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
				{hint && (
					<div className="w-28 px-2 py-2 text-[9px] text-text-dim leading-tight flex items-center">
						{hint}
					</div>
				)}
			</div>
			<Handle type="source" position={Position.Top} className="!bg-text-dim !w-2 !h-2" />
		</div>
	);
}
