import { redirect } from "next/navigation";

interface Props {
  params: {
    workspaceId: string;
  };
}

export default function WorkspaceEvalIndexPage({ params }: Props) {
  redirect(`/workspaces/${params.workspaceId}/eval/datasets`);
}
