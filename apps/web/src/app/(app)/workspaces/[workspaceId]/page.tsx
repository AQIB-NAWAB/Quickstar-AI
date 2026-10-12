import { redirect } from "next/navigation";

type Props = { params: { workspaceId: string } };

export default function WorkspaceHomePage({ params }: Props) {
  redirect(`/workspaces/${params.workspaceId}/agents`);
}
