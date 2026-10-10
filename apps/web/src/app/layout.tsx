import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuickStart AI — Production-Scale Multi-Tenant AI Agent Platform",
  description:
    "Build, deploy, and scale autonomous AI agents across website chat, telephony voice calls, and automated enterprise workflows with sub-second latency.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background-base text-accent-black font-sans antialiased selection:bg-heat-20 selection:text-heat-100">
        {children}
      </body>
    </html>
  );
}
