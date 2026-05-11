import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { KandiShareView } from "@/components/kandi/KandiShareView";
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

  return {
    title: `${shared.title} • Kandi Share`,
    description: shared.message || `A shared kandi design with ${shared.design.beadCount} beads.`,
    openGraph: {
      title: shared.title,
      description: shared.message || "A kandi share",
      url: `${origin}/p/${shared.slug}`,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: shared.title,
      description: shared.message || "A kandi share",
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

  const shareUrl = `${origin}/p/${shared.slug}`;
  const remixUrl = `/?remix=${shared.slug}`;
  return (
    <KandiShareView
      design={shared.design}
      title={shared.title}
      message={shared.message}
      shareUrl={shareUrl}
      remixUrl={remixUrl}
      createdAt={shared.createdAt}
    />
  );
}
