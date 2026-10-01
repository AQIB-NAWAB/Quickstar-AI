import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CtaBanner() {
  return (
    <section className="py-20 border-t border-border-faint bg-gradient-to-b from-white to-background-base">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-accent-black mb-4">
          Deploy your first autonomous <br />
          <span className="text-heat-100">AI agent in minutes</span>
        </h2>
        <p className="text-sm sm:text-base text-neutral-600 max-w-xl mx-auto mb-8">
          Start building with 1,000 free agent turns. Connect your company knowledge and deploy across website chat and telephony voice lines today.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-10 text-sm font-semibold text-white bg-heat-100 hover:bg-[#e04f12] active:scale-[0.98] transition-all shadow-firecrawl-btn"
          >
            <span>Start Building Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="#architecture"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-10 text-sm font-medium text-accent-black bg-white hover:bg-neutral-50 active:scale-[0.98] border border-border-faint hover:border-neutral-300 transition-all shadow-sm"
          >
            Explore Architecture
          </Link>
        </div>
      </div>
    </section>
  );
}
