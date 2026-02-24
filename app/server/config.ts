import { execFileSync } from "node:child_process";

function detectRepoRoot(): string {
	try {
		return execFileSync("jj", ["workspace", "root", "--no-pager"], {
			encoding: "utf-8",
			timeout: 5000,
		}).trim();
	} catch {
		return process.cwd();
	}
}

export const REPO_PATH =
	process.env.JJ_TUTOR_REPO_PATH || detectRepoRoot();
