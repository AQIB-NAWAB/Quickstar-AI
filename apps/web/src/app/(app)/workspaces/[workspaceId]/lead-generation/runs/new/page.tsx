import { redirect } from "next/navigation";

type Props = { params: { workspaceId: string } };

export default function Page({ params }: Props) {
  redirect(`/workspaces/${params.workspaceId}/lead-generation/runs?create=1`);
}
