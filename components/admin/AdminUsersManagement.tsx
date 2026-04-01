"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { PublicUser, UserPolicy } from "@/types/database";

type ApiSuccess<TData> = {
  data: TData;
};

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

type CreateFormState = {
  name: string;
  email: string;
  password: string;
  policy: UserPolicy;
  avatar: string;
  remarks: string;
};

type EditFormState = {
  userId: string;
  name: string;
  email: string;
  policy: UserPolicy;
  avatar: string;
  remarks: string;
  newPassword: string;
};

const INITIAL_CREATE_FORM: CreateFormState = {
  name: "",
  email: "",
  password: "",
  policy: "user",
  avatar: "",
  remarks: "",
};

function getApiErrorMessage(payload: unknown, fallback: string): string {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }

  return fallback;
}

function toNullableString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function AdminUsersManagement(): React.JSX.Element {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createForm, setCreateForm] =
    useState<CreateFormState>(INITIAL_CREATE_FORM);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [resetTargetUserId, setResetTargetUserId] = useState<string | null>(
    null,
  );
  const [resetPassword, setResetPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const userById = useMemo(() => {
    return new Map(users.map((user) => [user.user_id, user]));
  }, [users]);

  const loadUsers = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    const response = await fetch("/api/users", {
      method: "GET",
      cache: "no-store",
    });

    const payload = (await response.json()) as
      | ApiSuccess<PublicUser[]>
      | ApiErrorResponse;

    if (!response.ok || !("data" in payload)) {
      setIsLoading(false);
      setError(getApiErrorMessage(payload, "Failed to load users."));
      return;
    }

    setUsers(payload.data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function startEdit(user: PublicUser): void {
    setError(null);
    setSuccess(null);
    setEditForm({
      userId: user.user_id,
      name: user.name,
      email: user.email,
      policy: user.policy,
      avatar: user.avatar ?? "",
      remarks: user.remarks ?? "",
      newPassword: "",
    });
    setResetTargetUserId(null);
    setResetPassword("");
  }

  async function onCreateUser(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const response = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        policy: createForm.policy,
        avatar: toNullableString(createForm.avatar),
        remarks: toNullableString(createForm.remarks),
      }),
    });

    const payload = (await response.json()) as
      | ApiSuccess<PublicUser>
      | ApiErrorResponse;

    if (!response.ok || !("data" in payload)) {
      setIsSubmitting(false);
      setError(getApiErrorMessage(payload, "Failed to create user."));
      return;
    }

    setCreateForm(INITIAL_CREATE_FORM);
    setUsers((previous) => [payload.data, ...previous]);
    setIsSubmitting(false);
    setSuccess("User created successfully.");
  }

  async function onUpdateUser(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!editForm) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const response = await fetch(`/api/users/${editForm.userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: editForm.name,
        email: editForm.email,
        policy: editForm.policy,
        avatar: toNullableString(editForm.avatar),
        remarks: toNullableString(editForm.remarks),
        password:
          editForm.newPassword.trim().length > 0
            ? editForm.newPassword
            : undefined,
      }),
    });

    const payload = (await response.json()) as
      | ApiSuccess<PublicUser>
      | ApiErrorResponse;

    if (!response.ok || !("data" in payload)) {
      setIsSubmitting(false);
      setError(getApiErrorMessage(payload, "Failed to update user."));
      return;
    }

    setUsers((previous) =>
      previous.map((user) =>
        user.user_id === payload.data.user_id ? payload.data : user,
      ),
    );
    setEditForm((previous) =>
      previous
        ? {
            ...previous,
            newPassword: "",
          }
        : null,
    );
    setIsSubmitting(false);
    setSuccess("User updated successfully.");
  }

  async function onDeleteUser(userId: string): Promise<void> {
    const user = userById.get(userId);

    if (!user) {
      return;
    }

    const confirmed = window.confirm(
      `Delete user ${user.email}? This performs a soft delete.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const response = await fetch(`/api/users/${userId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = (await response.json()) as ApiErrorResponse;
      setIsSubmitting(false);
      setError(getApiErrorMessage(payload, "Failed to delete user."));
      return;
    }

    setUsers((previous) =>
      previous.filter((userItem) => userItem.user_id !== userId),
    );
    setEditForm((previous) => (previous?.userId === userId ? null : previous));
    setResetTargetUserId((previous) => (previous === userId ? null : previous));
    setResetPassword("");
    setIsSubmitting(false);
    setSuccess("User deleted successfully.");
  }

  async function onResetPassword(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!resetTargetUserId) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const response = await fetch(
      `/api/users/${resetTargetUserId}/reset-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newPassword: resetPassword,
        }),
      },
    );

    const payload = (await response.json()) as
      | ApiSuccess<{ success: boolean }>
      | ApiErrorResponse;

    if (!response.ok || !("data" in payload)) {
      setIsSubmitting(false);
      setError(getApiErrorMessage(payload, "Failed to reset password."));
      return;
    }

    setResetPassword("");
    setResetTargetUserId(null);
    setIsSubmitting(false);
    setSuccess("Password reset successfully.");
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">
          Admin User Management
        </h1>
        <p className="text-sm text-slate-600">
          Create, view, update, delete, and reset passwords for users.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/settings"
            className="text-slate-800 underline underline-offset-2"
          >
            Back to settings
          </Link>
          <Link
            href="/"
            className="text-slate-800 underline underline-offset-2"
          >
            Back to home
          </Link>
        </div>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Create User</h2>

        <form
          onSubmit={onCreateUser}
          className="mt-4 grid gap-3 md:grid-cols-2"
        >
          <div>
            <label
              htmlFor="create-name"
              className="text-sm font-medium text-slate-700"
            >
              Name
            </label>
            <input
              id="create-name"
              required
              value={createForm.name}
              onChange={(event) =>
                setCreateForm((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="create-email"
              className="text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="create-email"
              type="email"
              required
              value={createForm.email}
              onChange={(event) =>
                setCreateForm((previous) => ({
                  ...previous,
                  email: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="create-password"
              className="text-sm font-medium text-slate-700"
            >
              Temporary Password
            </label>
            <input
              id="create-password"
              type="password"
              required
              minLength={12}
              maxLength={72}
              value={createForm.password}
              onChange={(event) =>
                setCreateForm((previous) => ({
                  ...previous,
                  password: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="create-policy"
              className="text-sm font-medium text-slate-700"
            >
              Policy
            </label>
            <select
              id="create-policy"
              value={createForm.policy}
              onChange={(event) =>
                setCreateForm((previous) => ({
                  ...previous,
                  policy: event.target.value as UserPolicy,
                }))
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
            >
              <option value="user">user</option>
              <option value="mod">mod</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="create-avatar"
              className="text-sm font-medium text-slate-700"
            >
              Avatar URL (optional)
            </label>
            <input
              id="create-avatar"
              value={createForm.avatar}
              onChange={(event) =>
                setCreateForm((previous) => ({
                  ...previous,
                  avatar: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="create-remarks"
              className="text-sm font-medium text-slate-700"
            >
              Remarks (optional)
            </label>
            <input
              id="create-remarks"
              value={createForm.remarks}
              onChange={(event) =>
                setCreateForm((previous) => ({
                  ...previous,
                  remarks: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Create user"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">All Users</h2>
          <button
            type="button"
            onClick={() => void loadUsers()}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Refresh
          </button>
        </div>

        {isLoading ? (
          <p className="mt-4 text-sm text-slate-600">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No users found.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="px-2 py-2 font-medium">Name</th>
                  <th className="px-2 py-2 font-medium">Email</th>
                  <th className="px-2 py-2 font-medium">Policy</th>
                  <th className="px-2 py-2 font-medium">Balance</th>
                  <th className="px-2 py-2 font-medium">Created</th>
                  <th className="px-2 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.user_id}
                    className="border-b border-slate-100 align-top"
                  >
                    <td className="px-2 py-2 text-slate-900">{user.name}</td>
                    <td className="px-2 py-2 text-slate-700">{user.email}</td>
                    <td className="px-2 py-2 text-slate-700">{user.policy}</td>
                    <td className="px-2 py-2 text-slate-700">
                      {user.current_balance}
                    </td>
                    <td className="px-2 py-2 text-slate-700">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(user)}
                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            setSuccess(null);
                            setResetTargetUserId(user.user_id);
                            setResetPassword("");
                          }}
                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Reset password
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDeleteUser(user.user_id)}
                          className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editForm ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Edit User</h2>
          <p className="mt-1 text-sm text-slate-600">
            Editing {userById.get(editForm.userId)?.email}
          </p>

          <form
            onSubmit={onUpdateUser}
            className="mt-4 grid gap-3 md:grid-cols-2"
          >
            <div>
              <label
                htmlFor="edit-name"
                className="text-sm font-medium text-slate-700"
              >
                Name
              </label>
              <input
                id="edit-name"
                required
                value={editForm.name}
                onChange={(event) =>
                  setEditForm((previous) =>
                    previous
                      ? { ...previous, name: event.target.value }
                      : previous,
                  )
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="edit-email"
                className="text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <input
                id="edit-email"
                type="email"
                required
                value={editForm.email}
                onChange={(event) =>
                  setEditForm((previous) =>
                    previous
                      ? { ...previous, email: event.target.value }
                      : previous,
                  )
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="edit-policy"
                className="text-sm font-medium text-slate-700"
              >
                Policy
              </label>
              <select
                id="edit-policy"
                value={editForm.policy}
                onChange={(event) =>
                  setEditForm((previous) =>
                    previous
                      ? {
                          ...previous,
                          policy: event.target.value as UserPolicy,
                        }
                      : previous,
                  )
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
              >
                <option value="user">user</option>
                <option value="mod">mod</option>
                <option value="admin">admin</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="edit-avatar"
                className="text-sm font-medium text-slate-700"
              >
                Avatar URL (optional)
              </label>
              <input
                id="edit-avatar"
                value={editForm.avatar}
                onChange={(event) =>
                  setEditForm((previous) =>
                    previous
                      ? { ...previous, avatar: event.target.value }
                      : previous,
                  )
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="edit-remarks"
                className="text-sm font-medium text-slate-700"
              >
                Remarks (optional)
              </label>
              <input
                id="edit-remarks"
                value={editForm.remarks}
                onChange={(event) =>
                  setEditForm((previous) =>
                    previous
                      ? { ...previous, remarks: event.target.value }
                      : previous,
                  )
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="edit-new-password"
                className="text-sm font-medium text-slate-700"
              >
                New password (optional)
              </label>
              <input
                id="edit-new-password"
                type="password"
                minLength={12}
                maxLength={72}
                value={editForm.newPassword}
                onChange={(event) =>
                  setEditForm((previous) =>
                    previous
                      ? {
                          ...previous,
                          newPassword: event.target.value,
                        }
                      : previous,
                  )
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => setEditForm(null)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {resetTargetUserId ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Reset User Password
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Resetting password for {userById.get(resetTargetUserId)?.email}
          </p>

          <form
            onSubmit={onResetPassword}
            className="mt-4 flex flex-col gap-3 md:max-w-md"
          >
            <div>
              <label
                htmlFor="reset-password"
                className="text-sm font-medium text-slate-700"
              >
                New password
              </label>
              <input
                id="reset-password"
                type="password"
                required
                minLength={12}
                maxLength={72}
                value={resetPassword}
                onChange={(event) => setResetPassword(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Updating..." : "Reset password"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetTargetUserId(null);
                  setResetPassword("");
                }}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-green-700">{success}</p> : null}
    </div>
  );
}
