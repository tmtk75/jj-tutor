import {
	type JjCommit,
	type GitCommit,
	type WhatIfPrediction,
	WHATIF_COMMANDS,
} from "~/shared";

function findWorkingCopy(commits: JjCommit[]): JjCommit | undefined {
	return commits.find((c) => c.isWorkingCopy);
}

function findByCommitId(
	commits: JjCommit[],
	id: string,
): JjCommit | undefined {
	return commits.find((c) => c.commitId === id);
}

const placeholder: JjCommit = {
	changeId: "????????",
	commitId: "????????",
	parents: [],
	authorEmail: "",
	timestamp: "",
	description: "",
	empty: true,
	conflict: false,
	immutable: false,
	divergent: false,
	hidden: false,
	isWorkingCopy: false,
	bookmarks: [],
	tags: [],
};

// Helper to create simulated git commits
function gitCommit(
	id: string,
	message: string,
	parents: string[],
	refs: string[] = [],
): GitCommit {
	return {
		hash: id,
		hashShort: id.slice(0, 7),
		parents,
		authorEmail: "",
		timestamp: "",
		message,
		refs,
	};
}

// Build a base git graph that mirrors the jj state (simplified)
function jjToGitBefore(commits: JjCommit[]): GitCommit[] {
	const wc = commits.find((c) => c.isWorkingCopy);
	const parent = wc?.parents[0]
		? commits.find((c) => c.commitId === wc.parents[0])
		: undefined;
	const grandparent = parent?.parents[0]
		? commits.find((c) => c.commitId === parent.parents[0])
		: undefined;

	const result: GitCommit[] = [];

	if (grandparent) {
		result.push(
			gitCommit(
				"gp_" + grandparent.commitId.slice(0, 6),
				grandparent.description || "(empty)",
				[],
				grandparent.bookmarks.length > 0 ? [...grandparent.bookmarks] : [],
			),
		);
	}

	if (parent && !parent.empty) {
		const parentGitId = "p_" + parent.commitId.slice(0, 6);
		const parentRefs = [...parent.bookmarks];
		result.push(
			gitCommit(
				parentGitId,
				parent.description || "(committed)",
				grandparent ? ["gp_" + grandparent.commitId.slice(0, 6)] : [],
				parentRefs,
			),
		);
	}

	// WC in jj = uncommitted changes in git (shown as HEAD with working dir note)
	if (wc && !wc.empty) {
		const headId = parent && !parent.empty
			? "p_" + parent.commitId.slice(0, 6)
			: grandparent
				? "gp_" + grandparent.commitId.slice(0, 6)
				: undefined;
		if (headId) {
			// Mark the HEAD commit
			const headCommit = result.find((c) => c.hash === headId);
			if (headCommit && !headCommit.refs.includes("HEAD")) {
				headCommit.refs.push("HEAD");
			}
		}
		// Show uncommitted changes as a special node
		result.unshift(
			gitCommit(
				"wd_uncommitted",
				"(uncommitted changes)",
				headId ? [headId] : [],
				["working dir"],
			),
		);
	} else if (parent && !parent.empty) {
		// WC is empty, HEAD is at parent
		const headCommit = result.find((c) => c.hash === "p_" + parent.commitId.slice(0, 6));
		if (headCommit && !headCommit.refs.includes("HEAD")) {
			headCommit.refs.push("HEAD");
		}
	} else if (grandparent) {
		const gpCommit = result.find((c) => c.hash === "gp_" + grandparent.commitId.slice(0, 6));
		if (gpCommit && !gpCommit.refs.includes("HEAD")) {
			gpCommit.refs.push("HEAD");
		}
	}

	return result;
}

type PredictFn = (commits: JjCommit[], extra?: JjCommit[]) => Omit<WhatIfPrediction, "command" | "beforeCommits">;

const predictors: Record<string, PredictFn> = {
	"jj-new": (commits) => {
		const wc = findWorkingCopy(commits);
		if (!wc) throw new Error("No working copy found");

		const newWc: JjCommit = {
			...placeholder,
			parents: [wc.commitId],
			isWorkingCopy: true,
		};

		const afterCommits = commits.map((c) =>
			c.commitId === wc.commitId ? { ...c, isWorkingCopy: false } : c,
		);
		afterCommits.unshift(newWc);

		// git equivalent: git add -A && git commit -m "..."
		const gitBefore = jjToGitBefore(commits);
		const parent = wc.parents[0] ? findByCommitId(commits, wc.parents[0]) : undefined;
		const gpId = parent?.parents[0]
			? "gp_" + parent.parents[0].slice(0, 6)
			: undefined;
		const parentGitId = parent && !parent.empty
			? "p_" + parent.commitId.slice(0, 6)
			: gpId;

		const newCommitId = "new_commit";
		const gitAfter: GitCommit[] = [];
		if (gpId) {
			const gp = commits.find((c) => c.commitId === parent?.parents[0]);
			gitAfter.push(gitCommit(gpId, gp?.description || "(empty)", [], gp?.bookmarks ? [...gp.bookmarks] : []));
		}
		if (parentGitId && parentGitId !== gpId) {
			gitAfter.push(gitCommit(parentGitId, parent?.description || "(committed)", gpId ? [gpId] : [], parent?.bookmarks ? [...parent.bookmarks] : []));
		}
		gitAfter.unshift(
			gitCommit(newCommitId, '"..."', parentGitId ? [parentGitId] : [], ["HEAD"]),
		);

		return {
			afterCommits,
			explanation: "predict.jjNew",
			gitEquivalent: "predict.jjNew.gitEquiv",
			gitBeforeCommits: gitBefore,
			gitAfterCommits: gitAfter,
		};
	},

	"jj-new-branch": (commits) => {
		const wc = findWorkingCopy(commits);
		if (!wc) throw new Error("No working copy found");

		// Find grandparent (2 levels up) to branch from
		const parent = wc.parents[0] ? findByCommitId(commits, wc.parents[0]) : undefined;
		const grandparentId = parent?.parents[0];
		const grandparent = grandparentId ? findByCommitId(commits, grandparentId) : undefined;
		const branchPoint = grandparentId ?? (parent ? parent.commitId : wc.commitId);

		const newWc: JjCommit = {
			...placeholder,
			changeId: "newchange",
			commitId: "branch_wc",
			parents: [branchPoint],
			isWorkingCopy: true,
			description: "(new branch)",
		};

		const afterCommits = commits.map((c) =>
			c.commitId === wc.commitId ? { ...c, isWorkingCopy: false } : c,
		);
		afterCommits.unshift(newWc);

		// git: git stash && git checkout -b feature HEAD~2
		const gitBefore = jjToGitBefore(commits);

		const gpId = grandparent
			? "gp_" + grandparent.commitId.slice(0, 6)
			: parent
				? "p_" + parent.commitId.slice(0, 6)
				: undefined;

		const parentGitId = parent && !parent.empty
			? "p_" + parent.commitId.slice(0, 6)
			: undefined;

		const gitAfter: GitCommit[] = [];
		if (gpId) {
			const gp = grandparent ?? parent;
			gitAfter.push(
				gitCommit(gpId, gp?.description || "(empty)", [], [
					...(gp?.bookmarks ? gp.bookmarks : []),
					"HEAD",
					"feature",
				]),
			);
		}
		if (parentGitId && parentGitId !== gpId) {
			gitAfter.push(
				gitCommit(parentGitId, parent?.description || "(committed)", gpId ? [gpId] : [], [
					...(parent?.bookmarks ? parent.bookmarks : []),
					"(stash で退避中)",
				]),
			);
		}

		return {
			afterCommits,
			explanation: "predict.jjNewBranch",
			gitEquivalent: "predict.jjNewBranch.gitEquiv",
			gitBeforeCommits: gitBefore,
			gitAfterCommits: gitAfter,
		};
	},

	"jj-commit": (commits) => {
		const wc = findWorkingCopy(commits);
		if (!wc) throw new Error("No working copy found");

		const newWc: JjCommit = {
			...placeholder,
			parents: [wc.commitId],
			isWorkingCopy: true,
		};

		const afterCommits = commits.map((c) =>
			c.commitId === wc.commitId
				? { ...c, isWorkingCopy: false, description: "message" }
				: c,
		);
		afterCommits.unshift(newWc);

		const gitBefore = jjToGitBefore(commits);
		const parent = wc.parents[0] ? findByCommitId(commits, wc.parents[0]) : undefined;
		const gpId = parent?.parents[0] ? "gp_" + parent.parents[0].slice(0, 6) : undefined;
		const parentGitId = parent && !parent.empty ? "p_" + parent.commitId.slice(0, 6) : gpId;

		const gitAfter: GitCommit[] = [];
		if (gpId) {
			const gp = commits.find((c) => c.commitId === parent?.parents[0]);
			gitAfter.push(gitCommit(gpId, gp?.description || "(empty)", [], gp?.bookmarks ? [...gp.bookmarks] : []));
		}
		if (parentGitId && parentGitId !== gpId) {
			gitAfter.push(gitCommit(parentGitId, parent?.description || "(committed)", gpId ? [gpId] : [], parent?.bookmarks ? [...parent.bookmarks] : []));
		}
		gitAfter.unshift(
			gitCommit("new_commit", "message", parentGitId ? [parentGitId] : [], ["HEAD"]),
		);

		return {
			afterCommits,
			explanation: "predict.jjCommit",
			gitEquivalent: "predict.jjCommit.gitEquiv",
			gitBeforeCommits: gitBefore,
			gitAfterCommits: gitAfter,
		};
	},

	"jj-squash": (commits) => {
		const wc = findWorkingCopy(commits);
		if (!wc) throw new Error("No working copy found");

		const parentId = wc.parents[0];
		const parent = parentId ? findByCommitId(commits, parentId) : undefined;

		const afterCommits = commits
			.filter((c) => c.commitId !== wc.commitId)
			.map((c) => {
				if (parent && c.commitId === parent.commitId) {
					return { ...c, empty: false };
				}
				return c;
			});

		const newWc: JjCommit = {
			...placeholder,
			parents: wc.parents,
			isWorkingCopy: true,
			changeId: wc.changeId,
		};
		afterCommits.unshift(newWc);

		// git: commit --amend = replace HEAD commit with new one
		const gitBefore = jjToGitBefore(commits);
		const gpId = parent?.parents[0] ? "gp_" + parent.parents[0].slice(0, 6) : undefined;

		const gitAfter: GitCommit[] = [];
		if (gpId) {
			const gp = commits.find((c) => c.commitId === parent?.parents[0]);
			gitAfter.push(gitCommit(gpId, gp?.description || "(empty)", [], gp?.bookmarks ? [...gp.bookmarks] : []));
		}
		gitAfter.unshift(
			gitCommit(
				"amended",
				(parent?.description || "(no message)") + " + changes",
				gpId ? [gpId] : [],
				["HEAD"],
			),
		);

		return {
			afterCommits,
			explanation: "predict.jjSquash",
			gitEquivalent: "predict.jjSquash.gitEquiv",
			gitBeforeCommits: gitBefore,
			gitAfterCommits: gitAfter,
		};
	},

	"jj-bookmark-set": (commits) => {
		const wc = findWorkingCopy(commits);
		if (!wc) throw new Error("No working copy found");

		const afterCommits = commits.map((c) =>
			c.commitId === wc.commitId
				? { ...c, bookmarks: [...c.bookmarks, "main"] }
				: c,
		);

		const gitBefore = jjToGitBefore(commits);
		const gitAfter = gitBefore.map((c) =>
			c.refs.includes("HEAD")
				? { ...c, refs: [...c.refs, "main"] }
				: { ...c },
		);

		return {
			afterCommits,
			explanation: "predict.jjBookmarkSet",
			gitEquivalent: "predict.jjBookmarkSet.gitEquiv",
			gitBeforeCommits: gitBefore,
			gitAfterCommits: gitAfter,
		};
	},

	"jj-new-insert-before": (commits) => {
		const wc = findWorkingCopy(commits);
		if (!wc) throw new Error("No working copy found");

		const newCommit: JjCommit = {
			...placeholder,
			parents: wc.parents,
			isWorkingCopy: true,
		};

		const afterCommits = commits.map((c) =>
			c.commitId === wc.commitId
				? {
						...c,
						isWorkingCopy: false,
						parents: [placeholder.commitId],
					}
				: c,
		);
		afterCommits.splice(
			afterCommits.findIndex((c) => c.commitId === wc.commitId),
			0,
			newCommit,
		);

		// git: interactive rebase to insert a commit
		const gitBefore = jjToGitBefore(commits);
		const parent = wc.parents[0] ? findByCommitId(commits, wc.parents[0]) : undefined;
		const gpId = parent?.parents[0] ? "gp_" + parent.parents[0].slice(0, 6) : undefined;
		const parentGitId = parent && !parent.empty ? "p_" + parent.commitId.slice(0, 6) : gpId;

		const gitAfter: GitCommit[] = [];
		if (gpId) {
			const gp = commits.find((c) => c.commitId === parent?.parents[0]);
			gitAfter.push(gitCommit(gpId, gp?.description || "(empty)", [], gp?.bookmarks ? [...gp.bookmarks] : []));
		}
		if (parentGitId && parentGitId !== gpId) {
			gitAfter.push(gitCommit(parentGitId, parent?.description || "(committed)", gpId ? [gpId] : [], parent?.bookmarks ? [...parent.bookmarks] : []));
		}
		const insertedId = "inserted";
		gitAfter.unshift(gitCommit(insertedId, "(inserted empty)", parentGitId ? [parentGitId] : [], []));
		gitAfter.unshift(gitCommit("rebased_head", wc.description || "(rebased)", [insertedId], ["HEAD"]));

		return {
			afterCommits,
			explanation: "predict.jjNewInsertBefore",
			gitEquivalent: "predict.jjNewInsertBefore.gitEquiv",
			gitBeforeCommits: gitBefore,
			gitAfterCommits: gitAfter,
		};
	},

	"jj-describe": (commits) => {
		const wc = findWorkingCopy(commits);
		if (!wc) throw new Error("No working copy found");

		const afterCommits = commits.map((c) =>
			c.commitId === wc.commitId ? { ...c, description: "message" } : c,
		);

		// git: commit --amend -m => hash changes
		const gitBefore = jjToGitBefore(commits);
		const parent = wc.parents[0] ? findByCommitId(commits, wc.parents[0]) : undefined;
		const gpId = parent?.parents[0] ? "gp_" + parent.parents[0].slice(0, 6) : undefined;

		// In git, amending message changes the hash
		const gitAfter: GitCommit[] = [];
		if (gpId) {
			const gp = commits.find((c) => c.commitId === parent?.parents[0]);
			gitAfter.push(gitCommit(gpId, gp?.description || "(empty)", [], gp?.bookmarks ? [...gp.bookmarks] : []));
		}
		// The HEAD commit gets a new hash because the message changed
		const headCommit = gitBefore.find((c) => c.refs.includes("HEAD") && !c.refs.includes("working dir"));
		if (headCommit) {
			gitAfter.unshift(
				gitCommit("amended_msg", "message", gpId ? [gpId] : headCommit.parents, ["HEAD", "hash changed!"]),
			);
		} else {
			// fallback
			gitAfter.unshift(gitCommit("amended_msg", "message", gpId ? [gpId] : [], ["HEAD"]));
		}

		return {
			afterCommits,
			explanation: "predict.jjDescribe",
			gitEquivalent: "predict.jjDescribe.gitEquiv",
			gitBeforeCommits: gitBefore,
			gitAfterCommits: gitAfter,
		};
	},

	"jj-undo": (commits, prevCommits) => {
		// git: reflog + reset --hard
		const gitBefore = jjToGitBefore(commits);
		const headCommit = gitBefore.find((c) => c.refs.includes("HEAD") && !c.refs.includes("working dir"));

		const gitAfter: GitCommit[] = [];
		if (headCommit) {
			// Show that we go back to a previous state
			gitAfter.push(
				gitCommit("prev_state", "(reflog で探した前の状態)", [], ["HEAD", "reset --hard"]),
			);
			gitAfter.push(
				gitCommit(headCommit.hash, headCommit.message, [], ["(元の HEAD → 消失)"]),
			);
		} else {
			gitAfter.push(
				gitCommit("prev_state", "(reflog で探した前の状態)", [], ["HEAD"]),
			);
		}

		return {
			afterCommits: prevCommits ?? commits,
			explanation: prevCommits
				? "predict.jjUndo"
				: "predict.jjUndo.fallback",
			gitEquivalent: "predict.jjUndo.gitEquiv",
			gitBeforeCommits: gitBefore,
			gitAfterCommits: gitAfter,
		};
	},

	"jj-restore": (commits) => {
		const wc = findWorkingCopy(commits);
		if (!wc) throw new Error("No working copy found");

		const afterCommits = commits.map((c) =>
			c.commitId === wc.commitId ? { ...c, empty: true } : c,
		);

		// git: restore . removes unstaged only
		const gitBefore = jjToGitBefore(commits);
		const gitAfter = gitBefore
			.filter((c) => !c.refs.includes("working dir"))
			.map((c) => ({ ...c }));
		// If there was an uncommitted node, it's gone now
		if (gitAfter.length === 0) {
			gitAfter.push(gitCommit("head", "(no changes)", [], ["HEAD"]));
		} else {
			// Mark note about staging
			const head = gitAfter.find((c) => c.refs.includes("HEAD"));
			if (head) {
				head.refs = [...head.refs, "staged はそのまま残る"];
			}
		}

		return {
			afterCommits,
			explanation: "predict.jjRestore",
			gitEquivalent: "predict.jjRestore.gitEquiv",
			gitBeforeCommits: gitBefore,
			gitAfterCommits: gitAfter,
		};
	},

	"jj-edit-parent": (commits) => {
		const wc = findWorkingCopy(commits);
		if (!wc) throw new Error("No working copy found");

		const parentId = wc.parents[0];

		const afterCommits = commits.map((c) => {
			if (c.commitId === wc.commitId) return { ...c, isWorkingCopy: false };
			if (c.commitId === parentId) return { ...c, isWorkingCopy: true };
			return c;
		});

		// git: stash + checkout HEAD~
		const gitBefore = jjToGitBefore(commits);
		const parent = parentId ? findByCommitId(commits, parentId) : undefined;
		const gpId = parent?.parents[0] ? "gp_" + parent.parents[0].slice(0, 6) : undefined;
		const parentGitId = parent && !parent.empty ? "p_" + parent.commitId.slice(0, 6) : gpId;

		const gitAfter: GitCommit[] = [];
		if (gpId) {
			const gp = commits.find((c) => c.commitId === parent?.parents[0]);
			gitAfter.push(gitCommit(gpId, gp?.description || "(empty)", [], gp?.bookmarks ? [...gp.bookmarks] : []));
		}
		if (parentGitId && parentGitId !== gpId) {
			gitAfter.push(
				gitCommit(parentGitId, parent?.description || "(committed)", gpId ? [gpId] : [], ["HEAD", "detached"]),
			);
		} else if (gpId) {
			const gpCommit = gitAfter.find((c) => c.hash === gpId);
			if (gpCommit) {
				gpCommit.refs.push("HEAD", "detached");
			}
		}
		gitAfter.unshift(
			gitCommit("stash_0", "(stash に退避された変更)", [], ["stash@{0}"]),
		);

		return {
			afterCommits,
			explanation: "predict.jjEditParent",
			gitEquivalent: "predict.jjEditParent.gitEquiv",
			gitBeforeCommits: gitBefore,
			gitAfterCommits: gitAfter,
		};
	},
};

export function predict(
	commandId: string,
	commits: JjCommit[],
	extra?: JjCommit[],
): WhatIfPrediction | null {
	const command = WHATIF_COMMANDS.find((c) => c.id === commandId);
	if (!command) return null;

	const predictor = predictors[commandId];
	if (!predictor) return null;

	const result = predictor(commits, extra);

	return {
		command,
		beforeCommits: commits,
		...result,
	};
}
