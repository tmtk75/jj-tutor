import type { LoaderFunctionArgs } from "react-router";
import {
	getJjEvologWithOps,
	getJjDiffBetween,
	getJjDiffFull,
} from "~/server/jj-parser";
import { REPO_PATH } from "~/server/config";
import { logLoader } from "~/server/logger";

export async function loader({ request }: LoaderFunctionArgs) {
	const start = performance.now();
	const url = new URL(request.url);

	// Mode 1: Full diff between two commits (for expanded evolog view)
	const fromCommit = url.searchParams.get("from");
	const toCommit = url.searchParams.get("to");
	if (fromCommit && toCommit) {
		try {
			const diffContent = await getJjDiffFull(
				REPO_PATH,
				undefined,
				fromCommit,
				toCommit,
			);
			logLoader("/api/op-diff", performance.now() - start, `from=${fromCommit.slice(0, 8)} to=${toCommit.slice(0, 8)}`);
			return Response.json({ diffContent });
		} catch {
			logLoader("/api/op-diff", performance.now() - start, "diff-error");
			return Response.json({ diffContent: "" });
		}
	}

	// Mode 2: Evolog + summary diffs for a change
	const changeId = url.searchParams.get("changeId");
	if (!changeId) {
		return Response.json({ evolog: [], evologDiffs: [] });
	}

	try {
		const evolog = await getJjEvologWithOps(REPO_PATH, changeId);

		const evologDiffs: {
			from: string;
			to: string;
			files: { status: string; path: string }[];
		}[] = [];
		if (evolog.length > 1) {
			const diffPromises = evolog.slice(0, -1).map((entry, i) =>
				getJjDiffBetween(REPO_PATH, evolog[i + 1].commitId, entry.commitId)
					.then((files) => ({
						from: evolog[i + 1].commitId,
						to: entry.commitId,
						files,
					}))
					.catch(() => ({
						from: evolog[i + 1].commitId,
						to: entry.commitId,
						files: [],
					})),
			);
			evologDiffs.push(...(await Promise.all(diffPromises)));
		}

		logLoader("/api/op-diff", performance.now() - start, `changeId=${changeId.slice(0, 8)}`);
		return Response.json({ evolog, evologDiffs });
	} catch {
		logLoader("/api/op-diff", performance.now() - start, "evolog-error");
		return Response.json({ evolog: [], evologDiffs: [] });
	}
}
