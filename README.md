<div align="center">

# jj / tutor

**A local web application for learning Jujutsu (jj) VCS interactively**

Real-time DAG visualization · jj / git side-by-side comparison · What-If prediction · Revset playground

[![React Router](https://img.shields.io/badge/React_Router-v7_(SSR)-6366f1?style=flat-square)](https://reactrouter.com/)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](#)

<br>

<img src="docs/screenshots/dag-view.png" alt="jj tutor — DAG View" width="65%">

</div>

> [!IMPORTANT]
> jj tutor is **not a Web UI for jj**. It is not a tool for day-to-day VCS operations. It is an **educational application** designed to help you visually understand jj's concepts and commands.

> [!NOTE]
> This is a local-only tool. Start it with `pnpm run dev` and access it via localhost in your browser.
> It executes `jj` / `git` commands server-side against a target repository and refreshes every 3 seconds.

---

## Features

<table>
<tr>
<td width="50%">

### DAG Visualization

Side-by-side commit graph for jj and git. Click a node to inspect commit details and evolog. Divergent and conflict states are annotated.

<img src="docs/screenshots/dag-view.png" alt="DAG View" width="100%">

</td>
<td width="50%">

### What-If Prediction

Preview the outcome of `jj new`, `jj commit`, `jj squash`, and more before executing. Shows the equivalent git commands to bridge concepts.

<img src="docs/screenshots/whatif-view.png" alt="What If View" width="100%">

</td>
</tr>
<tr>
<td>

### Diff Viewer

Two-column display for revision diffs and operation diffs. Toggle between unified and split views.

<img src="docs/screenshots/diff-view.png" alt="Diff View" width="100%">

</td>
<td>

### Commit Workflow

Operation cards for commit / split / squash / describe and a split simulator to experience jj's commit model hands-on.

<img src="docs/screenshots/commit-view.png" alt="Commit View" width="100%">

</td>
</tr>
<tr>
<td>

### Rebase Simulator

Click to select source and destination on the DAG, then preview the before / after of a rebase. Potential conflicts are detected in advance.

<img src="docs/screenshots/revset-view.png" alt="Rebase View" width="100%">

</td>
<td>

### Revset Playground

Enter revset expressions to search and highlight commits. A sandbox for exploring jj's powerful query language.

<img src="docs/screenshots/revset-view.png" alt="Revset Playground" width="100%">

</td>
</tr>
</table>

<details>
<summary><strong>More features</strong></summary>

| Feature | Description |
|---------|-------------|
| **Status** | Side-by-side comparison of jj status and git status. Spot differences in colocated environments at a glance |
| **Operations** | Chronological operation log for jj. Diff between any two operations |
| **Concepts** | Concept mapping between jj and git (Change vs Commit, Bookmark vs Branch, etc.) |
| **FAQ** | Q&A on colocated environment quirks and jj-specific concepts |

</details>

---

## Quick Start

### Prerequisites

| Tool | Purpose |
|------|---------|
| [mise](https://mise.jdx.dev/) | Node.js / pnpm version management |
| [jj](https://jj-vcs.github.io/jj/) | Jujutsu VCS (must be on PATH) |
| git | Git CLI |

### Install & Run

```bash
# Install dependencies
mise install
pnpm install

# Start with a target repository
JJ_TUTOR_REPO_PATH=/path/to/your-jj-repo pnpm run dev
```

If the environment variable is omitted, jj tutor targets its own repository.

Open **http://localhost:5173** in your browser.

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

Server-side loaders execute `jj` / `git` commands and pass parsed results to React components. The root layout polls every 3 seconds to keep the UI in sync with the repository state.
