import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("status", "routes/status.tsx"),
	route("commit", "routes/commit.tsx"),
	route("diff", "routes/diff.tsx"),
	route("operations", "routes/operations.tsx"),
	route("whatif", "routes/whatif.tsx"),
	route("rebase", "routes/rebase.tsx"),
	route("revset", "routes/revset.tsx"),
	route("concepts", "routes/concepts.tsx"),
	route("faq", "routes/faq.tsx"),
	route("api/commit-detail", "routes/api.commit-detail.ts"),
	route("api/op-diff", "routes/api.op-diff.ts"),
] satisfies RouteConfig;
