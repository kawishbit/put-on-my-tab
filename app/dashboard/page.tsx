import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { DashboardPageTemplate } from "@/components/layout/PageTemplates";
import { authOptions } from "@/lib/auth/options";
import { getUserById } from "@/lib/services/usersService";

const BALANCE_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Fdashboard");
  }

  const canCreate =
    session.user.policy === "admin" || session.user.policy === "mod";
  const isAdmin = session.user.policy === "admin";
  const user = await getUserById(session.user.id);

  return (
    <DashboardPageTemplate
      title="Overview"
      subtitle="Manage shared tabs in one place."
    >
      <main className="app-surface">
        <div className="grid gap-5 lg:grid-cols-[1.3fr_0.9fr]">
          <div>
            <p className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
              Put On My Tab
            </p>
            <h1 className="mt-3 font-heading text-3xl font-semibold text-slate-900 md:text-4xl">
              Keep shared expenses organized.
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 md:text-base">
              Create transactions, review activity, and manage access without
              jumping across screens.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Link href="/transactions" className="app-button-secondary">
                View Transactions
              </Link>
              <Link href="/transactions/mine" className="app-button-secondary">
                My Ledger
              </Link>
              {canCreate ? (
                <Link
                  href="/transactions/create"
                  className="app-button-primary"
                >
                  New Transaction
                </Link>
              ) : null}
            </div>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Signed In
              </p>
              <p className="text-sm text-slate-700">
                <span className="font-medium">{session.user.email}</span>
              </p>
              <p className="text-sm text-slate-600">
                Access policy:{" "}
                <span className="font-semibold">{session.user.policy}</span>
              </p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Current balance
                </p>
                <p className="font-heading text-2xl font-semibold text-slate-900">
                  {BALANCE_FORMATTER.format(user.current_balance)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link href="/settings" className="app-button-secondary">
                  Open Settings
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      {isAdmin ? (
        <section className="app-surface">
          <h2 className="font-heading text-xl font-semibold text-slate-900">
            Admin Operations
          </h2>
          <p className="app-subtitle">
            Jump directly into user and category controls.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/admin/dashboard" className="app-button-primary">
              Open Admin Dashboard
            </Link>
            <Link href="/settings/admin/users" className="app-button-secondary">
              Manage Users
            </Link>
            <Link
              href="/settings/admin/categories"
              className="app-button-secondary"
            >
              Manage Categories
            </Link>
          </div>
        </section>
      ) : null}
    </DashboardPageTemplate>
  );
}
