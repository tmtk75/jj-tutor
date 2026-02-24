import { useLoaderData } from "react-router";
import { getJjOperations, getJjCommits } from "~/server/jj-parser";
import { REPO_PATH } from "~/server/config";
import { logLoader } from "~/server/logger";
import { OperationsView } from "~/components/operations/OperationsView";

export async function loader() {
	const start = performance.now();
	const [operations, commits] = await Promise.all([
		getJjOperations(REPO_PATH),
		getJjCommits(REPO_PATH),
	]);
	logLoader("/operations", performance.now() - start);
	return { operations, commits };
}

export default function Operations() {
	const { operations, commits } = useLoaderData<typeof loader>();
	return <OperationsView operations={operations} commits={commits} />;
}
