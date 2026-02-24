import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { logCmd } from "./logger";

const execFileAsync = promisify(execFile);

export async function runGit(
	repoPath: string,
	args: string[],
): Promise<string> {
	const start = performance.now();
	const { stdout } = await execFileAsync("git", ["-C", repoPath, ...args], {
		timeout: 10000,
		maxBuffer: 1024 * 1024,
	});
	logCmd("git", args, performance.now() - start);
	return stdout;
}
