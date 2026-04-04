import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  PiggyBank,
  ReceiptText,
  SplitSquareVertical,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { authOptions } from "@/lib/auth/options";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: ReceiptText,
    title: "Log transactions instantly",
    description:
      "Record shared expenses in seconds. Every purchase, split, or payment is tracked with a full audit trail.",
  },
  {
    icon: Users,
    title: "Manage groups effortlessly",
    description:
      "Invite roommates, travel buddies, or teammates. Balances update automatically as expenses are added.",
  },
  {
    icon: SplitSquareVertical,
    title: "Flexible expense splitting",
    description:
      "Split bills equally or assign custom amounts. Handles even the messiest shared-cost scenarios.",
  },
  {
    icon: BarChart3,
    title: "Clear financial overview",
    description:
      "A live dashboard shows who owes what at a glance. No spreadsheets, no guesswork.",
  },
  {
    icon: PiggyBank,
    title: "Settle up with ease",
    description:
      "Mark balances as settled with one tap. Full history keeps everyone accountable.",
  },
  {
    icon: BadgeCheck,
    title: "Admin controls built in",
    description:
      "Admins can manage users, review all transactions, and configure categories from a dedicated panel.",
  },
];

export default async function Home(): Promise<React.JSX.Element> {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      {/* Ambient background blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-32 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-[400px] w-[500px] rounded-full bg-secondary/30 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[350px] w-[450px] rounded-full bg-accent/40 blur-[100px]" />
      </div>

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <span className="font-heading text-base font-semibold tracking-tight text-foreground">
          PutOnMyTab
        </span>
        <Link
          href="/login"
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            "rounded-xl",
          )}
        >
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center px-6 pb-24 pt-20 text-center md:pt-32">
        <Badge
          variant="secondary"
          className="mb-6 gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest"
        >
          Shared expense tracking
        </Badge>

        <h1 className="font-heading max-w-3xl text-balance text-5xl font-semibold leading-[1.1] tracking-tight text-foreground md:text-6xl lg:text-7xl">
          The tab everyone&nbsp;can&nbsp;
          <span className="relative inline-block">
            <span className="relative z-10">agree on.</span>
            <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-1 -z-0 h-3 rounded-full bg-primary/15"
            />
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-balance text-lg text-muted-foreground">
          Keep balances clear across roommates, friends, and family. Log
          expenses, split costs, and settle up — all in one place.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-12 rounded-xl px-7 text-sm font-semibold shadow-lg shadow-slate-900/10 transition hover:shadow-slate-900/20 dark:shadow-black/30 dark:hover:shadow-black/45",
            )}
          >
            Get started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        {/* Hero card mockup */}
        <div className="relative mt-20 w-full max-w-2xl">
          <div className="app-surface px-6 py-7 text-left">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground/85">
                Recent transactions
              </h2>
              <Badge
                variant="outline"
                className="text-xs text-muted-foreground"
              >
                3 pending
              </Badge>
            </div>
            <div className="space-y-3">
              {[
                { label: "Grocery run", amount: "−$24.50", who: "Alex" },
                { label: "Monthly utilities", amount: "−$68.00", who: "You" },
                { label: "Netflix subscription", amount: "+$6.00", who: "Sam" },
              ].map((tx) => (
                <div
                  key={tx.label}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-background/75 px-4 py-3 text-sm shadow-sm dark:bg-card/65"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
                      {tx.who[0]}
                    </span>
                    <div>
                      <p className="font-medium text-foreground">{tx.label}</p>
                      <p className="text-xs text-muted-foreground">
                        paid by {tx.who}
                      </p>
                    </div>
                  </div>
                  <span
                    className={
                      tx.amount.startsWith("+")
                        ? "font-semibold text-emerald-600"
                        : "font-semibold text-foreground"
                    }
                  >
                    {tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* Decorative shadow card behind */}
          <div
            aria-hidden="true"
            className="absolute inset-x-4 -bottom-3 -z-10 h-full rounded-2xl border border-white/60 bg-white/40 shadow-lg dark:border-white/10 dark:bg-white/5"
          />
        </div>

        {/* Features grid */}
        <section className="mt-32 w-full max-w-4xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Everything you need
          </p>
          <h2 className="font-heading text-balance text-3xl font-semibold text-foreground md:text-4xl">
            Built for the way people actually share money
          </h2>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <Card
                key={title}
                className="group rounded-2xl border-border/65 bg-card/75 shadow-sm backdrop-blur transition hover:shadow-md hover:shadow-slate-300/25 dark:bg-card/55 dark:hover:shadow-black/30"
              >
                <CardContent className="p-6">
                  <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-muted transition group-hover:bg-primary/15">
                    <Icon className="h-5 w-5 text-foreground/85 transition group-hover:text-primary" />
                  </div>
                  <h3 className="mb-1.5 text-sm font-semibold text-foreground">
                    {title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA band */}
        <section className="mt-28 w-full max-w-3xl">
          <div className="app-surface overflow-hidden px-8 py-14 text-center">
            <h2 className="font-heading text-balance text-3xl font-semibold text-foreground md:text-4xl">
              Ready to split the bill fairly?
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              Sign in and start tracking shared expenses with your group today.
            </p>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-8 h-12 rounded-xl px-8 text-sm font-semibold shadow-lg shadow-slate-900/10 dark:shadow-black/30",
              )}
            >
              Get started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/60 px-6 py-6 text-center text-xs text-muted-foreground md:px-12">
        © {new Date().getFullYear()} PutOnMyTab. All rights reserved.
      </footer>
    </div>
  );
}
