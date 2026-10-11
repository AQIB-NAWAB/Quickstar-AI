import Link from "next/link";
import { ArrowUpRight, Bot, BookOpen, BarChart3, MessageSquare, PhoneCall, Workflow } from "lucide-react";

export function WorkspaceOverview({ workspaceId, workspaceName, isPreview = false }: { workspaceId: string; workspaceName: string; isPreview?: boolean }) {
  const base = isPreview ? "/preview" : `/workspaces/${workspaceId}`;
  const features = [
    { name: "Inbox", path: "inbox", icon: MessageSquare, description: "Read conversations, take handoff and reply to customers." },
    { name: "Agents", path: "agents", icon: Bot, description: "Configure instructions, models, tools and release versions." },
    { name: "Knowledge", path: "knowledge", icon: BookOpen, description: "Manage the sources and context your agents use." },
    { name: "Voice", path: "voice/inbound", icon: PhoneCall, description: "Review inbound calls, recordings and transcripts." },
    { name: "Workflows", path: "workflows", icon: Workflow, description: "Connect events, conditions and automated actions." },
    { name: "Analytics", path: "analytics", icon: BarChart3, description: "Understand usage, activity and response performance." },
  ];
  return <div className="space-y-6"><header><div className="flex items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight text-accent-black">Overview</h1>{isPreview && <span className="rounded-full bg-heat-8 px-2 py-1 text-[10px] font-medium text-heat-100">Sample data</span>}</div><p className="mt-1 text-sm text-neutral-500">Welcome to {workspaceName}. Manage your customer conversations from one workspace.</p></header><section className="rounded-12 border border-border-faint bg-white p-5 sm:p-6"><h2 className="text-base font-semibold text-accent-black">Your workspace, at a glance</h2><p className="mt-2 text-sm text-neutral-500">Open a section below to manage your agents and conversations.</p></section><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{features.map(({name,path,icon:Icon,description})=><Link key={path} href={`${base}/${path}`} className="group rounded-12 border border-border-faint bg-white p-5 transition-colors hover:border-heat-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-heat-100"><div className="flex items-center justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-10 bg-heat-8 text-heat-100"><Icon className="h-4 w-4" /></span><ArrowUpRight className="h-4 w-4 text-neutral-400 group-hover:text-heat-100" /></div><h2 className="mt-4 text-sm font-semibold text-accent-black">{name}</h2><p className="mt-2 text-xs leading-5 text-neutral-500">{description}</p></Link>)}</div></div>;
}
