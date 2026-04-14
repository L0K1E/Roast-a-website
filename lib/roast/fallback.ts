import type { AnalysisResult, PageSummary, RoastPayload } from "@/lib/roast/schema";

function clampScore(value: number) {
  return Math.max(12, Math.min(96, Math.round(value)));
}

function buildTags(pageSummary: PageSummary) {
  const tags = [
    pageSummary.marketingPhrases.length > 0 ? "buzzword overload" : null,
    pageSummary.ctas.length === 0 ? "weak CTA" : null,
    pageSummary.description ? null : "missing clarity",
    pageSummary.headings.length <= 1 ? "thin hierarchy" : null,
    pageSummary.repeatedPhrases.length > 0 ? "duplicate messaging" : null,
  ].filter(Boolean) as string[];

  return tags.length > 0 ? tags.slice(0, 4) : ["unclear messaging", "needs specifics"];
}

export function buildFallbackRoastPayload(pageSummary: PageSummary): RoastPayload {
  const score = clampScore(
    34 +
      pageSummary.marketingPhrases.length * 8 +
      pageSummary.repeatedPhrases.length * 6 +
      (pageSummary.ctas.length === 0 ? 14 : 0) +
      (pageSummary.description ? 0 : 10),
  );

  const title = pageSummary.title
    ? `${pageSummary.title} vs. the concept of specificity`
    : "This website has several exciting feelings and one limited point";

  const summary =
    pageSummary.marketingPhrases.length > 0
      ? "The page is trying extremely hard to sound important, which would be more convincing if it ever paused to say something concrete."
      : "The page appears sincere, but clarity is still arriving by horse-drawn carriage.";

  const topHeading =
    pageSummary.headings[0] ?? pageSummary.title ?? "the headline situation";
  const topCta = pageSummary.ctas[0] ?? "the call to action";
  const repeated = pageSummary.repeatedPhrases[0] ?? "the same message twice";

  return {
    score,
    title,
    summary,
    roasts: [
      `${topHeading} has the energy of a keynote opener that forgot to include the actual point.`,
      `${topCta} is present, which is nice. Unfortunately, being specific was not invited to the meeting.`,
      `The page repeats ${repeated}, as if confidence alone might eventually turn it into strategy.`,
    ],
    fixes: [
      "Rewrite the main headline so it explains the concrete outcome for the visitor in one sentence.",
      "Use one primary CTA with a verb and a clear payoff instead of generic optimism.",
      "Cut duplicated claims and replace at least one with proof, specificity, or a real trust signal.",
    ],
    tags: buildTags(pageSummary),
  };
}

export function createFallbackResult(args: {
  pageSummary: PageSummary;
  analyzedUrl: string;
  warning: string;
}): AnalysisResult {
  const payload = buildFallbackRoastPayload(args.pageSummary);

  return {
    ...payload,
    analyzedUrl: args.analyzedUrl,
    source: "fallback",
    warning: args.warning,
    pageSummary: args.pageSummary,
  };
}
