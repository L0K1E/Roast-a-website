import { FaqPreview } from "@/components/faq-preview";
import { InteractiveShell } from "@/components/interactive-shell";

export function HomeShell() {
  return (
    <main className="relative overflow-hidden">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <InteractiveShell />

        <FaqPreview />
      </div>
    </main>
  );
}
