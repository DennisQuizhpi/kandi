import { KandiEditor } from "@/components/kandi/KandiEditor";

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string | string[]; view?: string | string[] }>;
}) {
  const params = await searchParams;
  const presetId = firstParam(params.preset);
  const view = firstParam(params.view);
  const guidedPreset = view === "top" ? "top" : "bracelet";

  return <KandiEditor presetId={presetId} guidedPreset={guidedPreset} />;
}
