import type { PageSummary } from "@/lib/roast/schema";

function buildModeDirective(modes: { unhinged: boolean; investor: boolean }) {
  if (modes.investor) {
    return [
      "Mode: investor.",
      "Sound like a skeptical investor or commercially ruthless advisor reviewing the website for credibility.",
      "Prioritize differentiation, ICP clarity, trust signals, proof, service sprawl, vague positioning, weak conversion paths, and whether the business feels investable.",
      "Keep the humor drier, sharper, and more commercially forensic than unhinged mode.",
    ].join(" ");
  }

  return [
    "Mode: unhinged.",
    "Sound like a dramatic but humane creative director gleefully tearing the website apart.",
    "Prioritize confusing hierarchy, generic copy, bloated navigation, weak calls to action, visual clutter, and buzzword crimes across the whole website.",
    "Be noticeably more theatrical, playful, and savage than investor mode while staying safe and non-abusive.",
  ].join(" ");
}

export function buildRoastInstructions() {
  return [
    "You are a brutally honest but playful UX critic.",
    "Roast the whole public website experience, not just a single page or hero section.",
    "Inspect the provided website URL directly using URL context before deciding on the verdict.",
    "Use the extracted site summary as supporting evidence, not as the sole source of truth.",
    "Return structured JSON only.",
    "Keep title under 120 characters.",
    "Keep summary under 240 characters.",
    "Aim for 3 strong roasts and 3 strong fixes, each under 220 characters.",
    "Return 1 to 5 short tags, each under 40 characters.",
    "Every field must be present even if you have to make a best-effort guess from the evidence.",
    "Be sarcastic, witty, and sharp, but never abusive, profane, discriminatory, or hateful.",
    "Do not hallucinate business facts that are not supported by the provided page summary.",
    "Every roast must be balanced with a genuinely useful fix.",
    "Focus on copy clarity, CTA hierarchy, trust signals, specificity, clutter, vague messaging, and buzzword abuse.",
  ].join(" ");
}

export function buildInspectionInstructions() {
  return [
    "You are inspecting a public website before writing a roast.",
    "Use URL context to inspect the provided website URL directly.",
    "Return concise plain text notes only.",
    "Focus on messaging clarity, positioning, site structure, navigation, calls to action, trust signals, differentiation, credibility, and obvious buzzword abuse across the website.",
    "Mention concrete observations, not filler.",
  ].join(" ");
}

export function buildInspectionInput(args: {
  pageSummary: PageSummary;
  modes: { unhinged: boolean; investor: boolean };
}) {
  return JSON.stringify({
    websiteUrl: args.pageSummary.finalUrl,
    task: "Inspect this public website and return concise notes about what stands out across the website experience.",
    modeDirective: buildModeDirective(args.modes),
  });
}

export function buildRoastInput(
  pageSummary: PageSummary,
  modes: { unhinged: boolean; investor: boolean },
  inspectionNotes?: string,
) {
  return JSON.stringify(
    {
      websiteUrl: pageSummary.finalUrl,
      task: "Inspect this public website and roast the website as a whole.",
      modeDirective: buildModeDirective(modes),
      mode: {
        unhinged: modes.unhinged,
        investor: modes.investor,
      },
      extractedSignals: {
        url: pageSummary.finalUrl,
        title: pageSummary.title,
        description: pageSummary.description,
        headings: pageSummary.headings,
        ctas: pageSummary.ctas,
        repeatedPhrases: pageSummary.repeatedPhrases,
        marketingPhrases: pageSummary.marketingPhrases,
        visibleTextSample: pageSummary.visibleTextSample,
      },
      inspectionNotes: inspectionNotes ?? "",
      outputRequirements: {
        scoreMeaning: "0 is respectable, 100 is painfully cringe.",
        roastsCount: 3,
        fixesCount: 3,
        tagCount: "2 to 5",
      },
    }
  );
}
