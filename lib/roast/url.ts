const privateHostPatterns = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^\[::1\]$/i,
];

export function normalizePublicUrl(rawUrl: string) {
  const candidate = rawUrl.trim();

  if (!candidate) {
    throw new Error("Enter a public URL so the tribunal has somewhere to point.");
  }

  const normalized = candidate.startsWith("http")
    ? candidate
    : `https://${candidate}`;

  let parsed: URL;

  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error("That does not appear to be a valid URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https URLs may face the tribunal.");
  }

  if (privateHostPatterns.some((pattern) => pattern.test(parsed.hostname))) {
    throw new Error("Use a public website URL. Local addresses are off the record.");
  }

  parsed.hash = "";

  return parsed.toString();
}
