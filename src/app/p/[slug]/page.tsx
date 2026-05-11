import type { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { KandiPublicShareActions } from "@/components/kandi/KandiPublicShareActions";
import { getSharedPostcard } from "@/lib/kandi/share/service";

async function getOriginFromHeaders(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const forwardedProto = headerList.get("x-forwarded-proto");

  if (host) {
    const proto = forwardedProto ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const origin = await getOriginFromHeaders();
  const shared = await getSharedPostcard(slug, { origin });

  if (!shared) {
    return {
      title: "Postcard Not Found • Kandi Maker",
    };
  }

  const postcardUrl = `${origin}/api/share/${shared.slug}/postcard`;
  return {
    title: `${shared.title} • Kandi Postcard`,
    description: shared.message || `A shared kandi design with ${shared.design.beadCount} beads.`,
    openGraph: {
      title: shared.title,
      description: shared.message || "A kandi postcard",
      images: [{ url: postcardUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: shared.title,
      description: shared.message || "A kandi postcard",
      images: [postcardUrl],
    },
  };
}

export default async function SharedPostcardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const origin = await getOriginFromHeaders();
  const shared = await getSharedPostcard(slug, { origin });

  if (!shared) {
    notFound();
  }

  const postcardUrl = `/api/share/${shared.slug}/postcard`;
  const shareUrl = `${origin}/p/${shared.slug}`;
  const remixUrl = `/?remix=${shared.slug}`;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0d0f14] px-4 py-8 text-[#edf1f8] sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: "url('/images/kandi-bg.jpg')" }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 [background:radial-gradient(circle_at_22%_-10%,rgba(56,107,255,0.16)_0,transparent_42%),radial-gradient(circle_at_80%_0%,rgba(79,146,90,0.1)_0,transparent_38%),linear-gradient(180deg,rgba(16,18,23,0.8)_0%,rgba(15,17,22,0.86)_55%,rgba(13,15,20,0.92)_100%)]"
      />
      <div className="relative z-10 mx-auto w-full max-w-[68rem]">
        <section className="overflow-hidden rounded-2xl border border-[#ffffff1a] bg-[#161a22d4] shadow-[0_18px_54px_rgba(0,0,0,0.46)] backdrop-blur-xl">
          <div className="grid gap-0 lg:grid-cols-[1fr_24rem]">
            <div className="border-b border-[#ffffff14] p-3 lg:border-r lg:border-b-0 lg:p-4">
              <Image
                src={postcardUrl}
                alt={shared.title}
                width={1200}
                height={630}
                className="h-auto w-full rounded-xl border border-[#ffffff14] object-cover"
              />
            </div>
            <div className="flex flex-col gap-2.5 p-4 lg:p-5">
              <p className="text-[0.75rem] font-medium uppercase tracking-[0.13em] text-[#a9b3c6]">Kandi Postcard</p>
              <h1 className="font-['Soehne','Avenir_Next','SF_Pro_Text','Segoe_UI',sans-serif] text-[1.35rem] font-semibold tracking-[-0.02em] text-[#f0f3f9]">
                {shared.title}
              </h1>
              {shared.message ? <p className="text-[0.9rem] leading-relaxed text-[#d7deea]">{shared.message}</p> : null}
              <p className="text-[0.79rem] text-[#93a0b8]">
                {shared.design.beadCount} beads • shared {new Date(shared.createdAt).toLocaleDateString()}
              </p>
              <KandiPublicShareActions shareUrl={shareUrl} remixUrl={remixUrl} postcardUrl={postcardUrl} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
