import { useTranslation } from "react-i18next";
import { CONCEPT_MAPPINGS } from "~/shared";

export function ConceptsView() {
	const { t } = useTranslation("concepts");

	return (
		<div className="p-6 max-w-5xl">
			<h2 className="text-lg font-bold mb-2">{t("title")}</h2>
			<p className="text-xs text-text-muted mb-6">{t("description")}</p>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				{CONCEPT_MAPPINGS.map((mapping, index) => (
					<div
						key={mapping.jjConcept}
						className="border border-border rounded-lg p-4 bg-surface-card hover:shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-shadow"
					>
						<div className="flex items-center gap-3 mb-3">
							<span className="text-sm font-bold text-jj-purple bg-jj-purple/8 px-2 py-1 rounded">
								{t(`mapping.${index}.jjConcept`)}
							</span>
							<span className="text-text-dim">→</span>
							<span className="text-sm font-bold text-git-orange bg-git-orange/8 px-2 py-1 rounded">
								{t(`mapping.${index}.gitConcept`)}
							</span>
						</div>

						<p className="text-xs text-text-primary mb-3 leading-relaxed">
							{t(`mapping.${index}.explanation`)}
						</p>

						<div className="grid grid-cols-2 gap-3 text-xs">
							<div className="bg-jj-purple/8 rounded p-2">
								<div className="text-[10px] text-text-muted mb-1">
									{t("jjExample")}
								</div>
								<code className="text-jj-purple font-mono text-[11px] whitespace-pre-line">
									{t(`mapping.${index}.jjExample`)}
								</code>
							</div>
							<div className="bg-git-orange/8 rounded p-2">
								<div className="text-[10px] text-text-muted mb-1">
									{t("gitExample")}
								</div>
								<code className="text-git-orange font-mono text-[11px] whitespace-pre-line">
									{t(`mapping.${index}.gitExample`)}
								</code>
							</div>
						</div>

						{mapping.relatedCommands.length > 0 && (
							<div className="flex gap-1.5 mt-3 flex-wrap">
								{mapping.relatedCommands.map((cmd) => (
									<span
										key={cmd}
										className="text-[10px] font-mono bg-surface-raised text-text-secondary px-1.5 py-0.5 rounded"
									>
										{cmd}
									</span>
								))}
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
