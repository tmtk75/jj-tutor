import { formatDistanceToNow } from "date-fns";

export function RelativeTime({ timestamp }: { timestamp: string }) {
	if (!timestamp) return null;
	const date = new Date(timestamp);
	const absolute = date.toLocaleString("ja-JP", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});

	const short = date.toLocaleTimeString("ja-JP", {
		hour: "2-digit",
		minute: "2-digit",
	});

	return (
		<span className="text-[10px] text-text-muted" title={absolute}>
			{formatDistanceToNow(date, { addSuffix: true })}
			<span className="ml-1 text-text-dim">{short}</span>
		</span>
	);
}
