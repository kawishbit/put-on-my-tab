import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { DashboardPageTemplate } from "@/components/layout/PageTemplates";
import {
  SimpleTableBody,
  SimpleTableCell,
  SimpleTableHead,
  SimpleTableHeader,
  SimpleTableRoot,
  SimpleTableRow,
} from "@/components/ui/simple-table-core";
import { authOptions } from "@/lib/auth/options";
import {
  getAdminDashboardData,
  getUserDashboardData,
} from "@/lib/services/dashboardService";
import { formatCurrencyAmount } from "@/lib/utils/currency";

const PERCENT_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const CATEGORY_COLORS = [
  "#1f2937",
  "#0f766e",
  "#1d4ed8",
  "#b45309",
  "#be123c",
  "#7c3aed",
] as const;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function DonutChart({
  data,
  label,
}: {
  data: Array<{ label: string; amount: number; percentage: number }>;
  label: string;
}): React.JSX.Element {
  const size = 240;
  const strokeWidth = 36;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulated = 0;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      className="mx-auto h-56 w-56"
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="transparent"
        stroke="var(--color-border)"
        strokeWidth={strokeWidth}
      />
      {data.map((item, index) => {
        const ratio = item.percentage / 100;
        const segmentLength = circumference * ratio;
        const segmentOffset = circumference * (1 - accumulated);

        accumulated += ratio;

        return (
          <circle
            key={`${item.label}-${item.amount}`}
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
            strokeDashoffset={segmentOffset}
            transform={`rotate(-90 ${center} ${center})`}
          />
        );
      })}
      <circle cx={center} cy={center} r={44} className="fill-background" />
      <text
        x={center}
        y={center}
        textAnchor="middle"
        className="fill-slate-900 text-[13px] font-semibold dark:fill-slate-100"
      >
        Category Mix
      </text>
    </svg>
  );
}

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Fdashboard");
  }

  const isAdmin = session.user.policy === "admin";
  const canCreate =
    session.user.policy === "admin" || session.user.policy === "mod";

  const [userDashboard, adminDashboard] = await Promise.all([
    getUserDashboardData(session.user.id),
    isAdmin ? getAdminDashboardData() : Promise.resolve(null),
  ]);

  const userMonthlyMax = Math.max(
    ...userDashboard.monthlyExpenditure.map((entry) => entry.amount),
    1,
  );

  return (
    <DashboardPageTemplate
      title="Dashboard"
      subtitle="Personal and team tab insights in one workspace."
    >
      <main className="app-surface">
        <div>
          <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 dark:border-white/10 dark:from-slate-800/60 dark:to-slate-900/40">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Signed In
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <span className="font-medium">{session.user.email}</span>
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Access policy:{" "}
                <span className="font-semibold">{session.user.policy}</span>
              </p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-slate-800/70">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Current balance
                </p>
                <p className="font-heading text-2xl font-semibold text-slate-900 dark:text-slate-50">
                  {formatCurrencyAmount(userDashboard.summary.currentBalance)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link href="/settings" className="app-button-secondary">
                  Open Settings
                </Link>
                <Link href="/my-transactions" className="app-button-secondary">
                  My Transactions
                </Link>
                {canCreate ? (
                  <>
                    <Link
                      href="/transactions/create"
                      className="app-button-primary"
                    >
                      Add Transaction
                    </Link>
                    <Link
                      href="/transactions/create-group"
                      className="app-button-secondary"
                    >
                      Add Group Transaction
                    </Link>
                  </>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </main>

      <section className="app-surface">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">
              Your Activity
            </h2>
            <p className="app-subtitle">
              Personal spending trends and recent transactions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/my-transactions" className="app-button-secondary">
              View All My Transactions
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-slate-200 bg-white/95 p-4 dark:border-white/10 dark:bg-slate-800/50">
            <h3 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
              Monthly Expenditure
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Completed personal spending by month.
            </p>
            <div className="mt-4 space-y-3">
              {userDashboard.monthlyExpenditure.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/15 dark:bg-slate-800/60 dark:text-slate-400">
                  No completed personal transactions yet.
                </p>
              ) : (
                userDashboard.monthlyExpenditure.map((point) => (
                  <article key={point.monthKey}>
                    <div className="mb-1 flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
                      <p className="font-medium">{point.monthLabel}</p>
                      <p>{formatCurrencyAmount(point.amount)}</p>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700/60">
                      <div
                        className="h-2 rounded-full bg-slate-700 dark:bg-slate-400"
                        style={{
                          width: `${Math.min((point.amount / userMonthlyMax) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white/95 p-4 dark:border-white/10 dark:bg-slate-800/50">
            <h3 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
              Your Category Breakdown
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Completed transactions grouped by category.
            </p>
            {userDashboard.categoryBreakdown.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/15 dark:bg-slate-800/60 dark:text-slate-400">
                No category data to visualize yet.
              </p>
            ) : (
              <div className="mt-4">
                <DonutChart
                  data={userDashboard.categoryBreakdown}
                  label="Your completed spending by category"
                />
                <div className="mt-3 space-y-2">
                  {userDashboard.categoryBreakdown.map((item, index) => (
                    <div
                      key={item.categoryId}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-white/10"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor:
                              CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                          }}
                        />
                        <p className="text-sm text-slate-800 dark:text-slate-200">
                          {item.label}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {PERCENT_FORMATTER.format(item.percentage)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="mt-6">
          <h3 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
            Last 10 Personal Transactions
          </h3>
          <SimpleTableRoot className="mt-3">
            <table className="min-w-full text-sm">
              <SimpleTableHeader>
                <SimpleTableRow>
                  <SimpleTableHead className="px-4 py-3">Name</SimpleTableHead>
                  <SimpleTableHead className="px-4 py-3">
                    Amount
                  </SimpleTableHead>
                  <SimpleTableHead className="px-4 py-3">
                    Status
                  </SimpleTableHead>
                  <SimpleTableHead className="px-4 py-3">Date</SimpleTableHead>
                  <SimpleTableHead className="px-4 py-3">
                    Category
                  </SimpleTableHead>
                  <SimpleTableHead className="px-4 py-3">
                    Quick Link
                  </SimpleTableHead>
                </SimpleTableRow>
              </SimpleTableHeader>
              <SimpleTableBody>
                {userDashboard.recentTransactions.length === 0 ? (
                  <SimpleTableRow>
                    <SimpleTableCell
                      className="px-4 py-4 text-slate-500 dark:text-slate-400"
                      colSpan={6}
                    >
                      No transactions available.
                    </SimpleTableCell>
                  </SimpleTableRow>
                ) : (
                  userDashboard.recentTransactions.map((transaction) => (
                    <SimpleTableRow key={transaction.transactionId}>
                      <SimpleTableCell className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {transaction.name}
                      </SimpleTableCell>
                      <SimpleTableCell className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {formatCurrencyAmount(transaction.amount)}
                      </SimpleTableCell>
                      <SimpleTableCell className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            transaction.status === "completed"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                              : transaction.status === "pending"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                                : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {transaction.status}
                        </span>
                      </SimpleTableCell>
                      <SimpleTableCell className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {formatDate(transaction.createdAt)}
                      </SimpleTableCell>
                      <SimpleTableCell className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {transaction.categoryLabel}
                      </SimpleTableCell>
                      <SimpleTableCell className="px-4 py-3">
                        {isAdmin ? (
                          <Link
                            href={`/transactions/${transaction.transactionId}/edit`}
                            className="text-sm font-medium text-slate-700 underline underline-offset-2 dark:text-slate-300"
                          >
                            Open
                          </Link>
                        ) : (
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            View only
                          </span>
                        )}
                      </SimpleTableCell>
                    </SimpleTableRow>
                  ))
                )}
              </SimpleTableBody>
            </table>
          </SimpleTableRoot>
        </section>
      </section>

      {isAdmin && adminDashboard ? (
        <section className="app-surface">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">
                Admin Dashboard Cards
              </h2>
              <p className="app-subtitle">
                Policy-protected system metrics for admin users.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/transactions" className="app-button-secondary">
                All Transactions
              </Link>
              <Link
                href="/settings/admin/users"
                className="app-button-secondary"
              >
                Manage Users
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-slate-800/50 dark:shadow-none">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Total transactions
              </p>
              <p className="mt-2 font-heading text-3xl font-semibold text-slate-900 dark:text-slate-50">
                {adminDashboard.summary.totalTransactions}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-slate-800/50 dark:shadow-none">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Total system balance
              </p>
              <p className="mt-2 font-heading text-3xl font-semibold text-slate-900 dark:text-slate-50">
                {formatCurrencyAmount(
                  adminDashboard.summary.totalSystemBalance,
                )}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-slate-800/50 dark:shadow-none">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Active users
              </p>
              <p className="mt-2 font-heading text-3xl font-semibold text-slate-900 dark:text-slate-50">
                {adminDashboard.summary.activeUsers}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-slate-800/50 dark:shadow-none">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Pending transactions
              </p>
              <p className="mt-2 font-heading text-3xl font-semibold text-amber-700 dark:text-amber-400">
                {adminDashboard.summary.pendingTransactions}
              </p>
            </article>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-2xl border border-slate-200 bg-white/95 p-4 dark:border-white/10 dark:bg-slate-800/50">
              <h3 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
                Balance Overview
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Live balances for all active users.
              </p>
              <div className="mt-4 space-y-3">
                {adminDashboard.balances.map((item) => (
                  <article
                    key={item.userId}
                    className="rounded-xl border border-slate-200 bg-white/95 p-3 dark:border-white/10 dark:bg-slate-700/30"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {item.name}
                      </p>
                      <p
                        className={`font-semibold ${
                          item.balance >= 0
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-rose-700 dark:text-rose-400"
                        }`}
                      >
                        {formatCurrencyAmount(item.balance)}
                      </p>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-700/60">
                      <div
                        className={`h-2 rounded-full ${
                          item.balance >= 0 ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                        style={{
                          width: `${Math.min(Math.abs(item.balance) * 2, 100)}%`,
                        }}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white/95 p-4 dark:border-white/10 dark:bg-slate-800/50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Monthly Expenditure
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Completed spending by month.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right dark:border-white/10 dark:bg-slate-800/70">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    {adminDashboard.monthlyComparison.currentMonthLabel} vs{" "}
                    {adminDashboard.monthlyComparison.previousMonthLabel}
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {adminDashboard.monthlyComparison.percentChange === null
                      ? "n/a"
                      : `${adminDashboard.monthlyComparison.percentChange > 0 ? "+" : ""}${PERCENT_FORMATTER.format(adminDashboard.monthlyComparison.percentChange)}%`}
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {adminDashboard.monthlyExpenditure.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/15 dark:bg-slate-800/60 dark:text-slate-400">
                    No completed transactions yet.
                  </p>
                ) : (
                  adminDashboard.monthlyExpenditure.map((point) => (
                    <article key={point.monthKey}>
                      <div className="mb-1 flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
                        <p className="font-medium">{point.monthLabel}</p>
                        <p>{formatCurrencyAmount(point.amount)}</p>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700/60">
                        <div
                          className="h-2 rounded-full bg-slate-700 dark:bg-slate-400"
                          style={{
                            width: `${Math.min(
                              (point.amount /
                                Math.max(
                                  ...adminDashboard.monthlyExpenditure.map(
                                    (entry) => entry.amount,
                                  ),
                                  1,
                                )) *
                                100,
                              100,
                            )}%`,
                          }}
                        />
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-12">
            <section className="rounded-2xl border border-slate-200 bg-white/95 p-4 xl:col-span-8 dark:border-white/10 dark:bg-slate-800/50">
              <h3 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
                Last 10 Transactions
              </h3>
              <SimpleTableRoot className="mt-3">
                <table className="min-w-full text-sm">
                  <SimpleTableHeader>
                    <SimpleTableRow>
                      <SimpleTableHead className="px-4 py-3">
                        Name
                      </SimpleTableHead>
                      <SimpleTableHead className="px-4 py-3">
                        Paid By
                      </SimpleTableHead>
                      <SimpleTableHead className="px-4 py-3">
                        Amount
                      </SimpleTableHead>
                      <SimpleTableHead className="px-4 py-3">
                        Status
                      </SimpleTableHead>
                      <SimpleTableHead className="px-4 py-3">
                        Date
                      </SimpleTableHead>
                      <SimpleTableHead className="px-4 py-3">
                        Category
                      </SimpleTableHead>
                      <SimpleTableHead className="px-4 py-3">
                        Quick Link
                      </SimpleTableHead>
                    </SimpleTableRow>
                  </SimpleTableHeader>
                  <SimpleTableBody>
                    {adminDashboard.recentTransactions.length === 0 ? (
                      <SimpleTableRow>
                        <SimpleTableCell
                          className="px-4 py-4 text-slate-500 dark:text-slate-400"
                          colSpan={7}
                        >
                          No transactions available.
                        </SimpleTableCell>
                      </SimpleTableRow>
                    ) : (
                      adminDashboard.recentTransactions.map((transaction) => (
                        <SimpleTableRow key={transaction.transactionId}>
                          <SimpleTableCell className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                            {transaction.name}
                          </SimpleTableCell>
                          <SimpleTableCell className="px-4 py-3 text-slate-700 dark:text-slate-300">
                            {transaction.paidByUserName}
                          </SimpleTableCell>
                          <SimpleTableCell className="px-4 py-3 text-slate-700 dark:text-slate-300">
                            {formatCurrencyAmount(transaction.amount)}
                          </SimpleTableCell>
                          <SimpleTableCell className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                transaction.status === "completed"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                                  : transaction.status === "pending"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                                    : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {transaction.status}
                            </span>
                          </SimpleTableCell>
                          <SimpleTableCell className="px-4 py-3 text-slate-600 dark:text-slate-400">
                            {formatDate(transaction.createdAt)}
                          </SimpleTableCell>
                          <SimpleTableCell className="px-4 py-3 text-slate-700 dark:text-slate-300">
                            {transaction.categoryLabel}
                          </SimpleTableCell>
                          <SimpleTableCell className="px-4 py-3">
                            {isAdmin ? (
                              <Link
                                href={`/transactions/${transaction.transactionId}/edit`}
                                className="text-sm font-medium text-slate-700 underline underline-offset-2 dark:text-slate-300"
                              >
                                Open
                              </Link>
                            ) : (
                              <span className="text-sm text-slate-500 dark:text-slate-400">
                                View only
                              </span>
                            )}
                          </SimpleTableCell>
                        </SimpleTableRow>
                      ))
                    )}
                  </SimpleTableBody>
                </table>
              </SimpleTableRoot>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white/95 p-4 xl:col-span-4 dark:border-white/10 dark:bg-slate-800/50">
              <h3 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
                Category Breakdown
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Completed spending share by category.
              </p>
              {adminDashboard.categoryBreakdown.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/15 dark:bg-slate-800/60 dark:text-slate-400">
                  Not enough data to render chart yet.
                </p>
              ) : (
                <div className="mt-4">
                  <DonutChart
                    data={adminDashboard.categoryBreakdown}
                    label="Completed spending by category"
                  />
                  <div className="mt-4 space-y-2">
                    {adminDashboard.categoryBreakdown.map((item, index) => (
                      <div
                        key={item.categoryId}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-white/10"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{
                              backgroundColor:
                                CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                            }}
                          />
                          <span className="text-sm text-slate-800 dark:text-slate-200">
                            {item.label}
                          </span>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {formatCurrencyAmount(item.amount)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {PERCENT_FORMATTER.format(item.percentage)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white/95 p-4 dark:border-white/10 dark:bg-slate-800/50">
            <h3 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
              More Metrics
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Top spenders, frequent categories, and pending visibility.
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-700/30">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Top spenders
                </p>
                <div className="mt-3 space-y-2">
                  {adminDashboard.topSpenders.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No spending records.
                    </p>
                  ) : (
                    adminDashboard.topSpenders.map((item) => (
                      <div
                        key={item.userId}
                        className="flex items-center justify-between"
                      >
                        <p className="text-sm text-slate-800 dark:text-slate-200">
                          {item.name}
                        </p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrencyAmount(item.spent)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-700/30">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Frequent categories
                </p>
                <div className="mt-3 space-y-2">
                  {adminDashboard.frequentCategories.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No category activity.
                    </p>
                  ) : (
                    adminDashboard.frequentCategories.map((item) => (
                      <div
                        key={item.categoryId}
                        className="flex items-center justify-between"
                      >
                        <p className="text-sm text-slate-800 dark:text-slate-200">
                          {item.label}
                        </p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {item.count}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-700/30">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Pending watchlist
                </p>
                <p className="mt-3 font-heading text-4xl font-semibold text-amber-700 dark:text-amber-400">
                  {adminDashboard.summary.pendingTransactions}
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Pending grouped transactions that may require status updates.
                </p>
                <Link
                  href="/transactions?status=pending"
                  className="app-button-secondary mt-4 w-full"
                >
                  Review pending
                </Link>
              </article>
            </div>
          </section>

          <div className="mt-6 flex flex-wrap gap-3">
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
