"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProviders, signIn } from "next-auth/react";
import { type FormEvent, useEffect, useState } from "react";

type OauthAvailability = {
  google: boolean;
  github: boolean;
};

const DEFAULT_OAUTH_AVAILABILITY: OauthAvailability = {
  google: false,
  github: false,
};

function mapNextAuthErrorToMessage(errorCode: string | null): string | null {
  if (errorCode === "AccessDenied") {
    return "Sign-in failed. Your provider account is not linked to an active user.";
  }

  return null;
}

export default function LoginPage(): React.JSX.Element {
  const router = useRouter();
  const [callbackUrl, setCallbackUrl] = useState("/");
  const [oauthAvailability, setOauthAvailability] = useState<OauthAvailability>(
    DEFAULT_OAUTH_AVAILABILITY,
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadPageState(): Promise<void> {
      const currentSearchParams = new URLSearchParams(window.location.search);
      const requestedCallbackUrl = currentSearchParams.get("callbackUrl");
      const authError = currentSearchParams.get("error");
      const resolvedProviders = await getProviders();

      setCallbackUrl(requestedCallbackUrl || "/");
      setError(mapNextAuthErrorToMessage(authError));
      setOauthAvailability({
        google: Boolean(resolvedProviders?.google),
        github: Boolean(resolvedProviders?.github),
      });
    }

    void loadPageState();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: false,
    });

    setIsSubmitting(false);

    if (!result || result.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push(result.url ?? callbackUrl);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Login</h1>
        <p className="mt-1 text-sm text-slate-600">
          Sign in with your email and password provided by an admin.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-700"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-slate-400 placeholder:text-slate-400 focus:ring-2"
            placeholder="you@example.com"
          />

          <label
            htmlFor="password"
            className="block text-sm font-medium text-slate-700"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-slate-400 placeholder:text-slate-400 focus:ring-2"
            placeholder="••••••••"
          />

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {oauthAvailability.google || oauthAvailability.github ? (
          <div className="mt-5 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Or continue with
            </p>

            {oauthAvailability.google ? (
              <button
                type="button"
                onClick={() => void signIn("google", { callbackUrl })}
                className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
              >
                Sign in with Google
              </button>
            ) : null}

            {oauthAvailability.github ? (
              <button
                type="button"
                onClick={() => void signIn("github", { callbackUrl })}
                className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
              >
                Sign in with GitHub
              </button>
            ) : null}
          </div>
        ) : null}

        <p className="mt-5 text-sm text-slate-600">
          Need access? Contact your admin to create your account.
        </p>
        <p className="mt-2 text-sm">
          <Link
            href="/"
            className="text-slate-800 underline underline-offset-2"
          >
            Back to home
          </Link>
        </p>
      </section>
    </div>
  );
}
