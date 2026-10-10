import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

export default function NotFound() {
  return (
    <div className="min-h-screen firecrawl-grid bg-background-base flex flex-col items-center justify-center px-4 text-center">
      <BrandLogo className="h-10 w-10 mb-6" />
      <h1 className="text-2xl font-bold text-accent-black">Page not found</h1>
      <p className="mt-2 text-sm text-neutral-500 max-w-md">
        This URL does not exist. Head back to the product overview or sign in to your workspace.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="button-primary rounded-10 px-5 py-2.5 text-sm font-semibold text-white">
          Home
        </Link>
        <Link
          href="/login"
          className="rounded-10 border border-border-faint bg-white px-5 py-2.5 text-sm font-semibold text-accent-black hover:bg-neutral-50"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
