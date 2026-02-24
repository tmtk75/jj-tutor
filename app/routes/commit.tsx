import { useLoaderData } from "react-router";
import { getJjCommits, getJjDiffSummary, getJjStatus } from "~/server/jj-parser";
import { REPO_PATH } from "~/server/config";
import { logLoader } from "~/server/logger";
import { CommitView } from "~/components/commit/CommitView";

export async function loader() {
	const start = performance.now();
	const [commits, diffSummary, status] = await Promise.all([
		getJjCommits(REPO_PATH),
		getJjDiffSummary(REPO_PATH, "@"),
		getJjStatus(REPO_PATH),
	]);
	logLoader("/commit", performance.now() - start);
	return { commits, diffSummary, status };
}

export default function Commit() {
	const data = useLoaderData<typeof loader>();
	return <CommitView {...data} />;
}
