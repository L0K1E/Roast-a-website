"use client";

import {
  startTransition,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";

import { analyzeWebsiteAction } from "@/app/actions";
import type { AnalysisResult } from "@/lib/roast/schema";
import { ShellCard } from "@/components/shell-card";

const sampleUrls = [
  "https://stripe.com",
  "https://www.notion.so",
  "https://www.airtable.com",
];

const surpriseUrls = [
  "https://linear.app",
  "https://www.figma.com",
  "https://slack.com",
  "https://www.perplexity.ai",
];

const loadingMessages = [
  "Consulting the council of designers...",
  "Cross-examining the hero copy...",
  "Checking whether the CTA means anything...",
  "Measuring buzzword density with concern...",
];

const idleChargeItems = [
  "Weak CTA hierarchy",
  "Buzzword congestion",
  "Vague value proposition",
];

const investorChargeItems = [
  "Synergy inflation",
  "Series-A tone poisoning",
  "Trust signal insolvency",
];

const idleNoteItems = [
  "Paste a public website URL to open the proceedings.",
  "The score is dramatic, but the fixes are serious.",
  "This is not legal advice. It is aesthetic advice with better posture.",
];

const unhingedNoteItems = [
  "Unhinged mode sharpens the sarcasm, not the cruelty.",
  "Investor mode becomes deeply suspicious of phrases like platform and seamless.",
  "No verdict is generated yet. We are rehearsing the menace responsibly.",
];

const appealSummaries = [
  "The appeal has been reviewed carefully and rejected with unusually elegant penmanship.",
  "A second opinion was requested. It was somehow less forgiving.",
  "The court has reconsidered and would like to confirm that the original concern still stands.",
];

type ResultTab = "roasts" | "fixes" | "evidence";

type HistoryEntry = {
  id: string;
  createdAt: number;
  result: AnalysisResult;
};

const HISTORY_STORAGE_KEY = "roast-history-v1";
const ROAST_COUNT_STORAGE_KEY = "roast-count-v1";

function Icon({
  path,
  className = "h-4 w-4",
}: {
  path: string;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={path} />
    </svg>
  );
}

function loadHistory() {
  if (typeof window === "undefined") {
    return [] as HistoryEntry[];
  }

  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
  } catch {
    return [];
  }
}

function loadRoastCount() {
  if (typeof window === "undefined") {
    return 0;
  }

  const raw = window.localStorage.getItem(ROAST_COUNT_STORAGE_KEY);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function footerNoteForCount(roastCount: number) {
  if (roastCount >= 10) {
    return "The browser is filing a complaint.";
  }

  if (roastCount >= 5) {
    return "At this point the website has a reputation.";
  }

  if (roastCount >= 1) {
    return "A modest beginning.";
  }

  return "The internet asked for feedback. This was a tactical error.";
}

function isProbablyUrl(value: string) {
  if (!value.trim()) {
    return false;
  }

  try {
    const parsed = new URL(value.startsWith("http") ? value : `https://${value}`);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeUrl(value: string) {
  if (!value.trim()) {
    return "";
  }

  try {
    return new URL(value.startsWith("http") ? value : `https://${value}`).toString();
  } catch {
    return value;
  }
}

export function InteractiveShell() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const statusTimerRef = useRef<number | null>(null);

  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [analysisMode, setAnalysisMode] = useState<"unhinged" | "investor">(
    "unhinged",
  );
  const [statusIndex, setStatusIndex] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [roastCount, setRoastCount] = useState(() => loadRoastCount());
  const [activeTab, setActiveTab] = useState<ResultTab>("roasts");
  const [copyFeedback, setCopyFeedback] = useState("");
  const [shareFeedback, setShareFeedback] = useState("");
  const [appealCount, setAppealCount] = useState(0);
  const [isPending, startAnalysisTransition] = useTransition();

  const focusInput = useEffectEvent(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (event.key === "/" && !isEditable) {
        event.preventDefault();
        focusInput();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!isPending) {
      if (statusTimerRef.current) {
        window.clearInterval(statusTimerRef.current);
        statusTimerRef.current = null;
      }
      return;
    }

    statusTimerRef.current = window.setInterval(() => {
      setStatusIndex((current) => (current + 1) % loadingMessages.length);
    }, 1350);

    return () => {
      if (statusTimerRef.current) {
        window.clearInterval(statusTimerRef.current);
        statusTimerRef.current = null;
      }
    };
  }, [isPending]);

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) {
        window.clearInterval(statusTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 6)));
  }, [history]);

  useEffect(() => {
    window.localStorage.setItem(ROAST_COUNT_STORAGE_KEY, String(roastCount));
  }, [roastCount]);

  useEffect(() => {
    if (!copyFeedback && !shareFeedback) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCopyFeedback("");
      setShareFeedback("");
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [copyFeedback, shareFeedback]);

  const isUnhinged = analysisMode === "unhinged";
  const isInvestorMode = analysisMode === "investor";
  const helperText = isUnhinged
    ? "Unhinged mode keeps the insults safe, but less charitable."
    : "Investor mode becomes suspicious of every inflated promise.";
  const urlLengthHint =
    url.trim().length > 0 && url.trim().length < 18
      ? "That is suspiciously short. Either confident branding or a redirect with secrets."
      : url.trim().length > 80
        ? "That URL has seen things. We respect its paperwork."
        : "";

  const chargeItems = isInvestorMode ? investorChargeItems : idleChargeItems;
  const noteItems = isUnhinged ? unhingedNoteItems : idleNoteItems;

  function selectUrl(nextUrl: string) {
    setUrl(nextUrl);
    setError("");
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(nextUrl.length, nextUrl.length);
    });
  }

  function handleSurpriseMe() {
    const nextUrl =
      surpriseUrls[Math.floor(Math.random() * surpriseUrls.length)] ?? surpriseUrls[0];
    selectUrl(nextUrl);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalized = normalizeUrl(url);

    if (!isProbablyUrl(normalized)) {
      setError("Enter a public URL so the tribunal has somewhere to point.");
      return;
    }

    setUrl(normalized);
    setError("");
    setStatusIndex(0);
    startAnalysisTransition(() => {
      void (async () => {
        const nextResult = await analyzeWebsiteAction({
          url: normalized,
          modes: {
            unhinged: isUnhinged,
            investor: isInvestorMode,
          },
        });
        startTransition(() => {
          setActiveTab("roasts");
          setAppealCount(0);
          setCopyFeedback("");
          setShareFeedback("");
          setResult(nextResult);
          setHistory((current) => {
            if (
              !nextResult.pageSummary.title &&
              !nextResult.pageSummary.description &&
              nextResult.pageSummary.headings.length === 0 &&
              nextResult.pageSummary.ctas.length === 0
            ) {
              return current;
            }

            const nextEntry: HistoryEntry = {
              id: `${Date.now()}-${nextResult.analyzedUrl}`,
              createdAt: Date.now(),
              result: nextResult,
            };

            return [
              nextEntry,
              ...current.filter(
                (entry) => entry.result.analyzedUrl !== nextResult.analyzedUrl,
              ),
            ].slice(0, 6);
          });
          setRoastCount((current) => current + 1);
        });
      })();
    });
  }

  function restoreHistoryEntry(entry: HistoryEntry) {
    setUrl(entry.result.analyzedUrl);
    setActiveTab("roasts");
    setAppealCount(0);
    setCopyFeedback("");
    setShareFeedback("");
    setResult(entry.result);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  async function handleCopyResult() {
    if (!result) {
      return;
    }

    const lines = [
      `Roast A Website`,
      `URL: ${result.analyzedUrl}`,
      `Score: ${result.score}/100`,
      `Title: ${result.title}`,
      `Summary: ${displaySummary}`,
      `Roasts:`,
      ...result.roasts.map((item, index) => `${index + 1}. ${item}`),
      `Fixes:`,
      ...result.fixes.map((item, index) => `${index + 1}. ${item}`),
      `Charges: ${result.tags.join(", ")}`,
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyFeedback("Copied verdict");
    } catch {
      setCopyFeedback("Copy refused");
    }
  }

  async function handleShareResult() {
    if (!result) {
      return;
    }

    const shareText = `${result.title} (${result.score}/100) for ${result.analyzedUrl}\n${displaySummary}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Roast A Website",
          text: shareText,
        });
        setShareFeedback("Shared verdict");
        return;
      }

      await navigator.clipboard.writeText(shareText);
      setShareFeedback("Share text copied");
    } catch {
      setShareFeedback("Share cancelled");
    }
  }

  function handleAppeal() {
    // May be for future implementation, don't want to burn all my tokens :(
    if (!result) {
      return;
    }

    setAppealCount((current) => current + 1);
  }

  const loadingCopy = loadingMessages[statusIndex] ?? loadingMessages[0];
  const publicWarning = result?.warning;
  const isErrorResult = Boolean(
    result &&
      !isPending &&
      !result.pageSummary.title &&
      !result.pageSummary.description &&
      result.pageSummary.headings.length === 0 &&
      result.pageSummary.ctas.length === 0 &&
      result.pageSummary.visibleTextSample.length === 0,
  );
  const appealSummary =
    appealCount > 0
      ? appealSummaries[(appealCount - 1) % appealSummaries.length]
      : null;
  const alternateEyebrow =
    roastCount >= 4 && roastCount % 3 === 0 ? "Repeat Offender Review" : null;
  const displaySummary = appealSummary ?? result?.summary ?? "";
  const resultActions = [
    {
      id: "roasts" as const,
      label: "Roast",
    },
    {
      id: "fixes" as const,
      label: "Fixes",
    },
    {
      id: "evidence" as const,
      label: "Evidence",
    },
  ];
  const evidenceItems = result
    ? [
        result.pageSummary.title ? `Title: ${result.pageSummary.title}` : "",
        result.pageSummary.description
          ? `Description: ${result.pageSummary.description}`
          : "Description: missing or unhelpfully absent.",
        result.pageSummary.headings[0]
          ? `Top heading: ${result.pageSummary.headings[0]}`
          : "Top heading: the website declined to provide a memorable one.",
        result.pageSummary.ctas[0]
          ? `Primary CTA spotted: ${result.pageSummary.ctas[0]}`
          : "Primary CTA spotted: none that looked confident.",
      ].filter(Boolean)
    : noteItems;

  return (
    <>
      <section className="hero-grid relative overflow-hidden rounded-[36px] border border-[color:var(--color-line)] px-6 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
        <div className="relative grid gap-6 xl:grid-cols-[1.02fr_0.98fr] xl:items-start">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-3 rounded-full border border-[color:var(--color-line)] bg-[var(--color-panel-strong)] px-4 py-2 text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]">
            <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
            Department of unnecessary honesty
          </div>

          <div className="space-y-5">
            <p className="max-w-xs text-sm uppercase tracking-[0.34em] text-[var(--color-muted)]">
              Roast A Website
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-[var(--color-foreground)] sm:text-5xl lg:text-7xl">
              Your website is innocent until inspected.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-[var(--color-soft)] sm:text-lg">
              A dry, slightly theatrical little tool that reviews public
              websites, delivers a sarcastic verdict, and still leaves behind
              actionable fixes.
            </p>
          </div>

          <ShellCard
            eyebrow="Case Intake"
            title="Submit a website for routine humiliation."
            description=""
            className="bg-[var(--color-panel-strong)]"
          >
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label
                  htmlFor={inputId}
                  className="block text-sm font-medium text-[var(--color-foreground)]"
                >
                  Public website URL
                </label>
                <div className="flex flex-col gap-3 md:flex-row">
                  <input
                    ref={inputRef}
                    id={inputId}
                    name="website-url"
                    type="url"
                    inputMode="url"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={url}
                    onChange={(event) => {
                      setUrl(event.target.value);
                      if (error) {
                        setError("");
                      }
                    }}
                    placeholder="https://your-startup-loves-synergy.com"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? `${inputId}-error` : `${inputId}-helper`}
                    className="h-14 flex-1 rounded-2xl border border-[color:var(--color-line)] bg-[#14110e] px-5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
                  />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex h-14 items-center justify-center rounded-2xl border border-[#8f4123] bg-[var(--color-accent)] px-6 text-sm font-semibold text-[#18120d] shadow-[0_2px_0_rgba(0,0,0,0.18),0_8px_18px_rgba(184,92,56,0.18)] transition hover:-translate-y-px hover:bg-[var(--color-accent-strong)] hover:shadow-[0_2px_0_rgba(0,0,0,0.18),0_12px_22px_rgba(184,92,56,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50 active:translate-y-0 active:shadow-[0_1px_0_rgba(0,0,0,0.14)] disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70 disabled:shadow-none"
                  >
                    <Icon path="M5 12h14M13 5l7 7-7 7" className="mr-2 h-4 w-4" />
                    {isPending ? "Preparing the verdict..." : "Roast the website"}
                  </button>
                </div>
                <p
                  id={`${inputId}-helper`}
                  className="text-sm leading-6 text-[var(--color-soft)]"
                >
                  {helperText}
                </p>
                {urlLengthHint ? (
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    {urlLengthHint}
                  </p>
                ) : null}
                {error ? (
                  <p
                    id={`${inputId}-error`}
                    className="text-sm font-medium text-[var(--color-accent-strong)]"
                  >
                    {error}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-soft)]">
                <span>Fair process. Unfair wording.</span>
                <button
                  type="button"
                  onClick={handleSurpriseMe}
                  className="inline-flex items-center justify-center rounded-full border border-[color:var(--color-line)] bg-[#fbf7f0] px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-foreground)] shadow-[0_1px_0_rgba(0,0,0,0.08)] transition hover:-translate-y-px hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/30 active:translate-y-0"
                >
                  <Icon path="M12 3v18M3 12h18" className="mr-1.5 h-3.5 w-3.5" />
                  Surprise me
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {sampleUrls.map((sampleUrl) => {
                  const isActive = normalizeUrl(url) === normalizeUrl(sampleUrl);

                  return (
                    <button
                      key={sampleUrl}
                      type="button"
                      onClick={() => selectUrl(sampleUrl)}
                      aria-pressed={isActive}
                      className={[
                        "inline-flex min-h-10 items-center justify-center rounded-full border px-4 py-2 text-xs font-medium shadow-[0_1px_0_rgba(0,0,0,0.06)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/30 active:translate-y-0",
                        isActive
                          ? "border-[#b77a5d] bg-[#f2dfce] text-[var(--color-foreground)]"
                          : "border-[#cdbda8] bg-[#fbf7f0] text-[var(--color-foreground)] hover:-translate-y-px hover:border-[#bfa88a] hover:bg-white hover:shadow-[0_4px_10px_rgba(52,40,26,0.08)]",
                      ].join(" ")}
                    >
                      {sampleUrl}
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  aria-pressed={isUnhinged}
                  onClick={() => setAnalysisMode("unhinged")}
                  title="Select unhinged mode"
                  className={[
                    "toggle-card text-left",
                    isUnhinged ? "toggle-card--active" : "",
                  ].join(" ")}
                >
                  <span className="toggle-card__row">
                    <span className="toggle-card__title">Unhinged mode</span>
                    <span className="toggle-card__switch" aria-hidden="true">
                      <span className="toggle-card__thumb" />
                    </span>
                  </span>
                  <span className="toggle-card__body">
                    Turns the sarcasm up a notch while staying safely on the
                    right side of humane.
                  </span>
                </button>

                <button
                  type="button"
                  aria-pressed={isInvestorMode}
                  onClick={() => setAnalysisMode("investor")}
                  title="Select investor mode"
                  className={[
                    "toggle-card text-left",
                    isInvestorMode ? "toggle-card--active" : "",
                  ].join(" ")}
                >
                  <span className="toggle-card__row">
                    <span className="toggle-card__title">Investor mode</span>
                    <span className="toggle-card__switch" aria-hidden="true">
                      <span className="toggle-card__thumb" />
                    </span>
                  </span>
                  <span className="toggle-card__body">
                    Gives extra side-eye to inflated positioning, vague claims,
                    and startup perfume.
                  </span>
                </button>
              </div>
            </form>
          </ShellCard>
        </div>

        <div className="grid gap-4 xl:pt-14">
          <ShellCard
            eyebrow={
              isPending
                ? "Analyzing"
                : result
                  ? isErrorResult
                    ? "Proceedings Interrupted"
                    : alternateEyebrow ?? "Verdict Filed"
                  : "Pending Verdict"
            }
            title={result && !isErrorResult ? result.title : "Cringe Score"}
            description={
              isPending
                ? loadingCopy
                : result
                  ? isErrorResult
                    ? "We attempted to inspect the website and it declined to cooperate in any useful way."
                    : displaySummary
                  : "A deeply unserious label for very real website problems."
            }
          >
            <div className="grid gap-5 sm:grid-cols-[160px_1fr] sm:items-center">
              <div
                className={
                  isPending ? "score-ring score-ring--loading mx-auto" : "score-ring mx-auto"
                }
              >
                <div className="score-ring__inner">
                  <span className="score-ring__value">
                    {isPending ? "..." : result ? (isErrorResult ? "!" : result.score) : "--"}
                  </span>
                  <span className="score-ring__label">
                    {isPending
                      ? "building case"
                      : result
                        ? isErrorResult
                          ? "review failed"
                          : "verdict ready"
                        : "Awaiting evidence"}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
                  {isPending
                    ? "Deliberations underway."
                    : result
                      ? isErrorResult
                        ? "No usable page evidence."
                        : `Score ${result.score}/100`
                      : "No ruling yet."}
                </h3>
                <p className="text-sm leading-6 text-[var(--color-soft)]">
                  {isPending
                    ? "The server is fetching website signals, extracting visible copy, and building the verdict."
                    : result
                      ? publicWarning ??
                        (isErrorResult
                          ? "That website could not be analyzed cleanly. Try a different public website."
                          : "The analysis pipeline has spoken.")
                      : "Once a page is analyzed, this area stops looking polite and starts becoming specific."}
                </p>
                <p className="inline-flex rounded-full border border-[color:var(--color-line)] px-3 py-1 text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
                  {result
                    ? isErrorResult
                      ? "Retry encouraged"
                      : appealCount > 0
                        ? "Appeal denied"
                        : "Judgement filed"
                    : "This is not legal advice"}
                </p>
              </div>
            </div>

            {result && !isPending ? (
              isErrorResult ? (
                <div className="mt-6 space-y-4 rounded-[28px] border border-[color:var(--color-line)] bg-[var(--color-panel-strong)] p-5">
                  <div className="space-y-2">
                    <h4 className="text-lg font-semibold text-[var(--color-foreground)]">
                      The witness was unhelpful.
                    </h4>
                    <p className="text-sm leading-6 text-[var(--color-soft)]">
                      The website may block requests, return non-HTML content, or simply refuse to
                      provide enough visible text to roast responsibly.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sampleUrls.map((sampleUrl) => (
                      <button
                        key={`retry-${sampleUrl}`}
                        type="button"
                        onClick={() => selectUrl(sampleUrl)}
                        className="action-button action-button--secondary"
                      >
                        Try {sampleUrl.replace(/^https?:\/\//, "")}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <div className="verdict-card verdict-card--animated">
                    <div className="verdict-card__header">
                      <div className="space-y-1">
                        <p className="text-[0.72rem] uppercase tracking-[0.28em] text-[var(--color-muted)]">
                          Shareable Verdict
                        </p>
                        <h4 className="text-xl font-semibold text-[var(--color-foreground)]">
                          {result.title}
                        </h4>
                      </div>
                      <div className="verdict-card__score">{result.score}</div>
                    </div>
                    <p className="text-sm leading-6 text-[var(--color-soft)]">
                      {displaySummary}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {result.tags.map((tag) => (
                        <span key={tag} className="verdict-chip">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="verdict-card__footer">
                      <span>{result.analyzedUrl.replace(/^https?:\/\//, "")}</span>
                      <span>Roast A Website</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleCopyResult}
                        className="action-button action-button--secondary"
                      >
                        <Icon
                          path="M9 9h8v11H9zM7 15H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"
                          className="mr-2 h-4 w-4"
                        />
                        {copyFeedback || "Copy result"}
                      </button>
                      <button
                        type="button"
                        onClick={handleShareResult}
                        className="action-button"
                      >
                        <Icon
                          path="M7 12v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7M12 16V3M7 8l5-5 5 5"
                          className="mr-2 h-4 w-4"
                        />
                        {shareFeedback || "Share verdict"}
                      </button>
                      {/* <button
                        type="button"
                        onClick={handleAppeal}
                        className="action-button"
                      >
                        <Icon
                          path="M21 12a9 9 0 1 1-2.64-6.36L21 8M21 3v5h-5"
                          className="mr-2 h-4 w-4"
                        />
                        Appeal the verdict
                      </button> */}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {resultActions.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => setActiveTab(action.id)}
                        className={[
                          "result-tab",
                          activeTab === action.id ? "result-tab--active" : "",
                        ].join(" ")}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>

                  <div className="rounded-[28px] border border-[color:var(--color-line)] bg-[var(--color-panel-strong)] p-5 result-panel">
                    {activeTab === "roasts" ? (
                      <ul className="space-y-3">
                        {result.roasts.map((roast, index) => (
                          <li key={roast} className="result-list-item">
                            <span className="result-list-item__index">0{index + 1}</span>
                            <span className="result-list-item__text">{roast}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {activeTab === "fixes" ? (
                      <ul className="space-y-3">
                        {result.fixes.map((fix, index) => (
                          <li key={fix} className="result-list-item result-list-item--fix">
                            <span className="result-list-item__index">0{index + 1}</span>
                            <span className="result-list-item__text">{fix}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {activeTab === "evidence" ? (
                      <ul className="space-y-3 text-sm leading-6 text-[var(--color-soft)]">
                        {evidenceItems.map((note) => (
                          <li
                            key={`evidence-${note}`}
                            className="rounded-2xl border border-[color:var(--color-line)] bg-[var(--color-panel)] px-4 py-3"
                          >
                            {note}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              )
            ) : null}
          </ShellCard>

          {!result && !isPending ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <ShellCard
                eyebrow="Charges"
                title="Likely offences"
                description="A preview of how the app will frame the website's bad habits."
              >
                <div className="flex flex-wrap gap-2">
                  {chargeItems.map((charge) => (
                    <span
                      key={charge}
                      className="rounded-full border border-[color:var(--color-line)] bg-[var(--color-panel-strong)] px-3 py-2 text-xs uppercase tracking-[0.2em] text-[var(--color-foreground)]"
                    >
                      {charge}
                    </span>
                  ))}
                </div>
              </ShellCard>

              <ShellCard
                eyebrow="Judge Notes"
                title="Notes for the record"
                description="This panel will eventually hold the actual roasts, fixes, and whatever evidence the website leaves lying around."
              >
                <ul className="space-y-3 text-sm leading-6 text-[var(--color-soft)]">
                  {evidenceItems.map((note) => (
                    <li
                      key={note}
                      className="rounded-2xl border border-[color:var(--color-line)] bg-[var(--color-panel-strong)] px-4 py-3"
                    >
                      {note}
                    </li>
                  ))}
                </ul>
              </ShellCard>
            </div>
          ) : null}
        </div>
        </div>
      </section>

      <section className="grid gap-4">
        <ShellCard
          eyebrow="Recent History"
          title={
            history.length > 0 ? "Previous proceedings" : "Nothing scandalous yet"
          }
          description={
            history.length > 0
              ? "Local only. Click any previous verdict to restore it without bothering the database, because there is no database."
              : "Recent roasts stay in this browser only. The filing cabinet is currently embarrassed by its emptiness."
          }
          className="min-h-[200px]"
        >
          {history.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => restoreHistoryEntry(entry)}
                  className="history-card history-card--animated text-left"
                >
                  <div className="history-card__top">
                    <div className="flex items-center gap-3">
                      <span className="history-card__score">{entry.result.score}</span>
                      <div className="space-y-1">
                        <p className="history-card__label">Case File</p>
                        <span className="history-card__date">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Icon
                      path="M9 6l6 6-6 6"
                      className="h-4 w-4 text-[var(--color-muted)]"
                    />
                  </div>
                  <h3 className="history-card__title">{entry.result.title}</h3>
                  <p className="history-card__url">
                    {entry.result.analyzedUrl.replace(/^https?:\/\//, "")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entry.result.tags.slice(0, 3).map((tag) => (
                      <span key={`${entry.id}-${tag}`} className="verdict-chip">
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-full min-h-[112px] items-center justify-center rounded-[24px] border border-dashed border-[color:var(--color-line)] bg-[var(--color-panel-strong)] px-6 text-center text-sm leading-6 text-[var(--color-soft)]">
              No previous verdicts. A modest beginning.
            </div>
          )}
        </ShellCard>
      </section>

      <footer className="flex flex-col gap-3 border-t border-[color:var(--color-line)] px-2 pt-1 pb-6 text-sm text-[var(--color-soft)] sm:flex-row sm:items-center sm:justify-between">
        <p>{footerNoteForCount(roastCount)}</p>
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
          No accounts. No database. Maximum side-eye.
        </p>
      </footer>
    </>
  );
}
