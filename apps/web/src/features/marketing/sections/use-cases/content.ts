import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  Package,
  Users,
  Phone,
  Moon,
  Code2,
} from "lucide-react";

export interface UseCaseExample {
  id: string;
  question: string;
  actionText: string;
  icon: LucideIcon;
  portraitSrc: string;
  href: string;
  isEmphasized?: boolean;
  timeBelowPortrait?: string;
  isBrowserVariant?: boolean;
}

export interface UseCasesContent {
  eyebrow: string;
  heading: string;
  description: string;
  caption: string;
  ctaText: string;
  ctaHref: string;
  examples: UseCaseExample[];
}

export const USE_CASES_CONTENT: UseCasesContent = {
  eyebrow: "EVERYDAY JOBS",
  heading: "Start with a real request.",
  description: "Give your agent the work your customers already ask for.",
  caption: "Example requests",
  ctaText: "Build your first agent",
  ctaHref: "/register",
  examples: [
    {
      id: "appointment-booking",
      question: "Can I book Friday?",
      actionText: "Book an appointment",
      icon: Calendar,
      portraitSrc: "/marketing/use-cases/portrait-appointment.png",
      href: "/register",
      isEmphasized: true,
    },
    {
      id: "customer-questions",
      question: "Where is my order?",
      actionText: "Answer customer questions",
      icon: Package,
      portraitSrc: "/marketing/use-cases/portrait-order.png",
      href: "/register",
    },
    {
      id: "qualify-lead",
      question: "Would this work for our team?",
      actionText: "Qualify a new lead",
      icon: Users,
      portraitSrc: "/marketing/use-cases/portrait-lead.png",
      href: "/register",
    },
    {
      id: "follow-up-call",
      question: "Can you call me tomorrow?",
      actionText: "Request a follow-up call",
      icon: Phone,
      portraitSrc: "/marketing/use-cases/portrait-call.png",
      href: "/register",
    },
    {
      id: "after-hours",
      question: "Is anyone there?",
      timeBelowPortrait: "10:42 PM",
      actionText: "Answer after hours",
      icon: Moon,
      portraitSrc: "/marketing/use-cases/portrait-after-hours.png",
      href: "/register",
    },
    {
      id: "in-app-help",
      question: "Can you help me here?",
      actionText: "Help inside your app",
      icon: Code2,
      portraitSrc: "/marketing/use-cases/portrait-in-app.png",
      href: "/register",
      isBrowserVariant: true,
    },
  ],
};
