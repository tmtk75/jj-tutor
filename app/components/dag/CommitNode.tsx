import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import type { JjCommit } from "~/shared";
import { CopyableHash } from "./CopyableHash";
import { RelativeTime } from "./RelativeTime";

type CommitNodeData = JjCommit & { label: string; [key: string]: unknown };
type CommitNodeType = Node<CommitNodeData, "commit">;

function getNodeHint(
	data: CommitNodeData,
	t: (key: string) => string,
): string | null {
	const isRoot = data.changeId === "zzzzzzzzzzzz";
	if (isRoot) return t("hint.root");
	if (data.isWorkingCopy && data.empty) return t("hint.workingCopyEmpty");
	if (data.isWorkingCopy) return t("hint.workingCopy");
	if (data.immutable) return t("hint.immutable");
	if (data.divergent) return t("hint.divergent");
	if (data.conflict) return t("hint.conflict");
	if (data.empty) return t("hint.empty");
	return t("hint.normal");
}

export function CommitNode({ data }: NodeProps<CommitNodeType>) {
	const { t } = useTranslation("dag");
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

	const hint = getNodeHint(data, t);

	const highlight = data._highlight as
		| "source"
		| "dest"
		| "moved"
		| "match"
		| null
		| undefined;
	const dimmed = Boolean(data._dimmed);
	const highlightRing =
		highlight === "source"
			? "ring-2 ring-green-400"
			: highlight === "dest"
				? "ring-2 ring-blue-400"
				: highlight === "moved"
					? "ring-2 ring-purple-400"
					: highlight === "match"
						? "ring-2 ring-jj-purple"
						: "";
	const highlightLabel =
		highlight === "source"
			? t("highlightLabel.source")
			: highlight === "dest"
				? t("highlightLabel.dest")
				: highlight === "moved"
					? t("highlightLabel.moved")
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
			<Handle
				type="target"
				position={Position.Bottom}
				className="!bg-text-dim !w-2 !h-2"
			/>
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
						{data.immutable && (
							<span className="text-sm text-immutable-gray">◆</span>
						)}
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
			<Handle
				type="source"
				position={Position.Top}
				className="!bg-text-dim !w-2 !h-2"
			/>
		</div>
	);
}
