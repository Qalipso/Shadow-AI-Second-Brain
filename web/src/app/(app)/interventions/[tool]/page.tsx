import { notFound } from "next/navigation";
import { slugToType } from "@/lib/interventions/types";
import { ToolPanel } from "@/components/interventions/ToolPanel";

export const dynamic = "force-dynamic";

export default async function ToolPage({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool } = await params;
  const type = slugToType(tool);
  if (!type) notFound();
  return <ToolPanel type={type} />;
}
