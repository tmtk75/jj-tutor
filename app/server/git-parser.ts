import type { GitBranch, GitCommit, GitFileChange, GitStatus } from "~/shared";
import { runGit } from "./git-executor";
import { GIT_LOG_FORMAT } from "./jj-templates";

export async function getGitCommits(
	repoPath: string,
	options?: { includeJjRefs?: boolean },
): Promise<GitCommit[]> {
	const args = ["log"];
	if (!options?.includeJjRefs) {
		args.push("--exclude=refs/jj/*");
	}
	args.push("--all", "-n", "6", GIT_LOG_FORMAT);
	const stdout = await runGit(repoPath, args);

	if (!stdout.trim()) return [];

	return stdout
		.trim()
		.split("\n")
		.filter((line) => line.length > 0)
		.map((line) => {
			const [hash, hashShort, parentHashes, authorEmail, timestamp, message, decorations] =
				line.split("\t");
			return {
				hash,
				hashShort,
				parents: parentHashes ? parentHashes.split(" ").filter(Boolean) : [],
				authorEmail,
				timestamp,
				message,
				refs: decorations
					? decorations
							.split(",")
							.map((d) => d.trim())
							.filter(Boolean)
					: [],
			};
		});
}

export async function getGitStatus(repoPath: string): Promise<GitStatus> {
	let branch = "";
	try {
		branch = (await runGit(repoPath, ["branch", "--show-current"])).trim();
	} catch {
		branch = "(detached)";
	}

	let stdout: string;
	try {
		stdout = await runGit(repoPath, ["status", "--porcelain=v1"]);
	} catch {
		return { branch, staged: [], unstaged: [], untracked: [] };
	}

	const staged: GitFileChange[] = [];
	const unstaged: GitFileChange[] = [];
	const untracked: string[] = [];

	for (const line of stdout.split("\n").filter(Boolean)) {
		const x = line[0]; // index status
		const y = line[1]; // worktree status
		const path = line.slice(3);

		if (x === "?") {
			untracked.push(path);
			continue;
		}
		if (x !== " " && x !== "?") {
			staged.push({ status: x, path, staged: true });
		}
		if (y !== " " && y !== "?") {
			unstaged.push({ status: y, path, staged: false });
		}
	}

	return { branch, staged, unstaged, untracked };
}

export async function getGitBranches(repoPath: string): Promise<GitBranch[]> {
	let stdout: string;
	try {
		stdout = await runGit(repoPath, [
			"branch",
			"-a",
			"--format=%(refname:short)%09%(objectname:short)%09%(HEAD)",
		]);
	} catch {
		return [];
	}

	if (!stdout.trim()) return [];

	return stdout
		.trim()
		.split("\n")
		.filter((line) => line.length > 0)
		.map((line) => {
			const [name, commit, head] = line.split("\t");
			return {
				name,
				commit,
				isRemote: name.startsWith("remotes/"),
				isHead: head === "*",
			};
		});
}
