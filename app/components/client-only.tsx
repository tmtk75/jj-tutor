import { useState, useEffect, type ReactNode } from "react";

export function ClientOnly({
	children,
	fallback,
}: {
	children: ReactNode;
	fallback?: ReactNode;
}) {
	const [hydrated, setHydrated] = useState(false);
	useEffect(() => setHydrated(true), []);
	if (!hydrated) return fallback ?? null;
	return children;
}
