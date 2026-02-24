// --- jj types ---

export interface JjCommit {
	changeId: string;
	commitId: string;
	parents: string[];
	authorEmail: string;
	timestamp: string;
	description: string;
	empty: boolean;
	conflict: boolean;
	immutable: boolean;
	divergent: boolean;
	hidden: boolean;
	isWorkingCopy: boolean;
	bookmarks: string[];
}

export interface JjStatus {
	workingCopyChangeId: string;
	workingCopyCommitId: string;
	parentChangeId: string;
	parentDescription: string;
	files: JjFileChange[];
}

export interface JjFileChange {
	status: "A" | "M" | "D" | "R";
	path: string;
}

export interface JjOperation {
	id: string;
	description: string;
	tags: string;
	time: string;
	isCurrent: boolean;
}

// --- git types ---

export interface GitCommit {
	hash: string;
	hashShort: string;
	parents: string[];
	authorEmail: string;
	timestamp: string;
	message: string;
	refs: string[];
}

export interface GitBranch {
	name: string;
	commit: string;
	isRemote: boolean;
	isHead: boolean;
}

export interface GitFileChange {
	status: string;
	path: string;
	staged: boolean;
}

export interface GitStatus {
	branch: string;
	staged: GitFileChange[];
	unstaged: GitFileChange[];
	untracked: string[];
}

// --- what-if ---

export interface WhatIfCommand {
	id: string;
	command: string;
	displayName: string;
	description: string;
	category: "create" | "modify" | "navigate" | "bookmark";
}

export interface GitEquivalent {
	commands: string[];
	steps: string[];
	result: string;
}

export interface WhatIfPrediction {
	command: WhatIfCommand;
	beforeCommits: JjCommit[];
	afterCommits: JjCommit[];
	explanation: string;
	explanationParams?: Record<string, string>;
	gitEquivalent: string;
	gitDetail?: GitEquivalent;
	gitBeforeCommits: GitCommit[];
	gitAfterCommits: GitCommit[];
}

// --- rebase prediction ---

export type RebaseMode = "revision" | "subtree" | "branch";

export interface RebasePrediction {
	mode: RebaseMode;
	command: string;
	beforeCommits: JjCommit[];
	afterCommits: JjCommit[];
	explanation: string;
	explanationParams?: Record<string, string>;
	wouldConflict: boolean;
	conflictExplanation?: string;
	conflictExplanationParams?: Record<string, string>;
	validationError?: string;
	validationErrorParams?: Record<string, string>;
	gitEquivalent: string;
}

// --- concept mapping ---

export interface ConceptMapping {
	jjConcept: string;
	gitConcept: string;
	explanation: string;
	jjExample: string;
	gitExample: string;
	relatedCommands: string[];
}
