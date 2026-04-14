import type { ReactNode } from "react";

type ShellCardProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

export function ShellCard({
  eyebrow,
  title,
  description,
  children,
  className,
}: ShellCardProps) {
  return (
    <section
      className={[
        "rounded-[28px] border border-[color:var(--color-line)] bg-[color:var(--color-panel)] p-6 shadow-[0_10px_24px_rgba(0,0,0,0.16)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {(eyebrow || title || description) && (
        <header className="space-y-2">
          {eyebrow ? (
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.28em] text-[var(--color-muted)]">
              {eyebrow}
            </p>
          ) : null}
          {title ? (
            <h2 className="text-lg font-semibold tracking-tight text-[var(--color-foreground)]">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="max-w-xl text-sm leading-6 text-[var(--color-soft)]">
              {description}
            </p>
          ) : null}
        </header>
      )}
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}
