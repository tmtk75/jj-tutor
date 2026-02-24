import { useState, useCallback } from "react";

export function CopyableHash({
	short,
	full,
	className,
}: {
	short: string;
	full: string;
	className?: string;
}) {
	const [copied, setCopied] = useState(false);

	const handleClick = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			navigator.clipboard.writeText(full);
			setCopied(true);
			setTimeout(() => setCopied(false), 1200);
		},
		[full],
	);

	return (
		<button
			type="button"
			onClick={handleClick}
			title={`Click to copy: ${full}`}
			className={`font-mono cursor-pointer hover:underline ${className ?? ""}`}
		>
			{copied ? "Copied!" : short}
		</button>
	);
}
