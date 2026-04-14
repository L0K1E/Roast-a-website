import { createFallbackResult } from "@/lib/roast/fallback";
import { fetchPageSummary } from "@/lib/roast/extract";
import { generateRoastWithGemini } from "@/lib/roast/gemini";
import {
  analysisRequestSchema,
  analysisResultSchema,
  pageSummarySchema,
  type AnalysisResult,
} from "@/lib/roast/schema";
import { normalizePublicUrl } from "@/lib/roast/url";

function createEmptySummary(url: string) {
  return pageSummarySchema.parse({
    url,
    finalUrl: url,
    title: "",
    description: "",
    headings: [],
    ctas: [],
    repeatedPhrases: [],
    marketingPhrases: [],
    visibleTextSample: [],
  });
}

function getPublicAiWarning(error: unknown) {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (
    message.includes("quota") ||
    message.includes("credit") ||
    message.includes("rate") ||
    message.includes("429") ||
    message.includes("resource_exhausted")
  ) {
    return "The AI jury is temporarily unavailable, so this verdict is using the backup judge.";
  }

  if (message.includes("api key") || message.includes("credential")) {
    return "The AI jury is unavailable right now, so this verdict is using the backup judge.";
  }

  return "The AI jury had a procedural issue, so this verdict is using the backup judge.";
}

export async function analyzeWebsite(
  rawInput: unknown,
): Promise<AnalysisResult> {
  const input = analysisRequestSchema.parse(rawInput);
  const normalizedUrl = normalizePublicUrl(input.url);

  let pageSummary = createEmptySummary(normalizedUrl);

  try {
    pageSummary = await fetchPageSummary(normalizedUrl);
  } catch (error) {
    return createFallbackResult({
      analyzedUrl: normalizedUrl,
      pageSummary,
      warning:
        error instanceof Error
          ? `We could not analyze that website directly: ${error.message}`
          : "We could not analyze that website directly.",
    });
  }

  try {
    const aiPayload = await generateRoastWithGemini({
      pageSummary,
      modes: input.modes,
    });

    return analysisResultSchema.parse({
      ...aiPayload,
      analyzedUrl: pageSummary.finalUrl,
      source: "ai",
      pageSummary,
    });
  } catch (error) {
    console.error("Gemini roast generation failed:", error);
    return createFallbackResult({
      analyzedUrl: pageSummary.finalUrl,
      pageSummary,
      warning: getPublicAiWarning(error),
    });
  }
}
