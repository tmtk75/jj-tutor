import type { JjCommit, JjFileChange, JjOperation, JjStatus } from "~/shared";
import { runJj, runJjSafe } from "./jj-executor";
import { JJ_LOG_TEMPLATE, JJ_OP_LOG_TEMPLATE, JJ_EVOLOG_TEMPLATE } from "./jj-templates";

export async function getJjCommits(
	repoPath: string,
	options?: { atOperation?: string },
): Promise<JjCommit[]> {
	const args = ["log", "--no-graph", "-r", "all()", "-T", JJ_LOG_TEMPLATE];
	if (options?.atOperation) {
		args.push("--at-operation", options.atOperation);
	}
	const stdout = await runJj(repoPath, args);

	return stdout
		.trim()
		.split("\n")
		.filter((line) => line.length > 0)
		.map((line) => {
			const raw = JSON.parse(line);
			return {
				...raw,
				parents: raw.parents ? raw.parents.split(",").filter(Boolean) : [],
				bookmarks: raw.bookmarks
					? raw.bookmarks.split(",").filter(Boolean)
					: [],
			};
		});
}

export async function getJjStatus(repoPath: string): Promise<JjStatus> {
	const stdout = await runJj(repoPath, ["status"]);
	const lines = stdout.trim().split("\n");

	const files: JjFileChange[] = [];
	let workingCopyChangeId = "";
	let workingCopyCommitId = "";
	let parentChangeId = "";
	let parentDescription = "";

	for (const line of lines) {
		const fileMatch = line.match(/^([AMDR])\s+(.+)$/);
		if (fileMatch) {
			files.push({
				status: fileMatch[1] as JjFileChange["status"],
				path: fileMatch[2],
			});
		}

		const wcMatch = line.match(
			/^Working copy\s+.*\((@)\)\s*:\s*(\w+)\s+(\w+)/,
		);
		if (wcMatch) {
			workingCopyChangeId = wcMatch[2];
			workingCopyCommitId = wcMatch[3];
		}

		const parentMatch = line.match(
			/^Parent commit.*:\s*(\w+)\s+\w+\s*(.*)/,
		);
		if (parentMatch) {
			parentChangeId = parentMatch[1];
			parentDescription = parentMatch[2].trim();
		}
	}

	return {
		workingCopyChangeId,
		workingCopyCommitId,
		parentChangeId,
		parentDescription,
		files,
	};
}

export async function getJjOperations(
	repoPath: string,
): Promise<JjOperation[]> {
	const stdout = await runJj(repoPath, [
		"operation",
		"log",
		"--no-graph",
		"-n",
		"20",
		"-T",
		JJ_OP_LOG_TEMPLATE,
	]);

	return stdout
		.trim()
		.split("\n")
		.filter((line) => line.length > 0)
		.map((line) => JSON.parse(line));
}

export async function getJjDiffSummary(
	repoPath: string,
	rev: string,
): Promise<{ status: string; path: string }[]> {
	const stdout = await runJj(repoPath, ["diff", "--summary", "-r", rev]);
	return stdout
		.trim()
		.split("\n")
		.filter((line) => line.length > 0)
		.map((line) => {
			const match = line.match(/^([AMDR])\s+(.+)$/);
			if (match) {
				return { status: match[1], path: match[2] };
			}
			return { status: "?", path: line.trim() };
		});
}

export async function getJjDiffBetween(
	repoPath: string,
	fromRev: string,
	toRev: string,
): Promise<{ status: string; path: string }[]> {
	const stdout = await runJj(repoPath, [
		"diff",
		"--summary",
		"--from",
		fromRev,
		"--to",
		toRev,
	]);
	return stdout
		.trim()
		.split("\n")
		.filter((line) => line.length > 0)
		.map((line) => {
			const match = line.match(/^([AMDR])\s+(.+)$/);
			if (match) {
				return { status: match[1], path: match[2] };
			}
			return { status: "?", path: line.trim() };
		});
}

export async function getJjDiffFull(
	repoPath: string,
	rev?: string,
	fromRev?: string,
	toRev?: string,
	options?: { atOperation?: string },
): Promise<string> {
	const args = ["diff", "--git"];
	if (options?.atOperation) {
		args.push("--at-operation", options.atOperation);
	}
	if (fromRev && toRev) {
		args.push("--from", fromRev, "--to", toRev);
	} else if (rev) {
		args.push("-r", rev);
	}
	return runJj(repoPath, args);
}

export async function getWcCommitAtOperation(
	repoPath: string,
	opId: string,
): Promise<string> {
	const stdout = await runJj(repoPath, [
		"log",
		"--at-operation",
		opId,
		"--no-graph",
		"-r",
		"@",
		"-T",
		"commit_id",
	]);
	return stdout.trim();
}

export async function getJjEvologStructured(
	repoPath: string,
	rev: string,
): Promise<{ commitId: string; timestamp: string; description: string; empty: boolean }[]> {
	const stdout = await runJj(repoPath, [
		"evolog",
		"--no-graph",
		"-n",
		"20",
		"-T",
		JJ_EVOLOG_TEMPLATE,
		"-r",
		rev,
	]);
	return stdout
		.trim()
		.split("\n")
		.filter((line) => line.length > 0)
		.map((line) => JSON.parse(line));
}

export async function getJjEvologWithOps(
	repoPath: string,
	rev: string,
): Promise<{ commitId: string; timestamp: string; description: string; empty: boolean; operationId: string; operationDesc: string }[]> {
	const [structured, rawStdout] = await Promise.all([
		getJjEvologStructured(repoPath, rev),
		runJj(repoPath, ["evolog", "--no-graph", "-n", "20", "-r", rev]),
	]);

	// Parse operation IDs and descriptions from raw evolog output
	// Each entry has a line: "-- operation OPID description"
	const opEntries: { id: string; desc: string }[] = [];
	for (const line of rawStdout.split("\n")) {
		const match = line.match(/^-- operation (\w+)\s+(.*)/);
		if (match) {
			opEntries.push({ id: match[1], desc: match[2] });
		}
	}

	return structured.map((entry, i) => ({
		...entry,
		operationId: opEntries[i]?.id || "",
		operationDesc: opEntries[i]?.desc || "",
	}));
}

export async function evalRevset(
	repoPath: string,
	revset: string,
): Promise<{ commitIds: string[] } | { error: string }> {
	const result = await runJjSafe(repoPath, [
		"log",
		"--no-graph",
		"-r",
		revset,
		"-T",
		'commit_id.short() ++ "\\n"',
	]);
	if ("error" in result) {
		return { error: result.error };
	}
	const commitIds = result.stdout
		.trim()
		.split("\n")
		.filter((line) => line.length > 0);
	return { commitIds };
}
