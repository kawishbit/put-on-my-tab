import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/options";

export default async function Home(): Promise<React.JSX.Element> {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-16 md:py-24">
      <section className="app-surface overflow-hidden p-8 md:p-12">
        <p className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
          Put On My Tab
        </p>
        <h1 className="mt-4 font-heading text-4xl font-semibold text-slate-900 md:text-5xl">
          Shared expense tracking made simple.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Keep balances clear across roommates, friends, and family. Sign in to
          manage transactions and account settings.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className="app-button-primary">
            Sign in
          </Link>
        </div>
      </section>
    </div>
  );
}
