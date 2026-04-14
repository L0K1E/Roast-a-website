const faqItems = [
  {
    question: "What does this do?",
    answer:
      "It reviews a public website, assigns a cringe score, and explains the verdict with both sarcasm and actual advice.",
  },
  {
    question: "Is the roast fair?",
    answer:
      "Fair in the way a very observant creative director is fair: blunt, specific, and annoyingly hard to argue with.",
  },
  {
    question: "Does this store my data?",
    answer:
      "No database, no account drama. Local history is optional and stays in the browser.",
  },
  {
    question: "Can I appeal the verdict?",
    answer:
      "Certainly. The court may respond by rephrasing the same disappointment with better lighting.",
  },
];

export function FaqPreview() {
  return (
    <section
      aria-labelledby="faq-title"
      className="grid gap-4 rounded-[32px] border border-[color:var(--color-line)] bg-[var(--color-panel)] p-6 md:grid-cols-2"
    >
      <div className="space-y-3">
        <p className="text-[0.72rem] uppercase tracking-[0.3em] text-[var(--color-muted)]">
          Tiny FAQ
        </p>
        <h2
          id="faq-title"
          className="max-w-sm text-2xl font-semibold tracking-tight text-[var(--color-foreground)]"
        >
          Four questions people ask before voluntarily submitting their website
          to judgement.
        </h2>
      </div>
      <div className="grid gap-3">
        {faqItems.map((item) => (
          <article
            key={item.question}
            className="rounded-3xl border border-[color:var(--color-line)] bg-[var(--color-panel-strong)] p-4"
          >
            <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
              {item.question}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--color-soft)]">
              {item.answer}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
