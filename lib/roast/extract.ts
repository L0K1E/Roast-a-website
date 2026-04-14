import { pageSummarySchema, type PageSummary } from "@/lib/roast/schema";

const CTA_PATTERN =
  /\b(start|book|try|get|see|watch|join|contact|request|schedule|talk|sign|buy|launch|demo|learn)\b/i;

const MARKETING_PHRASES = [
  "ai-powered",
  "next generation",
  "world class",
  "best-in-class",
  "seamless",
  "revolutionary",
  "transformative",
  "end-to-end",
  "all-in-one",
  "cutting-edge",
  "platform",
  "synergy",
  "streamline",
  "frictionless",
  "future-proof",
  "intelligent automation",
];

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "that",
  "with",
  "this",
  "from",
  "your",
  "have",
  "will",
  "into",
  "about",
  "they",
  "their",
  "there",
  "them",
  "just",
  "more",
  "than",
  "what",
  "when",
  "where",
  "while",
  "would",
  "could",
  "should",
  "been",
  "being",
  "also",
  "only",
  "very",
  "over",
  "under",
  "because",
  "then",
]);

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripTags(value: string) {
  return decodeEntities(value.replace(/<[^>]*>/g, " "));
}

function cleanText(value: string) {
  return stripTags(value).replace(/\s+/g, " ").trim();
}

function uniqueTrimmed(values: string[], limit: number) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values.map(cleanText)) {
    const normalized = value.toLowerCase();

    if (!value || value.length < 2 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(value);

    if (result.length >= limit) {
      break;
    }
  }

  return result;
}

function matchTagContent(html: string, tag: string) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const matches = [...html.matchAll(regex)].map((match) => match[1] ?? "");
  return uniqueTrimmed(matches, 8);
}

function matchMetaDescription(html: string) {
  const metaMatch =
    html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
    ) ??
    html.match(
      /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i,
    );

  return cleanText(metaMatch?.[1] ?? "");
}

function matchTitle(html: string) {
  return cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
}

function matchCtas(html: string) {
  const buttonTexts = [
    ...html.matchAll(/<(button|a)[^>]*>([\s\S]*?)<\/(button|a)>/gi),
  ].map((match) => match[2] ?? "");

  const inputTexts = [
    ...html.matchAll(
      /<input[^>]+type=["'](?:submit|button)["'][^>]+value=["']([^"']+)["'][^>]*>/gi,
    ),
  ].map((match) => match[1] ?? "");

  return uniqueTrimmed(
    [...buttonTexts, ...inputTexts].filter((text) => CTA_PATTERN.test(text)),
    8,
  );
}

function extractVisibleText(html: string) {
  return cleanText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " "),
  );
}

function extractSentences(text: string) {
  return uniqueTrimmed(
    text
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length >= 35 && sentence.length <= 180),
    5,
  );
}

function extractMarketingPhrases(text: string) {
  const lower = text.toLowerCase();
  return MARKETING_PHRASES.filter((phrase) => lower.includes(phrase)).slice(0, 6);
}

function extractRepeatedPhrases(text: string) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

  const counts = new Map<string, number>();

  for (let size = 2; size <= 3; size += 1) {
    for (let index = 0; index <= words.length - size; index += 1) {
      const phrase = words.slice(index, index + size).join(" ");
      counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .sort((left, right) => right[1] - left[1] || left[0].length - right[0].length)
    .map(([phrase]) => phrase)
    .slice(0, 6);
}

export async function fetchPageSummary(url: string): Promise<PageSummary> {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; RoastMyWebsite/1.0; +https://example.com/bot)",
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`The site responded with ${response.status}.`);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("text/html")) {
    throw new Error("That URL did not return an HTML page.");
  }

  const html = await response.text();
  const visibleText = extractVisibleText(html);

  const summary = pageSummarySchema.parse({
    url,
    finalUrl: response.url || url,
    title: matchTitle(html),
    description: matchMetaDescription(html),
    headings: uniqueTrimmed(
      [...matchTagContent(html, "h1"), ...matchTagContent(html, "h2")],
      8,
    ),
    ctas: matchCtas(html),
    repeatedPhrases: extractRepeatedPhrases(visibleText),
    marketingPhrases: extractMarketingPhrases(visibleText),
    visibleTextSample: extractSentences(visibleText),
  });

  return summary;
}
