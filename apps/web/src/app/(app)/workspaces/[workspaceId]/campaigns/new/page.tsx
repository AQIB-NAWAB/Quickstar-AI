import { redirect } from "next/navigation";

type Props = { params: { workspaceId: string } };

export default function NewCampaignPage({ params }: Props) {
  redirect(`/workspaces/${params.workspaceId}/campaigns?create=1`);
}
