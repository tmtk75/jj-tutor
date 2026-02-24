import type { JjCommit, RebaseMode, RebasePrediction } from "~/shared";

function findByChangeId(
	commits: JjCommit[],
	changeId: string,
): JjCommit | undefined {
	return commits.find((c) => c.changeId === changeId);
}

function findByCommitId(
	commits: JjCommit[],
	commitId: string,
): JjCommit | undefined {
	return commits.find((c) => c.commitId === commitId);
}

// Collect all descendants of a commit (by commitId)
function findDescendants(
	commitId: string,
	commits: JjCommit[],
): Set<string> {
	const descendants = new Set<string>();
	const queue = [commitId];
	while (queue.length > 0) {
		const current = queue.shift()!;
		for (const c of commits) {
			if (
				c.parents.includes(current) &&
				!descendants.has(c.commitId) &&
				c.commitId !== commitId
			) {
				descendants.add(c.commitId);
				queue.push(c.commitId);
			}
		}
	}
	return descendants;
}

// Check if `ancestorId` is an ancestor of `descendantId`
function isAncestor(
	ancestorId: string,
	descendantId: string,
	commits: JjCommit[],
): boolean {
	if (ancestorId === descendantId) return false;
	const visited = new Set<string>();
	const queue = [descendantId];
	while (queue.length > 0) {
		const current = queue.shift()!;
		if (current === ancestorId) return true;
		if (visited.has(current)) continue;
		visited.add(current);
		const commit = findByCommitId(commits, current);
		if (commit) {
			for (const p of commit.parents) {
				queue.push(p);
			}
		}
	}
	return false;
}

// Find the common ancestor between two commits
function findCommonAncestor(
	commitIdA: string,
	commitIdB: string,
	commits: JjCommit[],
): string | null {
	const ancestorsA = new Set<string>();
	const queueA = [commitIdA];
	while (queueA.length > 0) {
		const current = queueA.shift()!;
		if (ancestorsA.has(current)) continue;
		ancestorsA.add(current);
		const c = findByCommitId(commits, current);
		if (c) {
			for (const p of c.parents) queueA.push(p);
		}
	}

	const queueB = [commitIdB];
	const visitedB = new Set<string>();
	while (queueB.length > 0) {
		const current = queueB.shift()!;
		if (visitedB.has(current)) continue;
		visitedB.add(current);
		if (ancestorsA.has(current)) return current;
		const c = findByCommitId(commits, current);
		if (c) {
			for (const p of c.parents) queueB.push(p);
		}
	}
	return null;
}

function buildBase(
	mode: RebaseMode,
	source: JjCommit,
	dest: JjCommit,
	commits: JjCommit[],
): { command: string; gitEquivalent: string } {
	const srcShort = source.changeId.slice(0, 8);
	const dstShort = dest.changeId.slice(0, 8);
	const flag = mode === "revision" ? "-r" : mode === "subtree" ? "-s" : "-b";

	return {
		command: `jj rebase ${flag} ${srcShort} -d ${dstShort}`,
		gitEquivalent:
			mode === "revision"
				? `git rebase --onto ${dstShort} ${srcShort}^ ${srcShort}`
				: mode === "subtree"
					? `git rebase --onto ${dstShort} ${srcShort}^`
					: `git rebase ${dstShort}`,
	};
}

function predictRevision(
	source: JjCommit,
	dest: JjCommit,
	commits: JjCommit[],
): JjCommit[] {
	const originalParents = source.parents;

	return commits.map((c) => {
		if (c.commitId === source.commitId) {
			// Move source: reparent to dest
			return { ...c, parents: [dest.commitId] };
		}
		// Reparent source's children to source's original parents
		if (c.parents.includes(source.commitId)) {
			const newParents = c.parents.map((p) =>
				p === source.commitId ? (originalParents[0] ?? p) : p,
			);
			return { ...c, parents: newParents };
		}
		return c;
	});
}

function predictSubtree(
	source: JjCommit,
	dest: JjCommit,
	commits: JjCommit[],
): JjCommit[] {
	// Only reparent the source itself; descendants keep internal structure
	return commits.map((c) => {
		if (c.commitId === source.commitId) {
			return { ...c, parents: [dest.commitId] };
		}
		return c;
	});
}

function predictBranch(
	source: JjCommit,
	dest: JjCommit,
	commits: JjCommit[],
): JjCommit[] {
	// Find the common ancestor between source and dest
	const commonAncestor = findCommonAncestor(
		source.commitId,
		dest.commitId,
		commits,
	);

	// Walk from source towards root, collecting the "branch base"
	// (the first commit whose parent is the common ancestor or immutable)
	let base = source;
	let current: JjCommit | undefined = source;
	while (current) {
		if (
			current.parents.some(
				(p) => p === commonAncestor || findByCommitId(commits, p)?.immutable,
			)
		) {
			base = current;
			break;
		}
		const parentCommit: JjCommit | undefined = current.parents[0]
			? findByCommitId(commits, current.parents[0])
			: undefined;
		if (!parentCommit) {
			base = current;
			break;
		}
		current = parentCommit;
	}

	// Reparent the base to dest
	return commits.map((c) => {
		if (c.commitId === base.commitId) {
			return { ...c, parents: [dest.commitId] };
		}
		return c;
	});
}

export function predictRebase(
	mode: RebaseMode,
	sourceChangeId: string,
	destChangeId: string,
	commits: JjCommit[],
): RebasePrediction {
	const source = findByChangeId(commits, sourceChangeId);
	const dest = findByChangeId(commits, destChangeId);
	const { command, gitEquivalent } = buildBase(
		mode,
		source ?? ({ changeId: sourceChangeId } as JjCommit),
		dest ?? ({ changeId: destChangeId } as JjCommit),
		commits,
	);

	const basePrediction: RebasePrediction = {
		mode,
		command,
		beforeCommits: commits,
		afterCommits: commits,
		explanation: "",
		wouldConflict: false,
		gitEquivalent,
	};

	if (!source) {
		return {
			...basePrediction,
			validationError: `Source "${sourceChangeId}" が見つかりません。`,
		};
	}
	if (!dest) {
		return {
			...basePrediction,
			validationError: `Destination "${destChangeId}" が見つかりません。`,
		};
	}
	if (source.changeId === dest.changeId) {
		return {
			...basePrediction,
			validationError:
				"Source と Destination が同じです。移動の必要はありません。",
		};
	}
	if (source.immutable) {
		return {
			...basePrediction,
			validationError: `${source.changeId.slice(0, 8)} は immutable です。rebase できません。`,
		};
	}
	if (source.changeId === "zzzzzzzzzzzz") {
		return {
			...basePrediction,
			validationError: "root コミットは rebase できません。",
		};
	}

	// Cycle check for -s mode
	if (mode === "subtree" || mode === "branch") {
		const descendants = findDescendants(source.commitId, commits);
		if (descendants.has(dest.commitId)) {
			return {
				...basePrediction,
				validationError:
					"Destination が Source の子孫です。サイクルが発生するため rebase できません。",
			};
		}
	}

	// Already a child of dest?
	const alreadyChild = source.parents.includes(dest.commitId);

	let afterCommits: JjCommit[];
	let explanation: string;

	switch (mode) {
		case "revision": {
			afterCommits = predictRevision(source, dest, commits);
			explanation = alreadyChild
				? `${source.changeId.slice(0, 8)} は既に ${dest.changeId.slice(0, 8)} の子です。変化はありません。`
				: `${source.changeId.slice(0, 8)} を ${dest.changeId.slice(0, 8)} の上に移動します。元の子コミットは ${source.changeId.slice(0, 8)} の親に再接続されます。`;
			break;
		}
		case "subtree": {
			afterCommits = predictSubtree(source, dest, commits);
			explanation = alreadyChild
				? `${source.changeId.slice(0, 8)} は既に ${dest.changeId.slice(0, 8)} の子です。変化はありません。`
				: `${source.changeId.slice(0, 8)} とその子孫をまとめて ${dest.changeId.slice(0, 8)} の上に移動します。サブツリー内の親子関係は保持されます。`;
			break;
		}
		case "branch": {
			afterCommits = predictBranch(source, dest, commits);
			explanation = `${source.changeId.slice(0, 8)} を含むブランチ全体を ${dest.changeId.slice(0, 8)} の上に移動します。共通祖先まで遡って移動します。`;
			break;
		}
	}

	// Conflict heuristic
	const wouldConflict =
		!alreadyChild &&
		!source.empty &&
		!isAncestor(dest.commitId, source.commitId, commits) &&
		!isAncestor(source.commitId, dest.commitId, commits);

	const conflictExplanation = wouldConflict
		? `${source.changeId.slice(0, 8)} と ${dest.changeId.slice(0, 8)} は祖先・子孫の関係にないため、同じファイルを変更している場合にコンフリクトが発生する可能性があります。\n\n※ これはヒューリスティックな予測です。実際のコンフリクト発生はファイル内容に依存します。`
		: undefined;

	return {
		...basePrediction,
		afterCommits,
		explanation,
		wouldConflict,
		conflictExplanation,
	};
}
