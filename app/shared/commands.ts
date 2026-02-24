import type { WhatIfCommand } from "./types";

export const WHATIF_COMMANDS: WhatIfCommand[] = [
	{
		id: "jj-new",
		command: "jj new",
		displayName: "jj new",
		description:
			"現在の WC を親にして、新しい空のワーキングコピーを作成する。",
		category: "create",
	},
	{
		id: "jj-new-branch",
		command: "jj new @--",
		displayName: "jj new @--（分岐）",
		description:
			"2つ前の変更から分岐して新しい WC を作成。bookmark なしで並行作業できる。",
		category: "create",
	},
	{
		id: "jj-commit",
		command: 'jj commit -m "message"',
		displayName: "jj commit",
		description:
			"現在の WC に説明を付けて確定し、新しい空のワーキングコピーを作成する。jj describe + jj new と同等。",
		category: "create",
	},
	{
		id: "jj-squash",
		command: "jj squash",
		displayName: "jj squash",
		description: "WC の変更を親コミットに吸収する（git commit --amend 相当）。",
		category: "modify",
	},
	{
		id: "jj-bookmark-set",
		command: "jj bookmark set main -r @",
		displayName: "jj bookmark set",
		description: "現在の WC にブックマーク（ブランチ名）を設定する。",
		category: "bookmark",
	},
	{
		id: "jj-new-insert-before",
		command: "jj new --insert-before @",
		displayName: "jj new --insert-before",
		description:
			"現在の WC の前に新しいコミットを挿入する。WC の親と WC の間に入る。",
		category: "create",
	},
	{
		id: "jj-describe",
		command: 'jj describe -m "message"',
		displayName: "jj describe",
		description:
			"現在の WC の説明（コミットメッセージ）を変更する。DAG の構造は変わらない。",
		category: "modify",
	},
	{
		id: "jj-edit-parent",
		command: "jj edit @-",
		displayName: "jj edit @-",
		description: "WC を親コミットに移動する。親を直接編集できるようになる。",
		category: "navigate",
	},
	{
		id: "jj-undo",
		command: "jj undo",
		displayName: "jj undo",
		description:
			"直前の操作を取り消し、リポジトリを1つ前の状態に戻す。git には直接の対応がない強力な機能。",
		category: "modify",
	},
	{
		id: "jj-restore",
		command: "jj restore --from @-",
		displayName: "jj restore",
		description:
			"作業コピーのファイルを親コミットの状態に戻す。git restore / git checkout -- に相当。",
		category: "modify",
	},
];
