import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSearchParams } from "react-router";
import { getJjCommits } from "~/server/jj-parser";
import { getGitCommits } from "~/server/git-parser";
import { REPO_PATH } from "~/server/config";
import { logLoader } from "~/server/logger";
import { DagView } from "~/components/dag/DagView";

export async function loader({ request }: LoaderFunctionArgs) {
	const start = performance.now();
	const url = new URL(request.url);
	const gitMode = url.searchParams.get("git");
	const [jjCommits, gitCommits] = await Promise.all([
		getJjCommits(REPO_PATH),
		getGitCommits(REPO_PATH, { includeJjRefs: gitMode === "all" }),
	]);
	logLoader("/", performance.now() - start, gitMode ? `git=${gitMode}` : undefined);
	return { jjCommits, gitCommits, gitMode };
}

export default function Home() {
	const { jjCommits, gitCommits, gitMode } = useLoaderData<typeof loader>();
	const [, setSearchParams] = useSearchParams();

	return (
		<DagView
			jjCommits={jjCommits}
			gitCommits={gitCommits}
			gitMode={gitMode === "all" ? "all" : "branches"}
			onToggleGitMode={(mode) => {
				if (mode === "all") {
					setSearchParams({ git: "all" });
				} else {
					setSearchParams({});
				}
			}}
		/>
	);
}
