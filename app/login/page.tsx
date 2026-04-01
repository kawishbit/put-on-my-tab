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
  const [callbackUrl, setCallbackUrl] = useState("/dashboard");
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

      setCallbackUrl(requestedCallbackUrl || "/dashboard");
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
    <div className="w-full max-w-lg">
      <section className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-8 shadow-2xl shadow-slate-300/40 backdrop-blur">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-200/40 blur-2xl" />

        <h1 className="font-heading text-3xl font-semibold text-slate-900">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-slate-600">
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
            className="app-field"
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
            className="app-field"
            placeholder="••••••••"
          />

          {error ? <p className="app-alert-error">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="app-button-primary w-full"
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
                className="app-button-secondary w-full"
              >
                Sign in with Google
              </button>
            ) : null}

            {oauthAvailability.github ? (
              <button
                type="button"
                onClick={() => void signIn("github", { callbackUrl })}
                className="app-button-secondary w-full"
              >
                Sign in with GitHub
              </button>
            ) : null}
          </div>
        ) : null}

        <p className="mt-5 text-sm text-slate-600">
          Need access? Contact your admin to create your account.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          <Link
            href="/"
            className="font-medium text-slate-800 underline underline-offset-2"
          >
            Back to home
          </Link>
        </p>
      </section>
    </div>
  );
}
