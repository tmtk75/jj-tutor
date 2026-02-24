import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSearchParams } from "react-router";
import { getJjCommits } from "~/server/jj-parser";
import { predict } from "~/server/whatif-predictor";
import { REPO_PATH } from "~/server/config";
import { logLoader } from "~/server/logger";
import { WhatIfView } from "~/components/whatif/WhatIfView";
import type { WhatIfPrediction } from "~/shared";

export async function loader({ request }: LoaderFunctionArgs) {
	const start = performance.now();
	const url = new URL(request.url);
	const cmdId = url.searchParams.get("cmd");

	if (!cmdId) {
		logLoader("/whatif", performance.now() - start);
		return { prediction: null as WhatIfPrediction | null };
	}

	const jjCommits = await getJjCommits(REPO_PATH);

	let prevCommits: typeof jjCommits | undefined;
	if (cmdId === "jj-undo") {
		try {
			prevCommits = await getJjCommits(REPO_PATH, { atOperation: "@-" });
		} catch {
			prevCommits = undefined;
		}
	}

	const prediction = predict(cmdId, jjCommits, prevCommits);
	logLoader("/whatif", performance.now() - start, `cmd=${cmdId}`);
	return { prediction };
}

export default function WhatIf() {
	const { prediction } = useLoaderData<typeof loader>();
	const [searchParams, setSearchParams] = useSearchParams();
	const selectedCmd = searchParams.get("cmd");

	return (
		<WhatIfView
			selectedCmd={selectedCmd}
			prediction={prediction}
			onSelectCmd={(cmdId) => setSearchParams({ cmd: cmdId })}
		/>
	);
}
