import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { DashboardPageTemplate } from "@/components/layout/PageTemplates";
import { authOptions } from "@/lib/auth/options";
import { getAdminDashboardData } from "@/lib/services/adminDashboardService";

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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

function formatMonthlyChange(value: number | null): string {
  if (value === null) {
    return "n/a";
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${PERCENT_FORMATTER.format(value)}%`;
}

function DonutChart({
  data,
}: {
  data: Array<{ label: string; amount: number; percentage: number }>;
}): React.JSX.Element {
  const size = 240;
  const strokeWidth = 40;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulated = 0;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Donut chart of completed spending by category"
      className="mx-auto h-56 w-56"
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="transparent"
        stroke="#e2e8f0"
        strokeWidth={strokeWidth}
      />
      {data.map((item, index) => {
        const ratio = item.percentage / 100;
        const segmentLength = circumference * ratio;
        const segmentOffset = circumference * (1 - accumulated);
        const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];

        accumulated += ratio;

        return (
          <circle
            key={`${item.label}-${item.amount}`}
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
            strokeDashoffset={segmentOffset}
            transform={`rotate(-90 ${center} ${center})`}
            strokeLinecap="butt"
          />
        );
      })}
      <circle cx={center} cy={center} r={42} fill="white" />
      <text
        x={center}
        y={center - 4}
        textAnchor="middle"
        className="fill-slate-900 text-[14px] font-semibold"
      >
        Categories
      </text>
      <text
        x={center}
        y={center + 16}
        textAnchor="middle"
        className="fill-slate-600 text-[12px]"
      >
        Completed
      </text>
    </svg>
  );
}

export default async function AdminDashboardPage(): Promise<React.JSX.Element> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Fadmin%2Fdashboard");
  }

  if (session.user.policy !== "admin") {
    redirect("/dashboard");
  }

  const dashboard = await getAdminDashboardData();

  return (
    <DashboardPageTemplate
      title="Admin Dashboard"
      subtitle="System-wide balances, spending trends, and transaction health."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/transactions" className="app-button-secondary">
            All Transactions
          </Link>
          <Link href="/settings/admin/users" className="app-button-secondary">
            Manage Users
          </Link>
        </div>
      }
    >
      <section className="app-surface relative overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-slate-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-teal-100/70 blur-3xl" />
        <div className="relative grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Total transactions
            </p>
            <p className="mt-2 font-heading text-3xl font-semibold text-slate-900">
              {dashboard.summary.totalTransactions}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Total system balance
            </p>
            <p className="mt-2 font-heading text-3xl font-semibold text-slate-900">
              {CURRENCY_FORMATTER.format(dashboard.summary.totalSystemBalance)}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Active users
            </p>
            <p className="mt-2 font-heading text-3xl font-semibold text-slate-900">
              {dashboard.summary.activeUsers}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Pending transactions
            </p>
            <p className="mt-2 font-heading text-3xl font-semibold text-amber-700">
              {dashboard.summary.pendingTransactions}
            </p>
          </article>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="app-surface">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl font-semibold text-slate-900">
                Balance Overview
              </h2>
              <p className="app-subtitle">
                Live balances for all active users.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {dashboard.balances.map((item) => (
              <article
                key={item.userId}
                className="rounded-xl border border-slate-200 bg-white/95 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-900">{item.name}</p>
                  <p
                    className={`font-semibold ${
                      item.balance >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {CURRENCY_FORMATTER.format(item.balance)}
                  </p>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
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

        <section className="app-surface">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl font-semibold text-slate-900">
                Monthly Expenditure
              </h2>
              <p className="app-subtitle">Completed spending by month.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                {dashboard.monthlyComparison.currentMonthLabel} vs{" "}
                {dashboard.monthlyComparison.previousMonthLabel}
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {formatMonthlyChange(dashboard.monthlyComparison.percentChange)}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {dashboard.monthlyExpenditure.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                No completed transactions yet.
              </p>
            ) : (
              dashboard.monthlyExpenditure.map((point) => (
                <article key={point.monthKey}>
                  <div className="mb-1 flex items-center justify-between text-sm text-slate-700">
                    <p className="font-medium">{point.monthLabel}</p>
                    <p>{CURRENCY_FORMATTER.format(point.amount)}</p>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-slate-700"
                      style={{
                        width: `${Math.min(
                          (point.amount /
                            Math.max(
                              ...dashboard.monthlyExpenditure.map(
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

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="app-surface">
          <h2 className="font-heading text-xl font-semibold text-slate-900">
            Last 10 Transactions
          </h2>
          <p className="app-subtitle">
            Most recent grouped transactions (deposit records).
          </p>
          <div className="app-table-shell mt-4">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-600">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Paid By</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Quick Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {dashboard.recentTransactions.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={7}>
                      No transactions available.
                    </td>
                  </tr>
                ) : (
                  dashboard.recentTransactions.map((transaction) => (
                    <tr key={transaction.transactionId}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {transaction.name}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {transaction.paidByUserName}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {CURRENCY_FORMATTER.format(transaction.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            transaction.status === "completed"
                              ? "bg-emerald-100 text-emerald-700"
                              : transaction.status === "pending"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {transaction.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(transaction.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {transaction.categoryLabel}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/transactions/${transaction.transactionId}/edit`}
                          className="text-sm font-medium text-slate-700 underline underline-offset-2"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="app-surface">
          <h2 className="font-heading text-xl font-semibold text-slate-900">
            Category Breakdown
          </h2>
          <p className="app-subtitle">Completed spending share by category.</p>
          {dashboard.categoryBreakdown.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Not enough data to render chart yet.
            </p>
          ) : (
            <div className="mt-4">
              <DonutChart data={dashboard.categoryBreakdown} />
              <div className="mt-4 space-y-2">
                {dashboard.categoryBreakdown.map((item, index) => (
                  <div
                    key={item.categoryId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                        }}
                      />
                      <span className="text-sm text-slate-800">
                        {item.label}
                      </span>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium text-slate-900">
                        {CURRENCY_FORMATTER.format(item.amount)}
                      </p>
                      <p className="text-xs text-slate-500">
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

      <section className="app-surface">
        <h2 className="font-heading text-xl font-semibold text-slate-900">
          More Metrics
        </h2>
        <p className="app-subtitle">
          Top spenders, frequent categories, and pending visibility.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Top spenders
            </p>
            <div className="mt-3 space-y-2">
              {dashboard.topSpenders.length === 0 ? (
                <p className="text-sm text-slate-500">No spending records.</p>
              ) : (
                dashboard.topSpenders.map((item) => (
                  <div
                    key={item.userId}
                    className="flex items-center justify-between"
                  >
                    <p className="text-sm text-slate-800">{item.name}</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {CURRENCY_FORMATTER.format(item.spent)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Frequent categories
            </p>
            <div className="mt-3 space-y-2">
              {dashboard.frequentCategories.length === 0 ? (
                <p className="text-sm text-slate-500">No category activity.</p>
              ) : (
                dashboard.frequentCategories.map((item) => (
                  <div
                    key={item.categoryId}
                    className="flex items-center justify-between"
                  >
                    <p className="text-sm text-slate-800">{item.label}</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {item.count}
                    </p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Pending watchlist
            </p>
            <p className="mt-3 font-heading text-4xl font-semibold text-amber-700">
              {dashboard.summary.pendingTransactions}
            </p>
            <p className="mt-2 text-sm text-slate-600">
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
    </DashboardPageTemplate>
  );
}
