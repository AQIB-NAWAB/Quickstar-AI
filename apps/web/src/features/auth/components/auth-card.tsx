import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { ArrowUpRight, Bot, MessageSquare, Workflow } from "lucide-react";

type Props = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthCard({ title, subtitle, children, footer }: Props) {
  return (
    <div className="min-h-screen bg-background-base flex flex-col">
      <header className="h-20 shrink-0 px-6 sm:px-10 flex items-center justify-between border-b border-border-faint bg-white">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-accent-black hover:opacity-90"
        >
          <BrandLogo className="h-7 w-7 shrink-0" />
          <span>
            QuickStart<span className="text-heat-100"> AI</span>
          </span>
        </Link>
        <Link href="/" className="flex items-center gap-1 text-xs text-neutral-500 hover:text-heat-100">Back to website <ArrowUpRight className="w-3.5 h-3.5" /></Link>
      </header>
      <main className="flex-1 grid lg:grid-cols-2 max-w-6xl w-full mx-auto">
        <section className="hidden lg:flex flex-col justify-center p-12 xl:p-16">
          <span className="text-xs font-semibold text-heat-100 mb-5">Your AI workspace</span>
          <h2 className="text-4xl font-semibold tracking-tight leading-tight text-accent-black">Build better customer<br />conversations.</h2>
          <p className="mt-5 max-w-sm text-sm leading-6 text-neutral-500">Bring your agents, knowledge, voice and workflows together in one place.</p>
          <div className="mt-10 space-y-5">
            {[{ icon: Bot, title: "Agents that work for you", text: "Configure prompts, models and tools." }, { icon: MessageSquare, title: "Every conversation, connected", text: "Manage chat, voice and human handoff." }, { icon: Workflow, title: "Automation with visibility", text: "Connect workflows and understand performance." }].map(({icon: Icon, title: itemTitle, text}) => <div key={itemTitle} className="flex gap-3"><div className="w-9 h-9 shrink-0 rounded-10 border border-heat-24 bg-heat-8 flex items-center justify-center"><Icon className="w-4 h-4 text-heat-100" /></div><div><p className="text-sm font-medium text-accent-black">{itemTitle}</p><p className="mt-1 text-xs text-neutral-500">{text}</p></div></div>)}
          </div>
        </section>
        <section className="flex items-center justify-center px-4 py-10 sm:px-10 lg:border-l border-border-faint">
        <div className="w-full max-w-[420px] rounded-12 border border-border-faint bg-white p-6 sm:p-8">
          <header className="mb-7">
            <h1 className="text-2xl font-semibold tracking-tight text-accent-black">{title}</h1>
            <p className="mt-2 text-[13px] leading-5 text-neutral-500">{subtitle}</p>
          </header>
          {children}
          {footer ? <div className="mt-6 border-t border-border-faint pt-5 text-center text-xs">{footer}</div> : null}
        </div>
        </section>
      </main>
      <footer className="px-6 py-5 text-center text-[11px] text-neutral-400">QuickStart AI · Your workspace for customer conversations</footer>
    </div>
  );
}
