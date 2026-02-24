import { useLoaderData } from "react-router";
import { getJjStatus, getJjCommits } from "~/server/jj-parser";
import { getGitStatus } from "~/server/git-parser";
import { REPO_PATH } from "~/server/config";
import { logLoader } from "~/server/logger";
import { StatusView } from "~/components/status/StatusView";

export async function loader() {
	const start = performance.now();
	const [jjStatus, gitStatus, commits] = await Promise.all([
		getJjStatus(REPO_PATH),
		getGitStatus(REPO_PATH),
		getJjCommits(REPO_PATH),
	]);
	logLoader("/status", performance.now() - start);
	return { jjStatus, gitStatus, commits };
}

export default function Status() {
	const { jjStatus, gitStatus, commits } = useLoaderData<typeof loader>();
	return <StatusView jjStatus={jjStatus} gitStatus={gitStatus} commits={commits} />;
}
