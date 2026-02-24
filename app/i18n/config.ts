export const supportedLngs = ["ja", "en"] as const;
export type SupportedLng = (typeof supportedLngs)[number];
export const defaultLng: SupportedLng = "ja";
export const fallbackLng: SupportedLng = "ja";

export const defaultNS = "common";
export const namespaces = [
	"common",
	"dag",
	"status",
	"commit",
	"diff",
	"whatif",
	"operations",
	"concepts",
	"faq",
	"rebase",
	"revset",
] as const;
