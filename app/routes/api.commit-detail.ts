import type { LoaderFunctionArgs } from "react-router";
import {
	getJjDiffSummary,
	getJjDiffBetween,
	getJjEvologStructured,
} from "~/server/jj-parser";
import { REPO_PATH } from "~/server/config";
import { logLoader, logLoaderError } from "~/server/logger";

export async function loader({ request }: LoaderFunctionArgs) {
	const start = performance.now();
	const url = new URL(request.url);
	const rev = url.searchParams.get("rev");
	if (!rev) {
		return Response.json({ error: "rev required" }, { status: 400 });
	}

	try {
		const [evolog, diff] = await Promise.all([
			getJjEvologStructured(REPO_PATH, rev),
			getJjDiffSummary(REPO_PATH, rev),
		]);

		// Compute diffs between consecutive evolog snapshots
		const evologDiffs: { from: string; to: string; files: { status: string; path: string }[] }[] = [];
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

		logLoader("/api/commit-detail", performance.now() - start, `rev=${rev}`);
		return Response.json({ evolog, diff, evologDiffs });
	} catch (e) {
		logLoaderError("/api/commit-detail", e, performance.now() - start);
		const message = e instanceof Error ? e.message : String(e);
		return Response.json({ error: message, evolog: [], diff: [], evologDiffs: [] });
	}
}
