import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_ACCESS } from "@/lib/server/auth/cookies";
import { LandingView } from "@/features/marketing/components/landing-view";

type Props = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default function HomePage({ searchParams }: Props) {
  // If user is already authenticated and didn't explicitly request ?landing=1, take them to the workspace panel
  const showLanding = searchParams?.landing === "1" || searchParams?.marketing === "1";
  const token = cookies().get(COOKIE_ACCESS)?.value;

  if (token && !showLanding) {
    redirect("/workspaces");
  }

  return <LandingView />;
}
