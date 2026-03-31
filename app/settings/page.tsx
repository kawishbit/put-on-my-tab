import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { ConnectedProvidersCard } from "@/components/auth/ConnectedProvidersCard";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { authOptions } from "@/lib/auth/options";

export default async function SettingsPage(): Promise<React.JSX.Element> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Fsettings");
  }

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

      <div className="mt-6">
        <ConnectedProvidersCard />
      </div>

      <p className="mt-6 text-sm">
        <Link href="/" className="text-slate-800 underline underline-offset-2">
          Back to home
        </Link>
      </p>
    </div>
  );
}
