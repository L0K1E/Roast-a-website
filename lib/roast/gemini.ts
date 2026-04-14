import { getGeminiClient, getGeminiModelName } from "@/lib/gemini";
import { buildFallbackRoastPayload } from "@/lib/roast/fallback";
import {
  buildInspectionInput,
  buildInspectionInstructions,
  buildRoastInput,
  buildRoastInstructions,
} from "@/lib/roast/prompt";
import { roastPayloadSchema, type PageSummary, type RoastPayload } from "@/lib/roast/schema";

const GEMINI_ATTEMPTS = [
  { temperature: 0.4 },
  { temperature: 0.2 },
  { temperature: 0.1 },
] as const;

const ROAST_RESPONSE_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: ["score", "title", "summary", "roasts", "fixes", "tags"],
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    title: { type: "string" },
    summary: { type: "string" },
    roasts: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string" },
    },
    fixes: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string" },
    },
    tags: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string" },
    },
  },
} as const;

class InvalidGeminiJsonError extends Error {
  readonly isTruncated: boolean;

  constructor(message: string, options: { isTruncated: boolean }) {
    super(message);
    this.name = "InvalidGeminiJsonError";
    this.isTruncated = options.isTruncated;
  }
}

function extractJsonCandidate(rawText: string) {
  const trimmed = rawText.trim();

  if (!trimmed) {
    throw new Error("Gemini returned an empty response.");
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function normalizeJsonCandidate(rawText: string) {
  const normalized = rawText
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/((?:true|false|null|[}\]"0-9]))\s*\n(\s*")/g, "$1,\n$2");

  let result = "";
  let inString = false;
  let isEscaped = false;

  for (const char of normalized) {
    if (inString) {
      if (char === "\n") {
        result += "\\n";
        isEscaped = false;
        continue;
      }

      if (char === "\r") {
        result += "\\r";
        isEscaped = false;
        continue;
      }

      if (char === "\t") {
        result += "\\t";
        isEscaped = false;
        continue;
      }
    }

    result += char;

    if (char === "\\" && !isEscaped) {
      isEscaped = true;
      continue;
    }

    if (char === '"' && !isEscaped) {
      inString = !inString;
    }

    isEscaped = false;
  }

  return result;
}

function trimToLimit(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const softCut = normalized.slice(0, maxLength + 1);
  const boundary = Math.max(
    softCut.lastIndexOf(". "),
    softCut.lastIndexOf("! "),
    softCut.lastIndexOf("? "),
    softCut.lastIndexOf("; "),
    softCut.lastIndexOf(", "),
    softCut.lastIndexOf(" "),
  );

  const clipped = boundary > Math.floor(maxLength * 0.6)
    ? softCut.slice(0, boundary)
    : normalized.slice(0, maxLength);

  return clipped.trim().replace(/[,:;.-]+$/, "");
}

function extractStringFromUnknown(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const nestedValue = record.text ?? record.value ?? record.label ?? record.title ?? record.name;

  return typeof nestedValue === "string" ? nestedValue : null;
}

function normalizeStringList(
  value: unknown,
  options: { maxItems: number; maxLength: number },
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(extractStringFromUnknown)
    .filter((item): item is string => typeof item === "string")
    .map((item) => trimToLimit(item, options.maxLength))
    .filter(Boolean)
    .filter((item, index, items) => items.indexOf(item) === index)
    .slice(0, options.maxItems);
}

function topUpList(primary: string[], fallback: string[], maxItems: number) {
  const combined = [...primary];

  for (const candidate of fallback) {
    if (combined.length >= maxItems) {
      break;
    }

    if (!combined.includes(candidate)) {
      combined.push(candidate);
    }
  }

  return combined;
}

function normalizeRoastPayloadShape(payload: unknown, pageSummary: PageSummary): RoastPayload {
  const fallback = buildFallbackRoastPayload(pageSummary);

  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const candidate = payload as Record<string, unknown>;
  const roastCandidates = normalizeStringList(candidate.roasts, {
    maxItems: 5,
    maxLength: 220,
  });
  const fixCandidates = normalizeStringList(
    candidate.fixes ?? candidate.suggestions ?? candidate.recommendations,
    {
      maxItems: 5,
      maxLength: 220,
    },
  );
  const tagCandidates = normalizeStringList(
    candidate.tags ?? candidate.charges ?? candidate.themes,
    {
      maxItems: 5,
      maxLength: 40,
    },
  );
  const score =
    typeof candidate.score === "number" && Number.isFinite(candidate.score)
      ? Math.max(0, Math.min(100, Math.round(candidate.score)))
      : fallback.score;
  const title = trimToLimit(
    typeof candidate.title === "string" ? candidate.title : fallback.title,
    120,
  );
  const summary = trimToLimit(
    typeof candidate.summary === "string" ? candidate.summary : fallback.summary,
    240,
  );

  return {
    score,
    title,
    summary,
    roasts: topUpList(roastCandidates, fallback.roasts, 3),
    fixes: topUpList(fixCandidates, fallback.fixes, 3),
    tags: topUpList(tagCandidates, fallback.tags, 5),
  };
}

function parseRoastPayload(rawText: string, pageSummary: PageSummary) {
  const jsonText = extractJsonCandidate(rawText);
  const parseAttempts = [jsonText, normalizeJsonCandidate(jsonText)];
  let lastError: unknown;

  for (const candidate of parseAttempts) {
    try {
      const parsed = JSON.parse(candidate);
      return roastPayloadSchema.parse(normalizeRoastPayloadShape(parsed, pageSummary));
    } catch (error) {
      lastError = error;
    }
  }

  const preview = jsonText.slice(0, 240).replace(/\s+/g, " ");
  const reason = lastError instanceof Error ? lastError.message : "Unknown parse error";
  const isTruncated =
    reason.includes("Unexpected end of JSON input") ||
    reason.includes("Unterminated string") ||
    responseLooksTruncated(jsonText);

  throw new InvalidGeminiJsonError(
    `Gemini returned invalid JSON: ${reason}. Response preview: ${preview}`,
    { isTruncated },
  );
}

function responseLooksTruncated(rawText: string) {
  const trimmed = rawText.trim();

  if (!trimmed) {
    return true;
  }

  let inString = false;
  let isEscaped = false;
  let objectDepth = 0;
  let arrayDepth = 0;

  for (const char of trimmed) {
    if (inString) {
      if (char === "\\" && !isEscaped) {
        isEscaped = true;
        continue;
      }

      if (char === '"' && !isEscaped) {
        inString = false;
      }

      isEscaped = false;
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      objectDepth += 1;
      continue;
    }

    if (char === "}") {
      objectDepth = Math.max(0, objectDepth - 1);
      continue;
    }

    if (char === "[") {
      arrayDepth += 1;
      continue;
    }

    if (char === "]") {
      arrayDepth = Math.max(0, arrayDepth - 1);
    }
  }

  return (
    trimmed.startsWith("{") &&
    (inString || objectDepth > 0 || arrayDepth > 0 || !trimmed.endsWith("}"))
  );
}

function extractResponseText(result: {
  text?: string;
  candidates?: Array<{ content?: { parts?: Array<{ text?: string | null }> } | null }> | null;
}) {
  if (result.text?.trim()) {
    return result.text;
  }

  const parts = result.candidates?.[0]?.content?.parts ?? [];
  const joined = parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();

  return joined;
}

async function inspectWebsiteWithGemini(args: {
  pageSummary: PageSummary;
  modes: { unhinged: boolean; investor: boolean };
}) {
  const gemini = getGeminiClient();

  if (!gemini) {
    throw new Error("Gemini credentials are unavailable.");
  }

  const result = await gemini.models.generateContent({
    model: getGeminiModelName(),
    contents: buildInspectionInput(args),
    config: {
      systemInstruction: buildInspectionInstructions(),
      temperature: 0.2,
      maxOutputTokens: 900,
      tools: [{ urlContext: {} }],
    },
  });

  const inspectionText = extractResponseText(result);

  if (!inspectionText) {
    const finishReason = result.candidates?.[0]?.finishReason ?? "unknown";
    throw new Error(`Gemini inspection returned no text. Finish reason: ${finishReason}.`);
  }

  return inspectionText;
}

export async function generateRoastWithGemini(args: {
  pageSummary: PageSummary;
  modes: { unhinged: boolean; investor: boolean };
}): Promise<RoastPayload> {
  const gemini = getGeminiClient();

  if (!gemini) {
    throw new Error("Gemini credentials are unavailable.");
  }

  const inspectionNotes = await inspectWebsiteWithGemini(args);

  const prompt = buildRoastInput(args.pageSummary, args.modes, inspectionNotes);
  let lastError: unknown;

  for (const attempt of GEMINI_ATTEMPTS) {
    const result = await gemini.models.generateContent({
      model: getGeminiModelName(),
      contents: prompt,
      config: {
        systemInstruction: buildRoastInstructions(),
        temperature: attempt.temperature,
        responseMimeType: "application/json",
        responseJsonSchema: ROAST_RESPONSE_SCHEMA,
      },
    });

    const rawText = extractResponseText(result);

    const finishReason = result.candidates?.[0]?.finishReason;

    try {
      return parseRoastPayload(rawText, args.pageSummary);
    } catch (error) {
      lastError = error;

      const isTruncated =
        error instanceof InvalidGeminiJsonError ? error.isTruncated : responseLooksTruncated(rawText);

      if (finishReason !== "MAX_TOKENS" && !isTruncated) {
        break;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini roast generation failed.");
}
