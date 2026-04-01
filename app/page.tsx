import Link from "next/link";
import { getServerSession } from "next-auth";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { authOptions } from "@/lib/auth/options";

export default async function Home(): Promise<React.JSX.Element> {
  const session = await getServerSession(authOptions);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-4xl items-center justify-center px-4">
      <main className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">
              Put On My Tab
            </h1>
            <p className="mt-2 text-slate-600">
              Credentials authentication is now enabled for Phase 2.1.
            </p>
          </div>
          {session ? <LogoutButton /> : null}
        </div>

        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
          {session ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-700">
                Signed in as{" "}
                <span className="font-medium">{session.user.email}</span>
              </p>
              <p className="text-sm text-slate-700">
                Policy:{" "}
                <span className="font-medium">{session.user.policy}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/settings"
                  className="inline-flex rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Manage connected accounts
                </Link>
                {session.user.policy === "admin" ? (
                  <Link
                    href="/settings/admin/users"
                    className="inline-flex rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    Manage users
                  </Link>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">You are not signed in.</p>
              <Link
                href="/login"
                className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Go to login
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
