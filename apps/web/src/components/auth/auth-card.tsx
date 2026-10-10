import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

type Props = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthCard({ title, subtitle, children, footer }: Props) {
  return (
    <div className="min-h-screen firecrawl-grid bg-background-base flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 text-lg font-bold tracking-tight text-accent-black hover:opacity-90"
        >
          <BrandLogo className="h-7 w-7 shrink-0" />
          <span>
            QuickStart<span className="text-heat-100"> AI</span>
          </span>
        </Link>

        <div className="rounded-16 border border-border-faint bg-white p-8 shadow-firecrawl-card">
          <header className="mb-6 text-center">
            <h1 className="text-xl font-bold tracking-tight text-accent-black">{title}</h1>
            <p className="mt-2 text-sm text-neutral-500">{subtitle}</p>
          </header>
          {children}
          {footer ? <div className="mt-6 border-t border-border-faint pt-6 text-center text-sm">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
