import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { ConnectedProvidersCard } from "@/components/auth/ConnectedProvidersCard";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { PasswordManagementCard } from "@/components/auth/PasswordManagementCard";
import { SettingsPageTemplate } from "@/components/layout/PageTemplates";
import { authOptions } from "@/lib/auth/options";
import { getUserById } from "@/lib/services/usersService";

const BALANCE_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default async function SettingsPage(): Promise<React.JSX.Element> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Fsettings");
  }

  const user = await getUserById(session.user.id);
  const isAdmin = session.user.policy === "admin";

  return (
    <SettingsPageTemplate
      title="Settings"
      subtitle="Manage your login methods and account access."
      actions={<LogoutButton />}
    >
      <section className="app-surface">
        <h2 className="font-heading text-xl font-semibold text-slate-900">
          Account
        </h2>
        <p className="mt-1 text-sm text-slate-600">Signed in as {user.email}</p>

        <div className="mt-4 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Current balance
          </p>
          <p className="mt-1 font-heading text-3xl font-semibold text-slate-900">
            {BALANCE_FORMATTER.format(user.current_balance)}
          </p>
        </div>
      </section>

      <div>
        <ConnectedProvidersCard />
      </div>

      <div>
        <PasswordManagementCard />
      </div>

      <p className="text-sm">
        <Link
          href="/"
          className="font-medium text-slate-800 underline underline-offset-2"
        >
          Back to home
        </Link>
      </p>
      {isAdmin ? (
        <div className="app-surface space-y-2">
          <h3 className="font-heading text-lg font-semibold text-slate-900">
            Admin tools
          </h3>
          <p className="text-sm text-slate-600">
            Manage users and categories from one place.
          </p>
          <p className="text-sm">
            <Link
              href="/settings/admin/users"
              className="font-medium text-slate-800 underline underline-offset-2"
            >
              Go to admin user management
            </Link>
          </p>
          <p className="text-sm">
            <Link
              href="/settings/admin/categories"
              className="font-medium text-slate-800 underline underline-offset-2"
            >
              Go to admin category management
            </Link>
          </p>
        </div>
      ) : null}
    </SettingsPageTemplate>
  );
}
