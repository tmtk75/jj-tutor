export const JJ_LOG_TEMPLATE = [
	"concat(",
	'  "{",',
	'  "\\"changeId\\":" ++ json(change_id.short()) ++ ",",',
	'  "\\"commitId\\":" ++ json(commit_id.short()) ++ ",",',
	'  "\\"parents\\":\\"" ++ parents.map(|p| p.commit_id().short()).join(",") ++ "\\",",',
	'  "\\"authorEmail\\":" ++ json(author.email()) ++ ",",',
	'  "\\"timestamp\\":" ++ json(committer.timestamp()) ++ ",",',
	'  "\\"description\\":" ++ json(description.first_line()) ++ ",",',
	'  "\\"empty\\":" ++ json(empty) ++ ",",',
	'  "\\"conflict\\":" ++ json(conflict) ++ ",",',
	'  "\\"immutable\\":" ++ json(immutable) ++ ",",',
	'  "\\"divergent\\":" ++ json(divergent) ++ ",",',
	'  "\\"hidden\\":" ++ json(hidden) ++ ",",',
	'  "\\"isWorkingCopy\\":" ++ json(current_working_copy) ++ ",",',
	'  "\\"bookmarks\\":\\"" ++ bookmarks.map(|b| b.name()).join(",") ++ "\\"",',
	'  "}\\n"',
	")",
].join("\n");

export const JJ_OP_LOG_TEMPLATE = [
	"concat(",
	'  "{",',
	'  "\\"id\\":" ++ json(self.id().short()) ++ ",",',
	'  "\\"description\\":" ++ json(description) ++ ",",',
	'  "\\"tags\\":" ++ json(self.tags()) ++ ",",',
	'  "\\"time\\":" ++ json(self.time().start()) ++ ",",',
	'  "\\"isCurrent\\":" ++ json(current_operation),',
	'  "}\\n"',
	")",
].join("\n");

export const JJ_EVOLOG_TEMPLATE = [
	"concat(",
	'  "{",',
	'  "\\"commitId\\":" ++ json(commit.commit_id().short()) ++ ",",',
	'  "\\"timestamp\\":" ++ json(commit.committer().timestamp()) ++ ",",',
	'  "\\"description\\":" ++ json(commit.description().first_line()) ++ ",",',
	'  "\\"empty\\":" ++ json(commit.empty()),',
	'  "}\\n"',
	")",
].join("\n");

export const GIT_LOG_FORMAT =
	"--format=%H%x09%h%x09%P%x09%ae%x09%cI%x09%s%x09%D";
