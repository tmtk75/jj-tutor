import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import {
	supportedLngs,
	defaultLng,
	fallbackLng,
	defaultNS,
	namespaces,
} from "./config";

import jaCommon from "./locales/ja/common.json";
import jaDag from "./locales/ja/dag.json";
import jaStatus from "./locales/ja/status.json";
import jaCommit from "./locales/ja/commit.json";
import jaDiff from "./locales/ja/diff.json";
import jaWhatif from "./locales/ja/whatif.json";
import jaOperations from "./locales/ja/operations.json";
import jaConcepts from "./locales/ja/concepts.json";
import jaFaq from "./locales/ja/faq.json";
import jaRebase from "./locales/ja/rebase.json";
import jaRevset from "./locales/ja/revset.json";

import enCommon from "./locales/en/common.json";
import enDag from "./locales/en/dag.json";
import enStatus from "./locales/en/status.json";
import enCommit from "./locales/en/commit.json";
import enDiff from "./locales/en/diff.json";
import enWhatif from "./locales/en/whatif.json";
import enOperations from "./locales/en/operations.json";
import enConcepts from "./locales/en/concepts.json";
import enFaq from "./locales/en/faq.json";
import enRebase from "./locales/en/rebase.json";
import enRevset from "./locales/en/revset.json";

export const resources = {
	ja: {
		common: jaCommon,
		dag: jaDag,
		status: jaStatus,
		commit: jaCommit,
		diff: jaDiff,
		whatif: jaWhatif,
		operations: jaOperations,
		concepts: jaConcepts,
		faq: jaFaq,
		rebase: jaRebase,
		revset: jaRevset,
	},
	en: {
		common: enCommon,
		dag: enDag,
		status: enStatus,
		commit: enCommit,
		diff: enDiff,
		whatif: enWhatif,
		operations: enOperations,
		concepts: enConcepts,
		faq: enFaq,
		rebase: enRebase,
		revset: enRevset,
	},
} as const;

function parseAcceptLanguage(header: string): string | null {
	if (!header) return null;
	const langs = header.split(",").map((part) => {
		const [lang, ...params] = part.trim().split(";");
		const qParam = params.find((p) => p.trim().startsWith("q="));
		const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
		return { lang: lang.trim().toLowerCase(), q };
	});
	langs.sort((a, b) => b.q - a.q);
	for (const { lang } of langs) {
		const primary = lang.split("-")[0];
		if (supportedLngs.includes(primary as (typeof supportedLngs)[number])) {
			return primary;
		}
	}
	return null;
}

export function detectLocale(request?: Request): string {
	if (!request) return defaultLng;
	const cookie = request.headers.get("Cookie") ?? "";
	const match = cookie.match(/(?:^|;\s*)lang=(\w+)/);
	if (match && supportedLngs.includes(match[1] as (typeof supportedLngs)[number])) {
		return match[1];
	}
	const accept = request.headers.get("Accept-Language") ?? "";
	const best = parseAcceptLanguage(accept);
	return best ?? defaultLng;
}

let initialized = false;

export default function initI18n(lng?: string) {
	if (initialized) {
		if (lng && i18next.language !== lng) {
			i18next.changeLanguage(lng);
		}
		return i18next;
	}

	i18next
		.use(initReactI18next)
		.use(LanguageDetector)
		.init({
			lng: lng ?? defaultLng,
			supportedLngs: [...supportedLngs],
			defaultNS,
			ns: [...namespaces],
			fallbackLng,
			interpolation: { escapeValue: false },
			detection: {
				order: ["cookie", "navigator"],
				caches: ["cookie"],
				lookupCookie: "lang",
			},
			resources,
		});

	initialized = true;
	return i18next;
}
