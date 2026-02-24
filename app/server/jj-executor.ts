import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { logCmd } from "./logger";

const execFileAsync = promisify(execFile);

const JJ_PATH = "jj";

export async function runJj(
	repoPath: string,
	args: string[],
): Promise<string> {
	const start = performance.now();
	const { stdout } = await execFileAsync(
		JJ_PATH,
		["--color=never", "--no-pager", "-R", repoPath, ...args],
		{
			timeout: 10000,
			maxBuffer: 1024 * 1024,
		},
	);
	logCmd("jj", args, performance.now() - start);
	return stdout;
}

export async function runJjSafe(
	repoPath: string,
	args: string[],
): Promise<{ stdout: string } | { error: string }> {
	const start = performance.now();
	try {
		const { stdout } = await execFileAsync(
			JJ_PATH,
			["--color=never", "--no-pager", "-R", repoPath, ...args],
			{
				timeout: 10000,
				maxBuffer: 1024 * 1024,
			},
		);
		logCmd("jj", args, performance.now() - start);
		return { stdout };
	} catch (err: unknown) {
		const stderr =
			(err as { stderr?: string }).stderr ||
			(err as Error).message ||
			"Unknown error";
		logCmd("jj", args, performance.now() - start, stderr);
		return { error: stderr };
	}
}
