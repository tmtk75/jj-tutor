import { useEffect, useRef } from "react";
import {
	Links,
	Meta,
	NavLink,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLoaderData,
	useLocation,
	useNavigation,
	useRevalidator,
} from "react-router";
import { useTranslation } from "react-i18next";
import type { LoaderFunctionArgs } from "react-router";
import { REPO_PATH } from "./server/config";
import initI18n, { detectLocale } from "./i18n/i18n";
import "./styles/app.css";

export function loader({ request }: LoaderFunctionArgs) {
	const locale = detectLocale(request);
	return { repoPath: REPO_PATH, locale };
}

const NAV_ITEMS = [
	{ to: "/", label: "DAG", icon: "\u2299" },
	{ to: "/status", label: "Status", icon: "\u25CE" },
	{ to: "/commit", label: "Commit", icon: "\u23CE" },
	{ to: "/diff", label: "Diff", icon: "\u0394" },
	{ to: "/operations", label: "Operations", icon: "\u23F1" },
	{ to: "/whatif", label: "What If", icon: "?" },
	{ to: "/rebase", label: "Rebase", icon: "\u21C5" },
	{ to: "/revset", label: "Revset", icon: "\u03BB" },
	{ to: "/concepts", label: "Concepts", icon: "\u2261" },
	{ to: "/faq", label: "FAQ", icon: "\u2753" },
];

const LOG_NAV = "color:#a78bfa;font-weight:bold";
const LOG_POLL = "color:#6b7084;font-weight:bold";
const LOG_TIME = "color:#34d399";
const LOG_DEFAULT = "color:inherit";

function usePolling(intervalMs = 3000) {
	const revalidator = useRevalidator();
	const startRef = useRef<number | null>(null);
	const prevState = useRef(revalidator.state);

	useEffect(() => {
		const id = setInterval(() => {
			revalidator.revalidate();
		}, intervalMs);
		return () => clearInterval(id);
	}, [revalidator, intervalMs]);

	useEffect(() => {
		if (revalidator.state === "loading" && prevState.current === "idle") {
			startRef.current = performance.now();
		}
		if (revalidator.state === "idle" && prevState.current === "loading") {
			const ms = startRef.current
				? Math.round(performance.now() - startRef.current)
				: "?";
			console.log(
				`%c[poll]%c revalidate %c${ms}ms`,
				LOG_POLL,
				LOG_DEFAULT,
				LOG_TIME,
			);
			startRef.current = null;
		}
		prevState.current = revalidator.state;
	}, [revalidator.state]);
}

function useNavigationLogger() {
	const navigation = useNavigation();
	const location = useLocation();
	const startRef = useRef<number | null>(null);
	const prevState = useRef(navigation.state);
	const mounted = useRef(false);

	useEffect(() => {
		console.log(
			`%c[nav]%c hydrated ${location.pathname}${location.search}`,
			LOG_NAV,
			LOG_DEFAULT,
		);
		mounted.current = true;
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		if (!mounted.current) return;

		if (navigation.state === "loading" && prevState.current === "idle") {
			startRef.current = performance.now();
			const loc = navigation.location;
			if (loc) {
				console.log(
					`%c[nav]%c ${loc.pathname}${loc.search}`,
					LOG_NAV,
					LOG_DEFAULT,
				);
			}
		}
		if (navigation.state === "idle" && prevState.current === "loading") {
			const ms = startRef.current
				? Math.round(performance.now() - startRef.current)
				: "?";
			console.log(
				`%c[nav]%c done %c${ms}ms`,
				LOG_NAV,
				LOG_DEFAULT,
				LOG_TIME,
			);
			startRef.current = null;
		}
		prevState.current = navigation.state;
	}, [navigation.state, navigation.location]);
}

function LanguageSwitcher() {
	const { i18n } = useTranslation();

	const switchLanguage = () => {
		const next = i18n.language === "ja" ? "en" : "ja";
		document.cookie = `lang=${next}; path=/; max-age=31536000; SameSite=Lax`;
		i18n.changeLanguage(next);
	};

	return (
		<button
			type="button"
			onClick={switchLanguage}
			className="text-[11px] font-mono font-bold px-2 py-0.5 rounded border border-border-strong text-text-secondary hover:bg-surface-raised transition-colors"
		>
			{i18n.language === "ja" ? "EN" : "JA"}
		</button>
	);
}

export default function Root() {
	const { repoPath, locale } = useLoaderData<typeof loader>();
	const i18n = initI18n(locale);
	const navigation = useNavigation();
	usePolling();
	useNavigationLogger();

	const isNavigating = navigation.state === "loading";

	return (
		<html lang={i18n.language}>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>jj tutor</title>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin="anonymous"
				/>
				<link
					href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Manrope:wght@300..800&family=Fira+Code:wght@400;500;600;700&display=swap"
					rel="stylesheet"
				/>
				<Meta />
				<Links />
			</head>
			<body>
				<div className="h-screen flex flex-col bg-surface-base">
					{/* Loading indicator */}
					{isNavigating && (
						<div className="loading-bar fixed top-0 left-0 right-0 h-0.5 z-50" />
					)}

					{/* Top accent gradient */}
					<div className="h-[2px] shrink-0 bg-gradient-to-r from-jj-purple via-jj-blue to-git-orange" />

					{/* Header */}
					<header className="h-12 border-b border-border glass-strong px-6 flex items-center justify-between shrink-0">
						<div className="flex items-center gap-4">
							<h1 className="text-lg font-heading tracking-tight">
								<span className="font-extrabold bg-gradient-to-r from-jj-purple to-jj-purple-bright bg-clip-text text-transparent">
									jj
								</span>
								<span className="text-text-dim font-light mx-1.5">/</span>
								<span className="font-semibold text-text-muted">tutor</span>
							</h1>
							<div className="h-4 w-px bg-border-strong" />
							<span className="text-[11px] text-text-dim font-mono tracking-tight">
								{repoPath}
							</span>
						</div>
						<div className="flex items-center gap-3">
							{isNavigating && (
								<span
									className="text-[10px] text-jj-purple font-mono"
									style={{
										animation: "pulse-subtle 1.2s ease-in-out infinite",
									}}
								>
									syncing...
								</span>
							)}
							<LanguageSwitcher />
						</div>
					</header>

					{/* Main layout */}
					<div className="flex flex-1 overflow-hidden">
						{/* Sidebar navigation with DAG node metaphor */}
						<nav className="w-52 border-r border-border glass p-3 flex flex-col shrink-0 overflow-y-auto">
							<div className="text-[9px] font-heading font-semibold text-text-dim uppercase tracking-[0.2em] px-3 pt-1 pb-3">
								Navigation
							</div>
							{NAV_ITEMS.map((item, index) => (
								<NavLink
									key={item.to}
									to={item.to}
									end={item.to === "/"}
									className={({ isActive }) =>
										`nav-item flex items-center text-left ${
											isActive ? "nav-item-active" : ""
										}`
									}
									style={{ animationDelay: `${index * 45}ms` }}
								>
									{({ isActive }) => (
										<>
											{/* DAG edge line (between nodes) */}
											{index > 0 && (
												<div className="nav-edge absolute -top-[4px] left-[14.25px]" />
											)}
											<div
												className={`flex items-center gap-3 w-full px-3 py-[7px] rounded-lg transition-all duration-200 ${
													isActive
														? "nav-active-bg"
														: "hover:bg-surface-raised"
												}`}
											>
												{/* DAG node dot */}
												<div className="nav-node" />
												<span
													className={`text-[13px] font-heading font-medium transition-colors duration-200 ${
														isActive
															? "text-jj-purple"
															: "text-text-secondary hover:text-text-primary"
													}`}
												>
													{item.label}
												</span>
											</div>
										</>
									)}
								</NavLink>
							))}
						</nav>

						{/* Content */}
						<main className="flex-1 overflow-auto bg-blueprint page-enter">
							<Outlet />
						</main>
					</div>
				</div>

				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}
