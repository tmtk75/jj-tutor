import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSearchParams } from "react-router";
import { getJjCommits } from "~/server/jj-parser";
import { predictRebase } from "~/server/rebase-predictor";
import { REPO_PATH } from "~/server/config";
import { logLoader } from "~/server/logger";
import { RebaseView } from "~/components/rebase/RebaseView";
import type { RebaseMode } from "~/shared";

const VALID_MODES: RebaseMode[] = ["revision", "subtree", "branch"];

export async function loader({ request }: LoaderFunctionArgs) {
	const start = performance.now();
	const url = new URL(request.url);
	const mode = url.searchParams.get("mode") as RebaseMode | null;
	const source = url.searchParams.get("source");
	const dest = url.searchParams.get("dest");

	const commits = await getJjCommits(REPO_PATH);
	const existingConflicts = commits.filter((c) => c.conflict);

	if (!mode || !VALID_MODES.includes(mode) || !source || !dest) {
		logLoader("/rebase", performance.now() - start);
		return { commits, prediction: null, existingConflicts };
	}

	const prediction = predictRebase(mode, source, dest, commits);
	logLoader("/rebase", performance.now() - start, `mode=${mode} src=${source.slice(0, 8)} dst=${dest.slice(0, 8)}`);
	return { commits, prediction, existingConflicts };
}

export default function Rebase() {
	const { commits, prediction, existingConflicts } =
		useLoaderData<typeof loader>();
	const [searchParams, setSearchParams] = useSearchParams();

	const selectedMode =
		(searchParams.get("mode") as RebaseMode) || "revision";
	const selectedSource = searchParams.get("source") || "";
	const selectedDest = searchParams.get("dest") || "";

	const updateParams = (updates: Record<string, string>) => {
		const next = new URLSearchParams(searchParams);
		for (const [k, v] of Object.entries(updates)) {
			if (v) {
				next.set(k, v);
			} else {
				next.delete(k);
			}
		}
		setSearchParams(next);
	};

	return (
		<RebaseView
			commits={commits}
			prediction={prediction}
			existingConflicts={existingConflicts}
			selectedMode={selectedMode}
			selectedSource={selectedSource}
			selectedDest={selectedDest}
			onModeChange={(mode) => updateParams({ mode })}
			onSourceChange={(source) => updateParams({ source })}
			onDestChange={(dest) => updateParams({ dest })}
		/>
	);
}
