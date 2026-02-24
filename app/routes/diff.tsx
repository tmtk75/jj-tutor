import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSearchParams } from "react-router";
import {
	getJjCommits,
	getJjDiffFull,
	getJjDiffSummary,
	getJjOperations,
} from "~/server/jj-parser";
import { REPO_PATH } from "~/server/config";
import { logLoader } from "~/server/logger";
import { DiffView } from "~/components/diff/DiffView";

export async function loader({ request }: LoaderFunctionArgs) {
	const start = performance.now();
	const url = new URL(request.url);
	const rev = url.searchParams.get("rev") || "@";
	const fromRev = url.searchParams.get("from") || undefined;
	const toRev = url.searchParams.get("to") || undefined;

	const [commits, diffContent, diffSummary, operations] = await Promise.all([
		getJjCommits(REPO_PATH),
		getJjDiffFull(REPO_PATH, rev, fromRev, toRev),
		fromRev && toRev
			? getJjDiffSummary(REPO_PATH, rev).catch(() => [])
			: getJjDiffSummary(REPO_PATH, rev),
		getJjOperations(REPO_PATH),
	]);

	logLoader("/diff", performance.now() - start, `rev=${rev}`);
	return { commits, diffContent, diffSummary, rev, fromRev, toRev, operations };
}

export default function Diff() {
	const data = useLoaderData<typeof loader>();
	const [, setSearchParams] = useSearchParams();

	return (
		<DiffView
			{...data}
			onChangeRev={(rev) => setSearchParams(rev ? { rev } : {})}
		/>
	);
}
