import type { ConceptMapping } from "./types";

export const CONCEPT_MAPPINGS: ConceptMapping[] = [
	{
		jjConcept: "Change (変更)",
		gitConcept: "Commit",
		explanation:
			"jj の change は change ID で識別される論理的な作業単位。amend や rebase しても change ID は変わらない。git では commit hash が変わってしまう。",
		jjExample: "ozuwwwmu (change ID は安定)",
		gitExample: "3b81a57e (amend すると hash が変わる)",
		relatedCommands: ["jj new", "jj commit", "jj describe"],
	},
	{
		jjConcept: "jj の ID 体系（3種類）",
		gitConcept: "Commit Hash（1種類のみ）",
		explanation:
			"jj には3種類の ID がある。① Change ID: 変更に付く不変の ID。ファイルを編集しても変わらない。人間が追跡に使う。② Commit ID: git の commit hash と同じ。ファイルを保存するたびに変わる。③ Operation ID: jj の操作ごとに付く ID。jj op restore で使う。git には commit hash しかなく、amend すると変わってしまう。",
		jjExample:
			"change: ozuwwwmu（不変）\ncommit: acd93feb（保存で変化）\nop: 717391bc3cae（操作記録）",
		gitExample: "commit hash: 3b81a57e（amend で変化）\nそれ以外の ID なし",
		relatedCommands: ["jj log", "jj op log", "jj evolog"],
	},
	{
		jjConcept: "Working Copy (@)",
		gitConcept: "HEAD + Staging Area + Working Directory",
		explanation:
			"jj ではワーキングコピー自体がコミット。ステージングエリアは存在しない。ファイルを変更するだけで自動的にコミットに反映される。git add は不要。",
		jjExample: "@ (jj log で表示)",
		gitExample: "git status / git add / git commit",
		relatedCommands: ["jj status", "jj diff"],
	},
	{
		jjConcept: "Bookmark",
		gitConcept: "Branch",
		explanation:
			"jj のブックマークは git のブランチに相当する名前付きポインタ。ただし jj では新しいコミットを作っても自動で動かない。明示的に set する必要がある。",
		jjExample: "jj bookmark set main",
		gitExample: "git branch main / git checkout -b main",
		relatedCommands: [
			"jj bookmark set",
			"jj bookmark list",
			"jj bookmark delete",
		],
	},
	{
		jjConcept: "Operation Log",
		gitConcept: "Reflog（ただしより強力）",
		explanation:
			"jj はリポジトリへの全操作を記録する。任意の操作を undo/restore できる。git の reflog はブランチの移動のみ記録するが、jj はすべての状態変更を記録する。",
		jjExample: "jj operation log / jj undo",
		gitExample: "git reflog",
		relatedCommands: ["jj op log", "jj undo", "jj op restore"],
	},
	{
		jjConcept: "Immutable Commit (◆)",
		gitConcept: "Protected Branch（概念的に近い）",
		explanation:
			"変更不可のコミット。デフォルトでは root commit のみ。trunk() やリモートブックマークも immutable になる。jj log で ◆ マークで表示される。",
		jjExample: "◆ zzzzzzzz root()",
		gitExample: "ブランチ保護ルール（サーバー側）",
		relatedCommands: ["jj log"],
	},
	{
		jjConcept: "Revset",
		gitConcept: "Git リビジョン構文 (HEAD~3 等)",
		explanation:
			"リビジョンを選択するためのクエリ言語。git のリビジョン構文よりはるかに表現力が高い。集合演算（和、積、差）もサポート。",
		jjExample: 'jj log -r "ancestors(@, 5)"',
		gitExample: "git log HEAD~5..HEAD",
		relatedCommands: ["jj log -r", "jj rebase -r"],
	},
	{
		jjConcept: "jj commit（⚠️ 名前に注意）",
		gitConcept: "git commit",
		explanation:
			"同じ名前だが意味が違う。git commit は「新しいスナップショットを作って新しい hash を生む」操作。jj commit は「今の change を閉じて、次の新しい change に移る」操作。jj では change ID は jj new した時点ですでに存在しているので、commit は新しい ID を生む操作ではない。実質 jj describe + jj new のショートカット。",
		jjExample:
			'jj commit -m "done"\n= jj describe -m "done" + jj new\n→ 既存 change を閉じ、新 change へ',
		gitExample:
			'git add -A && git commit -m "done"\n→ 新しい commit hash が生まれる',
		relatedCommands: ["jj commit", "jj describe", "jj new"],
	},
	{
		jjConcept: "jj new",
		gitConcept: "git commit + 新しい作業開始",
		explanation:
			"現在の変更を確定して（親にして）、新しい空のワーキングコピーを作成。git の commit に近いが、jj では WC 自体がすでにコミットなので、新しいコミットの上に移動するイメージ。",
		jjExample: "jj new",
		gitExample: 'git add -A && git commit -m "..." && (continue working)',
		relatedCommands: ["jj new", "jj new --insert-before"],
	},
	{
		jjConcept: "jj squash",
		gitConcept: "git commit --amend / git rebase -i (squash)",
		explanation:
			"ワーキングコピーの変更を親コミットに吸収する。git の amend に近いが、change ID は変わらないのでより安全。",
		jjExample: "jj squash",
		gitExample: "git add -A && git commit --amend",
		relatedCommands: ["jj squash", "jj squash --into"],
	},
	{
		jjConcept: "Divergent Change (??)",
		gitConcept: "（git には存在しない）",
		explanation:
			"同じ change ID が複数のコミットに分岐した状態。jj log で ?? マークが付く。jj describe と自動スナップショットが同時に起きると発生しやすい。git ではそもそも commit hash が不変なのでこの概念はない。jj 固有の「change ID は不変」という特性から生まれる問題。",
		jjExample:
			"sxvmlnny?? 46fe29bd (no desc)\nsxvmlnny?? a55e5b1a feat: ...\n→ 同じ change ID で2つのコミット",
		gitExample: "（発生しない）\ngit の commit hash は常に一意",
		relatedCommands: ["jj abandon", "jj op restore", "jj op log"],
	},
	{
		jjConcept: "Colocated Repository",
		gitConcept: "（jj 固有）",
		explanation:
			"jj と git が同じディレクトリに共存する形式。.jj/ と .git/ の両方が存在する。git コマンドも使えるし、jj コマンドも使える。jj がデフォルトでこの形式を使う。",
		jjExample: ".jj/ + .git/ が同じディレクトリに存在",
		gitExample: ".git/ のみ",
		relatedCommands: ["jj git init --colocate"],
	},
	{
		jjConcept: "Conflict（ファーストクラス）",
		gitConcept: "Merge Conflict",
		explanation:
			"jj ではコンフリクトが発生してもコミットできる。コンフリクトを含んだままコミットし、後から解決可能。git ではコンフリクト解決するまでコミットできない。",
		jjExample: "jj new main && jj rebase -d feature (conflict OK)",
		gitExample: "git merge feature (conflict → 解決必須)",
		relatedCommands: ["jj resolve", "jj status"],
	},
];
