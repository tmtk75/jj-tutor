import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSearchParams } from "react-router";
import { getJjCommits, evalRevset } from "~/server/jj-parser";
import { REPO_PATH } from "~/server/config";
import { logLoader } from "~/server/logger";
import { RevsetView } from "~/components/revset/RevsetView";

export async function loader({ request }: LoaderFunctionArgs) {
	const start = performance.now();
	const url = new URL(request.url);
	const revsetExpr = url.searchParams.get("r");

	const commits = await getJjCommits(REPO_PATH);

	if (!revsetExpr) {
		logLoader("/revset", performance.now() - start);
		return { commits, matchedIds: null, error: null, expr: null };
	}

	const result = await evalRevset(REPO_PATH, revsetExpr);
	logLoader("/revset", performance.now() - start, `r=${revsetExpr}`);
	if ("error" in result) {
		return { commits, matchedIds: null, error: result.error, expr: revsetExpr };
	}
	return { commits, matchedIds: result.commitIds, error: null, expr: revsetExpr };
}

export default function Revset() {
	const { commits, matchedIds, error, expr } = useLoaderData<typeof loader>();
	const [searchParams, setSearchParams] = useSearchParams();

	const currentExpr = searchParams.get("r") || "";

	const handleSubmit = (revset: string) => {
		if (revset.trim()) {
			setSearchParams({ r: revset.trim() });
		} else {
			setSearchParams({});
		}
	};

	return (
		<RevsetView
			commits={commits}
			matchedIds={matchedIds}
			error={error}
			expr={expr}
			currentInput={currentExpr}
			onSubmit={handleSubmit}
		/>
	);
}
