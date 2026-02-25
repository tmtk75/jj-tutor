<div align="center">

# jj / tutor

**Jujutsu (jj) VCS を対話的に学ぶためのローカル Web アプリケーション**

リアルタイム DAG 可視化 ・ jj / git 並列比較 ・ What-If 予測 ・ Revset プレイグラウンド

[![React Router](https://img.shields.io/badge/React_Router-v7_(SSR)-6366f1?style=flat-square)](https://reactrouter.com/)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](#)

<br>

<img src="docs/screenshots/dag-view.png" alt="jj tutor — DAG View" width="65%">

</div>

> [!IMPORTANT]
> jj tutor は **jj の Web UI ではありません**。日常の VCS 操作を行うツールではなく、jj の概念やコマンドを視覚的に理解するための**学習用アプリケーション**です。

> [!NOTE]
> ローカル専用ツールです。`pnpm run dev` で起動し、ブラウザから localhost にアクセスして使います。
> 対象リポジトリの `jj` / `git` コマンドをサーバーサイドで実行し、3 秒間隔でリアルタイム更新します。

---

## Features

<table>
<tr>
<td width="50%">

### DAG 可視化

jj と git のコミットグラフを並列表示。ノードクリックでコミット詳細・evolog を確認。divergent / conflict 状態もアノテーション表示。

<img src="docs/screenshots/dag-view.png" alt="DAG View" width="100%">

</td>
<td width="50%">

### What-If 予測

`jj new`, `jj commit`, `jj squash` 等の実行結果を事前に予測表示。対応する git コマンドも併記し、概念の橋渡しを支援。

<img src="docs/screenshots/whatif-view.png" alt="What If View" width="100%">

</td>
</tr>
<tr>
<td>

### Diff ビューア

Revision diff と Operation diff の 2 カラム表示。Unified / Split 切り替え対応。

<img src="docs/screenshots/diff-view.png" alt="Diff View" width="100%">

</td>
<td>

### Commit ワークフロー

commit / split / squash / describe の操作カードと Split シミュレーターで、jj のコミットモデルを体験。

<img src="docs/screenshots/commit-view.png" alt="Commit View" width="100%">

</td>
</tr>
<tr>
<td>

### Rebase シミュレーター

Source と Destination を DAG 上でクリック選択し、rebase の Before / After を予測表示。コンフリクトの可能性も事前に検出。

<img src="docs/screenshots/revset-view.png" alt="Rebase View" width="100%">

</td>
<td>

### Revset Playground

revset 式を入力してコミットを検索・ハイライト。jj の強力なクエリ言語を試せる。

<img src="docs/screenshots/revset-view.png" alt="Revset Playground" width="100%">

</td>
</tr>
</table>

<details>
<summary><strong>More features</strong></summary>

| Feature | Description |
|---------|-------------|
| **Status** | jj status と git status の並列比較。colocated 環境での差異も一目で把握 |
| **Operations** | jj の操作ログを時系列表示。各オペレーション間の diff も確認可能 |
| **Concepts** | jj と git の概念マッピング（Change vs Commit、Bookmark vs Branch 等） |
| **FAQ** | colocated 環境の疑問や、jj 固有の概念に関する Q&A |

</details>

---

## Quick Start

### Prerequisites

| Tool | Purpose |
|------|---------|
| [mise](https://mise.jdx.dev/) | Node.js / pnpm バージョン管理 |
| [jj](https://jj-vcs.github.io/jj/) | Jujutsu VCS (PATH に通っていること) |
| git | Git CLI |

### Install & Run

```bash
# 依存関係のインストール
mise install
pnpm install

# 任意のリポジトリを対象に起動
JJ_TUTOR_REPO_PATH=/path/to/your-jj-repo pnpm run dev
```

環境変数を省略すると、jj tutor 自身のリポジトリが対象になります。

ブラウザで **http://localhost:5173** を開いてください。

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Router v7 (SSR) |
| UI | React 19 + Tailwind CSS v4 |
| DAG | ReactFlow + Dagre |
| i18n | i18next (ja / en) |
| Lint / Format | Biome |
| Toolchain | mise (Node.js 24, pnpm 10) |

### Architecture

```
Route loader (server)  →  jj/git executor  →  parse stdout  →  React component (client)
```

サーバーサイドの loader が `jj` / `git` コマンドを実行し、パース結果を React コンポーネントに渡します。Root layout が 3 秒ごとにポーリングし、リポジトリの状態をリアルタイムに反映します。
