"use client";

import { useState } from "react";

type FormState = {
  isSubmitting: boolean;
  error: string | null;
  success: string | null;
};

const INITIAL_FORM_STATE: FormState = {
  isSubmitting: false,
  error: null,
  success: null,
};

export function PasswordManagementCard(): React.JSX.Element {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changeState, setChangeState] = useState<FormState>(INITIAL_FORM_STATE);

  async function onChangeOwnPassword(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setChangeState(INITIAL_FORM_STATE);

    if (newPassword !== confirmNewPassword) {
      setChangeState({
        isSubmitting: false,
        error: "New password and confirmation do not match.",
        success: null,
      });
      return;
    }

    setChangeState({ isSubmitting: true, error: null, success: null });

    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });

    const payload = (await response.json()) as {
      error?: { message?: string };
    };

    if (!response.ok) {
      setChangeState({
        isSubmitting: false,
        error: payload.error?.message ?? "Failed to update password.",
        success: null,
      });
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setChangeState({
      isSubmitting: false,
      error: null,
      success: "Your password was updated successfully.",
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Password</h2>
      <p className="mt-1 text-sm text-slate-600">
        Use a strong password with at least 12 characters, uppercase/lowercase
        letters, numbers, and symbols.
      </p>

      <form onSubmit={onChangeOwnPassword} className="mt-5 space-y-3">
        <div>
          <label
            htmlFor="currentPassword"
            className="text-sm font-medium text-slate-700"
          >
            Current password
          </label>
          <input
            id="currentPassword"
            type="password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-slate-400 placeholder:text-slate-400 focus:ring-2"
          />
        </div>

        <div>
          <label
            htmlFor="newPassword"
            className="text-sm font-medium text-slate-700"
          >
            New password
          </label>
          <input
            id="newPassword"
            type="password"
            required
            minLength={12}
            maxLength={72}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-slate-400 placeholder:text-slate-400 focus:ring-2"
          />
        </div>

        <div>
          <label
            htmlFor="confirmNewPassword"
            className="text-sm font-medium text-slate-700"
          >
            Confirm new password
          </label>
          <input
            id="confirmNewPassword"
            type="password"
            required
            minLength={12}
            maxLength={72}
            value={confirmNewPassword}
            onChange={(event) => setConfirmNewPassword(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-slate-400 placeholder:text-slate-400 focus:ring-2"
          />
        </div>

        {changeState.error ? (
          <p className="text-sm text-red-600">{changeState.error}</p>
        ) : null}
        {changeState.success ? (
          <p className="text-sm text-green-700">{changeState.success}</p>
        ) : null}

        <button
          type="submit"
          disabled={changeState.isSubmitting}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {changeState.isSubmitting ? "Updating..." : "Change password"}
        </button>
      </form>
    </section>
  );
}
