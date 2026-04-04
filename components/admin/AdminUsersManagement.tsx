"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  SimpleTableBody,
  SimpleTableCell,
  SimpleTableHead,
  SimpleTableHeader,
  SimpleTableRoot,
  SimpleTableRow,
} from "@/components/ui/simple-table-core";
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

function getDownloadFileName(
  contentDisposition: string | null,
  fallbackName: string,
): string {
  if (!contentDisposition) {
    return fallbackName;
  }

  const match = contentDisposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? fallbackName;
}

export function AdminUsersManagement(): React.JSX.Element {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [createForm, setCreateForm] =
    useState<CreateFormState>(INITIAL_CREATE_FORM);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [resetTargetUserId, setResetTargetUserId] = useState<string | null>(
    null,
  );
  const [resetPassword, setResetPassword] = useState("");
  const [deleteTargetUserId, setDeleteTargetUserId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

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
      toast.error(getApiErrorMessage(payload, "Failed to create user."));
      return;
    }

    setCreateForm(INITIAL_CREATE_FORM);
    setUsers((previous) => [payload.data, ...previous]);
    setIsSubmitting(false);
    toast.success("User created successfully.");
  }

  async function onUpdateUser(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!editForm) {
      return;
    }

    setError(null);
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
      toast.error(getApiErrorMessage(payload, "Failed to update user."));
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
    toast.success("User updated successfully.");
  }

  async function onDeleteUser(userId: string): Promise<void> {
    const user = userById.get(userId);

    if (!user) {
      return;
    }

    if (user.policy === "admin") {
      toast.error("Admin users cannot be deleted from the app.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const response = await fetch(`/api/users/${userId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = (await response.json()) as ApiErrorResponse;
      setIsSubmitting(false);
      toast.error(getApiErrorMessage(payload, "Failed to delete user."));
      return;
    }

    setUsers((previous) =>
      previous.filter((userItem) => userItem.user_id !== userId),
    );
    setEditForm((previous) => (previous?.userId === userId ? null : previous));
    setResetTargetUserId((previous) => (previous === userId ? null : previous));
    setResetPassword("");
    setIsSubmitting(false);
    toast.success("User deleted successfully.");
  }

  async function onResetPassword(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!resetTargetUserId) {
      return;
    }

    setError(null);
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
      toast.error(getApiErrorMessage(payload, "Failed to reset password."));
      return;
    }

    setResetPassword("");
    setResetTargetUserId(null);
    setIsSubmitting(false);
    toast.success("Password reset successfully.");
  }

  async function onExportCsv(): Promise<void> {
    setIsExporting(true);

    const response = await fetch("/api/users/export", {
      method: "GET",
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type") ?? "";

      if (contentType.includes("application/json")) {
        const payload = (await response.json()) as ApiErrorResponse;
        toast.error(getApiErrorMessage(payload, "Failed to export users CSV."));
      } else {
        toast.error("Failed to export users CSV.");
      }

      setIsExporting(false);
      return;
    }

    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);

    link.href = downloadUrl;
    link.download = getDownloadFileName(
      response.headers.get("content-disposition"),
      `users-${today}.csv`,
    );
    link.click();

    URL.revokeObjectURL(downloadUrl);
    setIsExporting(false);
    toast.success("Users CSV downloaded.");
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-2">
        <h1 className="app-title">Admin User Management</h1>
        <p className="app-subtitle">
          Create, view, update, delete, and reset passwords for users.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/settings"
            className="font-medium text-slate-800 underline underline-offset-2"
          >
            Back to settings
          </Link>
          <Link
            href="/"
            className="font-medium text-slate-800 underline underline-offset-2"
          >
            Back to home
          </Link>
        </div>
      </header>

      <section className="app-surface">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Create User
        </h2>

        <form
          onSubmit={onCreateUser}
          className="mt-4 grid gap-3 md:grid-cols-2"
        >
          <div>
            <label
              htmlFor="create-name"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
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
              className="app-field"
            />
          </div>

          <div>
            <label
              htmlFor="create-email"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
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
              className="app-field"
            />
          </div>

          <div>
            <label
              htmlFor="create-password"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
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
              className="app-field"
            />
          </div>

          <div>
            <label
              htmlFor="create-policy"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
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
              className="app-field"
            >
              <option value="user">user</option>
              <option value="mod">mod</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="create-avatar"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
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
              className="app-field"
            />
          </div>

          <div>
            <label
              htmlFor="create-remarks"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
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
              className="app-field"
            />
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Create user"}
            </Button>
          </div>
        </form>
      </section>

      <section className="app-surface">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            All Users
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => void onExportCsv()}
              variant="secondary"
              size="sm"
              disabled={isExporting}
            >
              {isExporting ? "Exporting..." : "Download CSV"}
            </Button>
            <Button
              onClick={() => void loadUsers()}
              variant="secondary"
              size="sm"
            >
              Refresh
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="mt-4 text-sm text-slate-600">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No users found.</p>
        ) : (
          <SimpleTableRoot className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <SimpleTableHeader>
                <SimpleTableRow className="border-b border-slate-200 dark:border-white/10">
                  <SimpleTableHead className="px-2">Name</SimpleTableHead>
                  <SimpleTableHead className="px-2">Email</SimpleTableHead>
                  <SimpleTableHead className="px-2">Policy</SimpleTableHead>
                  <SimpleTableHead className="px-2">Balance</SimpleTableHead>
                  <SimpleTableHead className="px-2">Created</SimpleTableHead>
                  <SimpleTableHead className="px-2">Actions</SimpleTableHead>
                </SimpleTableRow>
              </SimpleTableHeader>
              <SimpleTableBody>
                {users.map((user) => (
                  <SimpleTableRow
                    key={user.user_id}
                    className="border-b border-slate-100 dark:border-white/8"
                  >
                    <SimpleTableCell className="px-2 text-slate-900 dark:text-slate-100">
                      {user.name}
                    </SimpleTableCell>
                    <SimpleTableCell className="px-2 text-slate-700 dark:text-slate-300">
                      {user.email}
                    </SimpleTableCell>
                    <SimpleTableCell className="px-2 text-slate-700 dark:text-slate-300">
                      {user.policy}
                    </SimpleTableCell>
                    <SimpleTableCell className="px-2 text-slate-700 dark:text-slate-300">
                      {user.current_balance}
                    </SimpleTableCell>
                    <SimpleTableCell className="px-2 text-slate-700 dark:text-slate-300">
                      {new Date(user.created_at).toLocaleDateString()}
                    </SimpleTableCell>
                    <SimpleTableCell className="px-2">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => startEdit(user)}
                          variant="secondary"
                          size="sm"
                          className="text-xs"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => {
                            setError(null);
                            setResetTargetUserId(user.user_id);
                            setResetPassword("");
                          }}
                          variant="info"
                          size="sm"
                          className="text-xs"
                        >
                          Reset password
                        </Button>
                        {user.policy !== "admin" ? (
                          <Button
                            onClick={() => setDeleteTargetUserId(user.user_id)}
                            variant="danger"
                            size="sm"
                            className="text-xs"
                          >
                            Delete
                          </Button>
                        ) : (
                          <span className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                            Protected admin
                          </span>
                        )}
                      </div>
                    </SimpleTableCell>
                  </SimpleTableRow>
                ))}
              </SimpleTableBody>
            </table>
          </SimpleTableRoot>
        )}
      </section>

      {editForm ? (
        <section className="app-surface">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Edit User
          </h2>
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
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
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
                className="app-field"
              />
            </div>

            <div>
              <label
                htmlFor="edit-email"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
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
                className="app-field"
              />
            </div>

            <div>
              <label
                htmlFor="edit-policy"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
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
                className="app-field"
              >
                <option value="user">user</option>
                <option value="mod">mod</option>
                <option value="admin">admin</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="edit-avatar"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
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
                className="app-field"
              />
            </div>

            <div>
              <label
                htmlFor="edit-remarks"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
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
                className="app-field"
              />
            </div>

            <div>
              <label
                htmlFor="edit-new-password"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
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
                className="app-field"
              />
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save changes"}
              </Button>
              <Button onClick={() => setEditForm(null)} variant="secondary">
                Cancel
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {resetTargetUserId ? (
        <section className="app-surface">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
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
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
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
                className="app-field"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Reset password"}
              </Button>
              <Button
                onClick={() => {
                  setResetTargetUserId(null);
                  setResetPassword("");
                }}
                variant="secondary"
              >
                Cancel
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {error ? <p className="app-alert-error">{error}</p> : null}

      <ConfirmDialog
        open={deleteTargetUserId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTargetUserId(null);
          }
        }}
        title="Delete user?"
        description={
          deleteTargetUserId
            ? `This will soft-delete ${userById.get(deleteTargetUserId)?.email ?? "the selected user"}.`
            : "This will soft-delete the selected user."
        }
        confirmLabel="Delete"
        isPending={isSubmitting}
        isDestructive
        onConfirm={async () => {
          if (!deleteTargetUserId) {
            return;
          }

          const targetId = deleteTargetUserId;
          setDeleteTargetUserId(null);
          await onDeleteUser(targetId);
        }}
      />
    </div>
  );
}
