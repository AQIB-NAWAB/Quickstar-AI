import { redirect } from "next/navigation";

type Props = { params: { workspaceId: string } };

export default function NewAgentPage({ params }: Props) {
  redirect(`/workspaces/${params.workspaceId}/agents?create=1`);
}
