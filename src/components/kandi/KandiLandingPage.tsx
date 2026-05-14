"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { KandiStarterLanding } from "@/components/kandi/KandiStarterLanding";
import { STARTER_PRESETS, type StarterPreset } from "@/lib/kandi/starters";

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => void;
};

export function KandiLandingPage() {
  const router = useRouter();

  const navigateWithTransition = useCallback(
    (href: string) => {
      const doc = document as ViewTransitionDocument;
      if (typeof doc.startViewTransition === "function") {
        doc.startViewTransition(() => {
          router.push(href);
        });
        return;
      }
      router.push(href);
    },
    [router],
  );

  const onStartBlank = useCallback(() => {
    navigateWithTransition("/editor");
  }, [navigateWithTransition]);

  const onSelectPreset = useCallback(
    (preset: StarterPreset) => {
      navigateWithTransition(`/editor?preset=${encodeURIComponent(preset.id)}`);
    },
    [navigateWithTransition],
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-transparent text-[var(--text-strong)]">
      <KandiStarterLanding presets={STARTER_PRESETS} onStartBlank={onStartBlank} onSelectPreset={onSelectPreset} />
    </main>
  );
}

