import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { ConnectedProvidersCard } from "@/components/auth/ConnectedProvidersCard";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { PasswordManagementCard } from "@/components/auth/PasswordManagementCard";
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
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage your login methods and account access.
          </p>
        </div>
        <LogoutButton />
      </header>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Account</h2>
        <p className="mt-1 text-sm text-slate-600">Signed in as {user.email}</p>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Current balance
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {BALANCE_FORMATTER.format(user.current_balance)}
          </p>
        </div>
      </section>

      <div className="mt-6">
        <ConnectedProvidersCard />
      </div>

      <div className="mt-6">
        <PasswordManagementCard />
      </div>

      <p className="mt-6 text-sm">
        <Link href="/" className="text-slate-800 underline underline-offset-2">
          Back to home
        </Link>
      </p>
      {isAdmin ? (
        <div className="mt-2 space-y-1 text-sm">
          <p>
            <Link
              href="/settings/admin/users"
              className="text-slate-800 underline underline-offset-2"
            >
              Go to admin user management
            </Link>
          </p>
          <p>
            <Link
              href="/settings/admin/categories"
              className="text-slate-800 underline underline-offset-2"
            >
              Go to admin category management
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}
