// Server-side structured logger with elapsed time tracking

const GRAY = "\x1b[90m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const MAGENTA = "\x1b[35m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function timestamp(): string {
	const d = new Date();
	const hh = String(d.getHours()).padStart(2, "0");
	const mm = String(d.getMinutes()).padStart(2, "0");
	const ss = String(d.getSeconds()).padStart(2, "0");
	const ms = String(d.getMilliseconds()).padStart(3, "0");
	return `${hh}:${mm}:${ss}.${ms}`;
}

function formatMs(ms: number): string {
	if (ms < 1) return "<1ms";
	if (ms < 1000) return `${Math.round(ms)}ms`;
	return `${(ms / 1000).toFixed(2)}s`;
}

export function logCmd(
	bin: "jj" | "git",
	args: string[],
	elapsedMs: number,
	error?: string,
): void {
	const color = bin === "jj" ? MAGENTA : YELLOW;
	const tag = `${color}${BOLD}[${bin}]${RESET}`;
	const cmd = args
		.map((a) => (a.includes(" ") || a.includes('"') ? `'${a}'` : a))
		.join(" ");
	const elapsed = `${GREEN}${formatMs(elapsedMs)}${RESET}`;

	if (error) {
		console.log(
			`${GRAY}${timestamp()}${RESET} ${tag} ${RED}ERR${RESET} ${cmd} ${elapsed}`,
		);
	} else {
		console.log(
			`${GRAY}${timestamp()}${RESET} ${tag} ${cmd} ${elapsed}`,
		);
	}
}

export function logLoader(
	route: string,
	elapsedMs: number,
	params?: string,
): void {
	const tag = `${CYAN}${BOLD}[loader]${RESET}`;
	const elapsed = `${GREEN}${formatMs(elapsedMs)}${RESET}`;
	const p = params ? ` ${GRAY}${params}${RESET}` : "";
	console.log(
		`${GRAY}${timestamp()}${RESET} ${tag} ${route}${p} ${elapsed}`,
	);
}

export function logLoaderError(
	route: string,
	error: unknown,
	elapsedMs: number,
): void {
	const tag = `${CYAN}${BOLD}[loader]${RESET}`;
	const elapsed = `${GREEN}${formatMs(elapsedMs)}${RESET}`;
	const msg = error instanceof Error ? error.message : String(error);
	console.log(
		`${GRAY}${timestamp()}${RESET} ${tag} ${RED}ERR${RESET} ${route} ${msg} ${elapsed}`,
	);
}

/** Measure elapsed time for an async operation */
export async function withTiming<T>(
	fn: () => Promise<T>,
): Promise<{ result: T; elapsedMs: number }> {
	const start = performance.now();
	const result = await fn();
	return { result, elapsedMs: performance.now() - start };
}
