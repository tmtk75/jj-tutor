import { useState } from "react";

interface FaqItem {
	id?: string;
	q: string;
	a: string;
	detail?: string;
	commands?: { label: string; cmd: string }[];
	gitComparison?: string;
}

const FAQ_ITEMS: FaqItem[] = [
	{
		q: "jj undo と jj restore の違いは？",
		a: "undo は「jj コマンド（操作）の取り消し」、restore は「ファイル内容の復元」。全く別の機能。",
		commands: [
			{ label: "操作を丸ごと取り消す", cmd: "jj undo" },
			{ label: "任意の時点に復元", cmd: "jj op restore <op-id>" },
			{ label: "ファイルを親の状態に戻す", cmd: "jj restore --from @- <path>" },
			{ label: "全ファイルを親の状態に", cmd: "jj restore --from @-" },
		],
		gitComparison:
			"git には undo がない。git reset, git revert, git checkout --, git reflog を状況に応じて使い分ける必要がある。jj は undo（操作レベル）と restore（ファイルレベル）の2つだけ。",
	},
	{
		q: "change ID と commit ID の違いは？",
		a: "change ID は「変更」に付く不変の ID。commit ID は「スナップショット」に付く ID で、ファイルを編集するたびに変わる。",
		commands: [
			{ label: "change ID で指定", cmd: "jj log -r <change-id>" },
			{ label: "commit ID で指定", cmd: "jj log -r <commit-id>" },
		],
		gitComparison:
			"git には change ID がない。commit hash のみ。git commit --amend すると新しい hash になり、古い hash は reflog からしか辿れない。jj では change ID が不変なので追跡が容易。",
	},
	{
		q: "なぜ staging（git add）がないの？",
		a: "jj では作業コピー自体がコミット。ファイルを保存するだけで自動的にコミットに反映される。「一部だけコミットしたい」場合は jj split で分割する。",
		commands: [
			{ label: "コミットを分割", cmd: "jj split" },
			{ label: "特定ファイルだけ分割", cmd: "jj split <path>" },
		],
		gitComparison:
			"git: git add -p で一部をステージング → git commit。jj: まず全部コミット → jj split で分割。アプローチが逆。jj の方が「とりあえず保存、後で整理」に向いている。",
	},
	{
		q: "jj new と jj commit の違いは？",
		a: "jj new は「新しい空のコミットを作成」。jj commit は「jj describe → jj new」の順で実行するショートカット。現在の WC にメッセージを付けてから新しいコミットへ進む。順番が重要で、jj new → jj describe だと新しい方にメッセージが付いてしまう。",
		commands: [
			{ label: "空のコミットを作成", cmd: "jj new" },
			{ label: "メッセージ付きで確定", cmd: 'jj commit -m "message"' },
			{ label: "メッセージだけ変更", cmd: 'jj describe -m "message"' },
		],
		gitComparison:
			"git commit は staging → 確定の1コマンド。jj commit は describe + new の2つを同時に行う。jj では「コミットは常に存在し、後からメッセージを付ける」という考え方。",
	},
	{
		q: "empty commit って何？消していいの？",
		a: "変更がないコミット。jj new した直後は empty。作業中の「場所取り」として普通に使う。git では --allow-empty が必要な特殊操作だが、jj では日常。",
		commands: [
			{ label: "空コミットを削除", cmd: "jj abandon" },
			{ label: "空コミットを作成", cmd: "jj new" },
		],
		gitComparison:
			"git: 空コミットは git commit --allow-empty でしか作れない特殊なもの。jj: jj new で普通に作る。ブランチの開始点として使ったり、「ここに後で変更を入れる」という意図を示したりする。",
	},
	{
		q: "immutable って何？なぜ編集できないの？",
		a: "immutable は書き換え不可のコミット。リモートに push 済みのコミットや、設定で保護されたコミットに付く。rebase や edit の対象外。",
		gitComparison:
			"git: 保護ブランチ（GitHub の branch protection）に近いが、jj では個々のコミットレベルで制御。git は force push すれば何でも書き換えられるが、jj は明示的に immutable を解除しないと編集不可。",
	},
	{
		q: "bookmark と git branch の関係は？",
		a: "jj bookmark = git branch。jj bookmark create で git ブランチが作られる。ただし jj ではブランチなしで開発できる（匿名ブランチ的な使い方）。",
		commands: [
			{ label: "ブックマーク作成", cmd: "jj bookmark create <name> -r @" },
			{ label: "ブックマーク移動", cmd: "jj bookmark set <name> -r @" },
			{ label: "ブックマーク削除", cmd: "jj bookmark delete <name>" },
			{ label: "リモートに push", cmd: "jj git push" },
		],
		gitComparison:
			"git: ブランチ必須。ブランチなしだと detached HEAD で迷子になる。jj: ブランチなしでも change ID で追跡できるので問題ない。push するときだけ bookmark が必要。",
	},
	{
		q: "ブランチなしで並行作業（分岐）するには？",
		a: "jj new <revision> で任意の地点から新しい WC を作れる。bookmark（ブランチ名）を付けなくても change ID で追跡できるので、名前なしで自由に分岐できる。jj log で DAG を見れば分岐が分かる。",
		commands: [
			{ label: "親から分岐", cmd: "jj new @-" },
			{ label: "2つ前から分岐", cmd: "jj new @--" },
			{ label: "特定の変更から分岐", cmd: "jj new <change-id>" },
			{ label: "元の作業に戻る", cmd: "jj edit <change-id>" },
		],
		gitComparison:
			"git: git checkout -b feature で必ずブランチ名が必要。名前なしで分岐すると detached HEAD で追跡困難。jj: jj new @-- だけで分岐でき、change ID で追跡可能。ブランチ名の管理が不要なので気軽に分岐できる。push するときだけ jj bookmark create で名前を付ければよい。",
	},
	{
		q: "jj の 1 commit は git の feature branch に相当する？",
		a: "小さい修正なら jj 1 commit ≈ git 1 feature branch（1 commit のブランチ）。大きい機能なら jj でも複数コミットを積む。違いは、git はブランチ名で束ねるが、jj は DAG の形自体が構造なのでラベル不要。",
		detail: [
			"## jj と git の作業単位の対応",
			"",
			"| git | jj |",
			"|-----|-----|",
			"| 1 feature branch（1 commit） | 1 commit |",
			"| 1 feature branch（N commits） | N commits の連鎖（bookmark は任意） |",
			"| branch 名 | description + 必要なら bookmark |",
			"",
			"## 小さい修正の場合",
			"",
			"```",
			"# git: ブランチを作って1コミット",
			"git checkout -b fix/typo",
			'git commit -m "fix typo"',
			"",
			"# jj: コミット1つで完結",
			'jj describe -m "fix typo"',
			"```",
			"",
			"## 大きい機能の場合",
			"",
			"```",
			"# git",
			"git checkout -b feature/auth",
			'git commit -m "add types"',
			'git commit -m "add API"',
			'git commit -m "add UI"',
			"",
			"# jj: 同じように積む。push するときだけ bookmark",
			'jj describe -m "add types"',
			"jj new",
			'jj describe -m "add API"',
			"jj new",
			'jj describe -m "add UI"',
			"jj bookmark set feature-auth -r @  # push 前に先頭に付ける",
			"```",
			"",
			"## なぜ bookmark なしで管理できるのか",
			"",
			"git はブランチ名がないと detached HEAD になり、コミットが迷子になる。",
			"jj は change ID が不変なので、ブランチ名がなくても DAG 上で追跡可能。",
			"`jj log` で分岐が視覚的に見えるので、名前がなくても「何の作業か」を description で把握できる。",
		].join("\n"),
		commands: [
			{ label: "説明を付ける", cmd: 'jj describe -m "message"' },
			{ label: "任意の地点から分岐", cmd: "jj new <change-id>" },
			{ label: "push 前に bookmark", cmd: "jj bookmark set <name> -r @" },
		],
		gitComparison:
			"git ではブランチが「作業を束ねる管理手段」と「git の仕組み上の必須要素」を兼ねている。jj ではこれが分離され、DAG が管理手段、bookmark はラベルに過ぎない。名前付けは任意で、必要なときだけやる。",
	},
	{
		q: "bookmark（ブランチ名）は自動で進む？",
		a: "進まない。git では commit するとブランチポインタが自動で最新を指すが、jj の bookmark は手動で付け替える必要がある。これは設計上の意図で「bookmark は push 用のラベル」という思想。",
		detail: [
			"## git と jj の違い",
			"",
			"```",
			"# git: commit するとブランチが自動で進む",
			"git checkout feature",
			'git commit -m "change 1"  # feature → commit1',
			'git commit -m "change 2"  # feature → commit2（自動で進む）',
			"",
			"# jj: bookmark は手動",
			"jj bookmark set feature -r @",
			"jj new",
			'jj describe -m "change 2"',
			"# ここで feature はまだ前のコミットを指したまま！",
			"jj bookmark set feature -r @  # 手動で付け替え",
			"```",
			"",
			"## 推奨ワークフロー",
			"",
			"普段は bookmark を気にせず作業し、push する直前に先頭につける:",
			"```",
			"# 作業中: bookmark なしで自由にコミット",
			"jj new",
			'jj describe -m "step 1"',
			"jj new",
			'jj describe -m "step 2"',
			"",
			"# push するとき: 先頭に bookmark",
			"jj bookmark set my-feature -r @",
			"jj git push",
			"```",
			"",
			"## なぜ自動で進めないのか",
			"",
			"jj では並行作業で複数の head が存在する。",
			"どの head を追跡すべきか自動判定が難しいため、明示的に指定する設計になっている。",
			"その代わり change ID で追跡できるので、bookmark がなくても困らない。",
		].join("\n"),
		commands: [
			{ label: "bookmark を先頭に移動", cmd: "jj bookmark set <name> -r @" },
			{ label: "bookmark 一覧", cmd: "jj bookmark list" },
			{ label: "push", cmd: "jj git push" },
		],
		gitComparison:
			"git: ブランチポインタは commit ごとに自動で進む。これが git の基本動作であり、ブランチ = 最新コミットへのポインタ。jj: bookmark は手動で移動する必要がある。面倒に見えるが、「ローカルでは change ID で追跡、push 時だけ bookmark を使う」運用なら問題ない。git のブランチは「必須のインフラ」、jj の bookmark は「オプションのラベル」。",
	},
	{
		q: "conflict があってもコミットできるの？",
		a: "はい。jj では conflict 状態でもコミットとして記録される。後から解消すればOK。git のように作業が中断されない。",
		commands: [
			{ label: "conflict を解消", cmd: "jj resolve" },
			{ label: "conflict の状態を確認", cmd: "jj log -r 'conflict()'" },
		],
		gitComparison:
			"git: merge/rebase 中に conflict → 解消するまで他の作業ができない。jj: conflict をコミットとして保存 → 別の作業をして → 後で戻って解消。ノンブロッキング。",
	},
	{
		q: "jj rebase と git rebase の違いは？",
		a: "基本は同じ（コミットの親を変える）だが、jj は conflict で中断しない点が大きく異なる。また jj は単一コミットの移動（-r）と子孫ごと移動（-s, -b）を明示的に使い分ける。",
		commands: [
			{ label: "単一コミットを移動", cmd: "jj rebase -r <rev> -d <dest>" },
			{ label: "子孫ごと移動", cmd: "jj rebase -s <rev> -d <dest>" },
			{ label: "ブランチごと移動", cmd: "jj rebase -b <rev> -d <dest>" },
		],
		gitComparison:
			"git rebase: conflict → 中断 → 解消 → continue を繰り返す。jj rebase: conflict があってもそのままコミットとして記録。全部終わってから一括で解消できる。",
	},
	{
		q: "jj の操作を全部取り消すには？",
		a: "jj op restore で任意の操作時点に戻れる。jj op log で操作一覧を確認し、戻したい時点の ID を指定する。",
		commands: [
			{ label: "操作一覧を表示", cmd: "jj op log" },
			{ label: "直前の操作を取り消し", cmd: "jj undo" },
			{ label: "特定時点に復元", cmd: "jj op restore <op-id>" },
			{ label: "操作の前後を比較", cmd: "jj op diff --op <op-id>" },
		],
		gitComparison:
			"git: reflog + reset --hard で近いことはできるが、ブランチ単位でしか戻せない。jj: リポジトリ全体を任意の操作時点に完全復元できる。",
	},
	{
		q: "evolog って何？",
		a: "1つの change の進化履歴。change ID は不変だが、ファイルを編集するたびに新しい commit ID でスナップショットが作られる。evolog はその履歴を表示する。",
		commands: [
			{ label: "作業コピーの進化履歴", cmd: "jj evolog -r @" },
			{ label: "特定 change の履歴", cmd: "jj evolog -r <change-id>" },
		],
		gitComparison:
			"git には直接の対応なし。git reflog はブランチの移動履歴だが、evolog は「1つの変更の内容がどう変わってきたか」を追跡する。git commit --amend の履歴が自動で残るイメージ。",
	},
	{
		id: "divergent",
		q: "Divergent Change (??) って何？どう直すの？",
		a: "同じ change ID が複数のコミットに分岐した状態。jj log で ?? マークが付く。jj 固有の問題で、git では発生しない。",
		detail: [
			"## 発生メカニズム",
			"",
			"jj の change ID は不変だが、裏の commit（commit ID）は書き換え可能。",
			"1つのコミットが2箇所から別々に書き換えられると、同じ change ID で2つのコミットができてしまう。",
			"",
			"## よくある発生パターン",
			"",
			"### パターン1: colocated repo で git 操作を混ぜた",
			"```",
			'jj describe -m "feature"   # jj が commit を書き換え',
			'git commit --amend -m "fix" # git も同じ commit を書き換え',
			"→ jj と git で別々の書き換えが発生 → divergent",
			"```",
			"",
			"### パターン2: 別ターミナルで同じ change を同時操作",
			"```",
			'# Terminal A: jj describe sxvmlnny -m "AAA"',
			"# Terminal B: jj squash -r sxvmlnny  (ほぼ同時)",
			"→ 両方が元のコミットを書き換え → divergent",
			"```",
			"",
			"### パターン3: describe + 自動スナップショット（最も多い）",
			"```",
			"# sxvmlnny が WC の状態でファイル編集",
			"# → 自動スナップショットで commit ID が更新",
			"jj new          # WC が新 change に移動",
			"# ファイルを編集（新 WC で）",
			'jj describe sxvmlnny -m "feat: ..."',
			"# describe が古い commit を書き換え → 新旧2つの commit が",
			"# 同じ change ID を持つ → divergent",
			"```",
			"",
			"## なぜ git では起きないのか",
			"",
			"git の commit hash は内容から計算される一意な値。",
			"「同じ hash の別バージョン」は原理的に存在しない。",
			"jj は change ID という抽象レイヤーを持つ分、この問題が起きうる。",
			"",
			"## 解消手順",
			"",
			"### 方法1: abandon（新しいコミットが上に乗っている場合）",
			"",
			"#### ステップ1: どちらが孤立しているか確認",
			"```",
			"jj log  # DAG を見て @ の祖先チェーンにいる方を確認",
			"```",
			"@ の祖先にいる方は消せない（消すと @ が壊れる）。孤立している方が abandon 候補。",
			"",
			"#### ステップ2: WC に孤立側の変更が全部含まれているか確認",
			"```",
			"jj diff --from @ --to ORPHANED_COMMIT_ID",
			"```",
			"+ 行（追加）がなければ WC は孤立側の完全上位互換 → 安心して abandon できる。",
			"+ 行があればそれが「WC にない、孤立側だけのコード」。",
			"",
			"#### ステップ3: + 行があれば取り込む",
			"```",
			"jj restore --from ORPHANED_COMMIT_ID path/to/file",
			"```",
			"",
			"#### ステップ4: abandon",
			"```",
			"jj abandon -r ORPHANED_COMMIT_ID",
			"```",
			"必ず commit ID で指定。change ID だと両方消えてしまう。",
			"",
			"### 方法2: op restore で分岐前に戻す（確実だが巻き戻しが大きい）",
			"```",
			"jj op log     # 分岐前の操作を探す",
			"jj op restore OP_ID",
			"```",
			"分岐後の操作はすべて巻き戻されるが、確実に解消できる。",
			"",
			"## abandon する前に: WC の罠",
			"",
			"divergent な2つの commit 間で diff を取ると、片方にしかないコードが見える。",
			"「これを abandon したらコードが消える！」と思いがちだが、",
			"WC（作業コピー）にその変更が含まれていれば問題ない。",
			"",
			"```",
			"@  qoswmyuv  ← WC。ファイルの実体はここ",
			"│",
			"○  sxvmlnny?? 46fe29bd  ← 親。一部の変更がない",
			"│",
			"│ ○  sxvmlnny?? a55e5b1a  ← こっちにはある",
			"├─╯",
			"```",
			"",
			"diff -from a55e5b1a --to 46fe29bd で「消える」ように見えても、",
			"WC(qoswmyuv) に含まれていれば abandon しても失われない。",
			"",
			"確認方法:",
			"```",
			"jj diff --from @ --to ORPHANED_COMMIT_ID",
			"```",
			"+ 行がなければ WC に全部入っている。+ 行があればそれだけが不足分。",
			"",
			"## divergent 中は多くのコマンドがエラーになる",
			"",
			"divergent な change ID を指定すると、jj は「どっちの commit？」と",
			"判断できないため、evolog, diff, describe などがエラーになる:",
			"```",
			"$ jj evolog -r sxvmlnny",
			"Error: Change ID `sxvmlnny` is divergent",
			"Hint: Use commit ID to select single revision",
			"```",
			"",
			"回避策: commit ID で直接指定するか、先に divergent を解消する。",
			"```",
			"jj evolog -r a55e5b1a    # commit ID で指定",
			"jj evolog -r 46fe29bd    # もう片方",
			"```",
		].join("\n"),
		commands: [
			{ label: "divergent な change を探す", cmd: "jj log" },
			{ label: "不要な方を捨てる", cmd: "jj abandon -r COMMIT_ID" },
			{ label: "操作履歴を確認", cmd: "jj op log" },
			{ label: "分岐前に復元", cmd: "jj op restore OP_ID" },
		],
		gitComparison:
			"git には divergent change の概念がない。git の commit hash は内容から一意に決まるため「同じ ID の別バージョン」は原理的に発生しない。jj の change ID は内容と独立した ID なので、同じ change ID に対して異なる commit が生まれうる。colocated repo で git コマンドを直接使うと特に起きやすい。",
	},
	{
		q: "git リポジトリで jj を使い始めるには？",
		a: "jj git init で新規作成。既存の git リポで使うなら --colocate を付けると .git と .jj が同じディレクトリに共存し、git コマンドも併用できる。jj init は廃止され、git backend 一択になった。",
		commands: [
			{ label: "新規リポ作成", cmd: "jj git init" },
			{ label: "既存 git リポで併用", cmd: "jj git init --colocate" },
			{ label: "git リモートから clone", cmd: "jj git clone <url>" },
		],
		gitComparison:
			"--colocate なし: .jj/ の中に git repo が隠れる（git コマンドは直接使えない）。--colocate あり: .git と .jj が共存し git コマンドも使える。ただし直接 git commit すると jj が追跡しきれないことがあるので jj 経由が推奨。",
	},
	{
		q: "git clean -xdf で .jj/ が消える！",
		a: "git clean の -x フラグは .gitignore を無視して削除する。.gitignore に .jj/ を書いていても -x がある限り消される。colocate モードの最大の罠。",
		commands: [
			{ label: "安全な clean（ignore 尊重）", cmd: "git clean -df" },
			{ label: ".jj を除外して clean", cmd: "git clean -xdf -e .jj" },
		],
		gitComparison:
			"git clean -df: .gitignore に書かれたファイルは残す。git clean -xdf: .gitignore を完全無視して全削除。-x は「ビルド成果物を消す」用途だが、.jj/ も巻き添えになる。jj を使う場合は -x を避けるか -e .jj で除外すること。",
	},
	{
		q: "jj コマンドを実行したら git の staging が消えた！",
		a: "jj にはstagingの概念がない。jj コマンドを実行すると作業コピーを丸ごとスナップショットし直すため、git の index（staging area）はリセットされる。colocate モードでは jj と git の操作を混ぜないこと。",
		commands: [
			{ label: "jj の世界で戻す", cmd: "jj undo" },
		],
		gitComparison:
			"git add でステージングした状態は git の index に保存される。しかし jj は index を管理しないため、jj コマンド実行時にリセットしてしまう。colocate モードでは「jj だけ使う」か「git だけ使う」のどちらかに統一すべき。混在は事故の元。",
	},
	{
		q: "git status で見たことない表示が出る（new file が not staged に出る）",
		a: "colocate モードでは jj がスナップショット時に git の index を自動操作する。そのため git add していないファイルが「Changes not staged for commit: new file:」として表示されることがある。通常の git なら Untracked files に出るはずだが、jj が index に追加してしまうため git の表示がおかしくなる。",
		commands: [
			{ label: "jj のステータス確認", cmd: "jj st" },
			{ label: "git のステータス確認", cmd: "git status" },
		],
		gitComparison:
			"通常の git: 新しいファイルは Untracked files に表示され、git add すると Changes to be committed の new file: に移る。colocate モード: jj が index を直接操作するため、git add していないのに new file: が Changes not staged for commit に出る。git の想定外の状態なので見慣れない表示になる。colocate モードでは git status より jj st を信用すること。",
	},
	{
		q: "過去のコミットからファイルを削除したい（歴史の書き換え）",
		a: "jj restore --from <rev>- --to <rev> <path> で、特定のコミットから特定のファイルを除外できる。「<rev>- の状態（= そのファイルがない状態）に戻す」という意味。子孫は自動で rebase される。",
		detail: [
			"## ユースケース",
			"",
			"初期コミットに誤って含めたファイル（.env、大きなバイナリ、不要な設定ファイル等）を",
			"歴史から除外したい場合に使う。",
			"",
			"## 具体例: 初期コミットから .playwright-mcp を除外",
			"",
			"```",
			"# まず対象のコミットを確認",
			"jj log -r 'all()'",
			"",
			"# ovklzmrn（初期コミット）から .playwright-mcp を除外",
			"# --from ovklzmrn- は「ovklzmrn の親の状態」= そのファイルがない状態",
			"jj restore --from ovklzmrn- --to ovklzmrn .playwright-mcp",
			"```",
			"",
			"## immutable なコミットの場合",
			"",
			"リモートに push 済みの（immutable な）コミットを書き換えるには --ignore-immutable を付ける:",
			"```",
			"jj restore --from ovklzmrn- --to ovklzmrn .playwright-mcp --ignore-immutable",
			"```",
			"",
			"## 何が起きるか",
			"",
			"1. 指定したコミット（ovklzmrn）から .playwright-mcp が消える",
			"2. そのコミットの子孫は全て自動で rebase される",
			"3. 子孫のコミットからもそのファイルの影響が伝播する",
			"",
			"## 注意点",
			"",
			"- push 済みのコミットを書き換えると force push が必要になる",
			"- 共同作業者がいる場合は事前に相談すること",
			"- 失敗したら jj undo で元に戻せる",
		].join("\n"),
		commands: [
			{ label: "ファイルを歴史から除外", cmd: "jj restore --from <rev>- --to <rev> <path>" },
			{ label: "immutable でも実行", cmd: "jj restore --from <rev>- --to <rev> <path> --ignore-immutable" },
			{ label: "操作を取り消し", cmd: "jj undo" },
		],
		gitComparison:
			"git で同じことをするには git filter-branch や git rebase -i + git rm を使う必要があり非常に面倒。BFG Repo-Cleaner という外部ツールもある。jj では jj restore 1コマンドで完結し、子孫の rebase も自動。圧倒的にシンプル。",
	},
	{
		q: "AI ツール（Claude Code 等）と jj を併用するときの注意は？",
		a: "AI がファイルを編集中は jj コマンドを実行しないこと。auto-snapshot と jj コマンドが同じ change を同時に書き換え、divergent change が発生する。",
		detail: [
			"## なぜ危険なのか",
			"",
			"AI ツールがファイルを編集すると、次の jj コマンド実行時に auto-snapshot が走り commit ID が更新される。",
			"このタイミングで describe, squash, new などを実行すると、",
			"snapshot による書き換えとコマンドによる書き換えが競合して divergent change が発生する。",
			"",
			"## 特に危険な操作",
			"",
			"AI 編集中にこれらを実行すると divergent になりやすい:",
			"```",
			"jj describe  # 同じ change の commit を書き換え → 競合",
			"jj squash    # 同じ change の commit を書き換え → 競合",
			"jj new       # snapshot + new が走る → タイミング次第で競合",
			"```",
			"",
			"## 安全な運用ルール",
			"",
			"1. AI の作業が完了するのを待つ",
			"2. 完了後に jj log で状態を確認",
			"3. それから describe, new, squash などを実行",
			"",
			"## 安全な操作（AI 作業中でも OK）",
			"",
			"```",
			"jj log       # 読み取り専用。状態確認だけ",
			"jj st        # 読み取り専用",
			"jj diff      # 読み取り専用",
			"jj op log    # 読み取り専用",
			"```",
			"読み取り専用のコマンドは snapshot をトリガーするが、change を書き換えないので安全。",
		].join("\n"),
		commands: [
			{ label: "AI 完了後に状態確認", cmd: "jj log" },
			{ label: "変更内容を確認", cmd: "jj diff -r @" },
			{ label: "説明を追加", cmd: 'jj describe -m "message"' },
			{ label: "次のコミットへ", cmd: "jj new" },
		],
		gitComparison:
			"git では AI ツールがファイルを編集しても、明示的に git add && git commit するまでコミットに影響しない。jj は auto-snapshot があるため、ファイル変更が即座にコミットに反映される。この違いが AI 併用時の divergent 問題を引き起こす。git の方が「うっかり競合」は起きにくいが、jj の auto-snapshot は「コミットし忘れ」を防ぐメリットもある。",
	},
];

export function FaqView() {
	const [selectedIdx, setSelectedIdx] = useState(() => {
		if (typeof window !== "undefined") {
			const hash = window.location.hash.slice(1);
			if (hash) {
				const idx = FAQ_ITEMS.findIndex((item) => item.id === hash);
				if (idx >= 0) return idx;
			}
		}
		return 0;
	});
	const selected = FAQ_ITEMS[selectedIdx];

	return (
		<div className="p-6 h-full flex flex-col">
			<h2 className="text-lg font-bold mb-2">FAQ: jj のよくある疑問</h2>
			<p className="text-xs text-text-muted mb-4">
				git ユーザーが jj を使い始めるときに戸惑うポイントをまとめました。
			</p>

			<div className="flex gap-6 flex-1 min-h-0">
				{/* Left: question list */}
				<div className="w-72 shrink-0 overflow-y-auto space-y-1">
					{FAQ_ITEMS.map((item, i) => (
						<button
							key={item.q}
							type="button"
							onClick={() => setSelectedIdx(i)}
							className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
								selectedIdx === i
									? "bg-jj-purple text-white"
									: "text-text-primary hover:bg-surface-raised"
							}`}
						>
							<span className={`font-bold mr-1.5 ${selectedIdx === i ? "text-purple-300" : "text-jj-purple"}`}>Q.</span>
							{item.q}
						</button>
					))}
				</div>

				{/* Right: answer detail */}
				<div className="flex-1 overflow-y-auto">
					{selected && (
						<div className="space-y-4">
							<div className="bg-jj-purple/8 rounded-lg p-4 border border-jj-purple/20">
								<div className="flex gap-3 mb-3">
									<span className="text-jj-purple font-bold text-lg shrink-0">Q.</span>
									<h3 className="text-base font-bold">{selected.q}</h3>
								</div>
								<div className="flex gap-3">
									<span className="text-jj-purple font-bold text-lg shrink-0">A.</span>
									<p className="text-sm text-text-primary leading-relaxed">{selected.a}</p>
								</div>
							</div>

							{selected.detail && (
								<div className="bg-surface rounded-lg p-4 border border-border text-sm text-text-primary leading-relaxed">
									{selected.detail.split("\n").map((line, i) => {
										if (line.startsWith("## ")) {
											return <h3 key={i} className="font-bold text-base text-text-primary mt-4 mb-2 first:mt-0">{line.slice(3)}</h3>;
										}
										if (line.startsWith("### ")) {
											return <h4 key={i} className="font-bold text-sm text-text-secondary mt-3 mb-1">{line.slice(4)}</h4>;
										}
										if (line === "```") {
											return null;
										}
										if (line.startsWith("```")) {
											return null;
										}
										if (i > 0 && selected.detail!.split("\n")[i - 1]?.startsWith("```")) {
											// Inside code block - find all lines until closing ```
											return null;
										}
										// Check if inside a code block
										const lines = selected.detail!.split("\n");
										let inCode = false;
										for (let j = 0; j < i; j++) {
											if (lines[j] === "```" || lines[j]?.startsWith("```")) inCode = !inCode;
										}
										if (inCode) {
											return <code key={i} className="block font-mono text-xs bg-surface-raised border border-border rounded px-3 py-0.5 text-text-secondary">{line}</code>;
										}
										if (line === "") return <div key={i} className="h-1" />;
										return <p key={i}>{line}</p>;
									})}
								</div>
							)}

							{selected.commands && (
								<div>
									<h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
										関連コマンド
									</h4>
									<div className="grid grid-cols-2 gap-2">
										{selected.commands.map((c) => (
											<div key={c.cmd} className="bg-jj-purple/8 rounded-lg px-4 py-2.5 border border-jj-purple/20">
												<div className="text-[11px] text-text-muted mb-0.5">{c.label}</div>
												<code className="text-xs font-mono text-jj-purple font-bold">{c.cmd}</code>
											</div>
										))}
									</div>
								</div>
							)}

							{selected.gitComparison && (
								<div>
									<h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
										git との比較
									</h4>
									<div className="bg-git-orange/8 rounded-lg p-4 border border-git-orange/20">
										<div className="flex items-center gap-2 mb-2">
											<span className="bg-git-orange text-white px-1.5 py-0.5 rounded text-[10px] font-bold">git</span>
											<span className="text-xs font-bold text-text-secondary">との違い</span>
										</div>
										<p className="text-sm text-text-secondary leading-relaxed">{selected.gitComparison}</p>
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
