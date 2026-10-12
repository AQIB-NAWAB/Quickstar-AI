import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { FrontendPreview } from "@/features/preview/frontend-preview";

export default function PreviewPage({ params }: { params: { view: string[] } }) {
  if (process.env.NODE_ENV !== "development") notFound();
  if (params.view[0] === "overview") redirect("/preview/agents");
  if (
    ![
      "inbox",
      "knowledge",
      "memory",
      "settings",
      "analytics",
      "workflows",
      "leads",
      "campaigns",
      "integrations",
      "voice",
      "audit",
      "notifications",
      "developer",
      "eval",
      "agents",
    ].includes(params.view[0])
  )
    notFound();
  return (
    <Suspense fallback={<p>Loading preview…</p>}>
      <FrontendPreview view={params.view} />
    </Suspense>
  );
}
