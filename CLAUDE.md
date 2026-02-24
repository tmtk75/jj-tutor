# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

jj-tutor: a web application for learning Jujutsu (jj) VCS concepts interactively. Shows real-time DAG visualization, jj/git parallel comparison, What-If command prediction, and educational panes for diff, commit workflow, operations, and concept mapping. All UI text is in Japanese; code comments are in English.

## Commands

```bash
pnpm run dev          # Development server (React Router SSR)
pnpm run build        # Production build
pnpm run start        # Serve production build
pnpm run check        # Biome lint + format check
pnpm run check:fix    # Biome auto-fix
```

Toolchain managed by mise (node 24.7.0, pnpm 10.17.0). No test framework is configured.

## Architecture

**React Router v7** in SSR framework mode. Each route has a `loader()` that fetches data server-side by shelling out to `jj` and `git` CLI commands, then passes data to React components.

```
Route loader (server) → jj/git executor → parse stdout → React component (client)
```

- **Polling**: Root layout (`root.tsx`) polls every 3s via `useRevalidator` to keep data fresh
- **Client-only rendering**: DAG visualization uses `<ClientOnly>` wrapper since ReactFlow requires browser APIs
- **API routes**: `/api/commit-detail` and `/api/op-diff` are fetcher-only endpoints used by client-side `useFetcher()`
- **What-If predictor**: Pure function that simulates jj command outcomes by manipulating commit arrays (no actual jj execution)

## Key Directories

- `app/server/` — jj/git command execution and output parsing. `jj-executor.ts` runs all jj commands with `--color=never --no-pager -R {repoPath}`. Templates in `jj-templates.ts` produce JSON output from jj.
- `app/shared/` — Types (`Jj*`, `Git*` prefixed) and constants shared between server and client. Re-exported from `index.ts`.
- `app/routes/` — Page routes and API routes. Each page route exports a `loader()` and default component.
- `app/components/` — UI organized by feature (dag/, commit/, diff/, status/, operations/, whatif/, concepts/, faq/).

## Conventions

- **Path alias**: `~/` maps to `app/` (configured in tsconfig and vite)
- **Formatting**: Tabs for indentation (Biome)
- **Repo path**: Detected via `jj workspace root`, overridable with `JJ_TUTOR_REPO_PATH` env var
- **DAG layout**: Dagre with `rankdir: "BT"` (bottom-to-top). Source handles at `Position.Top`, target handles at `Position.Bottom`
- **Theme colors**: Defined in `app/styles/app.css` via Tailwind v4 `@theme` — `jj-purple` (#8b5cf6) for jj elements, `git-orange` (#f97316) for git elements
