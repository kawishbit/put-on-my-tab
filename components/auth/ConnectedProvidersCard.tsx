"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

type ProviderConnectionState = {
  credentials: boolean;
  google: boolean;
  github: boolean;
};

const DEFAULT_PROVIDER_STATE: ProviderConnectionState = {
  credentials: false,
  google: false,
  github: false,
};

export function ConnectedProvidersCard(): React.JSX.Element {
  const router = useRouter();

  const [providers, setProviders] = useState<ProviderConnectionState>(
    DEFAULT_PROVIDER_STATE,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProviders = useCallback(async (): Promise<void> => {
    setError(null);
    setIsLoading(true);

    const response = await fetch("/api/auth/connected-providers", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const payload = (await response.json()) as {
      data?: ProviderConnectionState;
      error?: { message?: string };
    };

    if (!response.ok || !payload.data) {
      setIsLoading(false);
      setError(payload.error?.message ?? "Failed to load connected providers.");
      return;
    }

    setProviders(payload.data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  async function handleDisconnect(
    providerType: "google" | "github",
  ): Promise<void> {
    setError(null);
    setIsUpdating(true);

    const response = await fetch("/api/auth/connected-providers", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ providerType }),
    });

    const payload = (await response.json()) as {
      error?: { message?: string };
    };

    if (!response.ok) {
      setIsUpdating(false);
      setError(payload.error?.message ?? "Failed to disconnect provider.");
      return;
    }

    await loadProviders();
    setIsUpdating(false);
    router.refresh();
  }

  return (
    <section className="app-surface">
      <h2 className="font-heading text-xl font-semibold text-slate-900">
        Connected Accounts
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Connect Google and GitHub so you can sign in without typing your
        password.
      </p>

      {error ? <p className="mt-4 app-alert-error">{error}</p> : null}

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-600">Loading providers...</p>
      ) : (
        <div className="mt-5 space-y-3">
          <ProviderRow
            label="Credentials"
            connected={providers.credentials}
            actionLabel={null}
            onAction={null}
            disabled
          />
          <ProviderRow
            label="Google"
            connected={providers.google}
            actionLabel={providers.google ? "Disconnect" : "Connect"}
            onAction={() => {
              if (providers.google) {
                void handleDisconnect("google");
                return;
              }

              void signIn("google", { callbackUrl: "/settings" });
            }}
            disabled={isUpdating}
          />
          <ProviderRow
            label="GitHub"
            connected={providers.github}
            actionLabel={providers.github ? "Disconnect" : "Connect"}
            onAction={() => {
              if (providers.github) {
                void handleDisconnect("github");
                return;
              }

              void signIn("github", { callbackUrl: "/settings" });
            }}
            disabled={isUpdating}
          />
        </div>
      )}
    </section>
  );
}

interface ProviderRowProps {
  label: string;
  connected: boolean;
  actionLabel: string | null;
  onAction: (() => void) | null;
  disabled: boolean;
}

function ProviderRow({
  label,
  connected,
  actionLabel,
  onAction,
  disabled,
}: ProviderRowProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-600">
          {connected ? "Connected" : "Not connected"}
        </p>
      </div>

      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          disabled={disabled}
          className="app-button-secondary px-3 py-1.5 text-sm"
        >
          {actionLabel}
        </button>
      ) : (
        <span className="text-xs text-slate-500">Required</span>
      )}
    </div>
  );
}
