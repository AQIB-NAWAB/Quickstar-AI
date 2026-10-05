import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coming soon | QuickStart AI",
  description: "We’re still building this part of QuickStart AI. For now, explore what your first agent could do.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ComingSoonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
