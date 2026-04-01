"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { TransactionCategory } from "@/types/database";

type ApiSuccess<TData> = {
  data: TData;
};

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

type CategoryFormState = {
  label: string;
  remarks: string;
};

type EditFormState = {
  transactionCategoryId: string;
  label: string;
  remarks: string;
};

const INITIAL_FORM_STATE: CategoryFormState = {
  label: "",
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

export function AdminCategoriesManagement(): React.JSX.Element {
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createForm, setCreateForm] =
    useState<CategoryFormState>(INITIAL_FORM_STATE);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const categoryById = useMemo(() => {
    return new Map(
      categories.map((category) => [
        category.transaction_category_id,
        category,
      ]),
    );
  }, [categories]);

  const loadCategories = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    const response = await fetch("/api/transaction-categories", {
      method: "GET",
      cache: "no-store",
    });

    const payload = (await response.json()) as
      | ApiSuccess<TransactionCategory[]>
      | ApiErrorResponse;

    if (!response.ok || !("data" in payload)) {
      setIsLoading(false);
      setError(getApiErrorMessage(payload, "Failed to load categories."));
      return;
    }

    setCategories(payload.data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  function startEdit(category: TransactionCategory): void {
    setError(null);
    setSuccess(null);
    setEditForm({
      transactionCategoryId: category.transaction_category_id,
      label: category.label,
      remarks: category.remarks ?? "",
    });
  }

  async function onCreateCategory(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const response = await fetch("/api/transaction-categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        label: createForm.label,
        remarks: toNullableString(createForm.remarks),
      }),
    });

    const payload = (await response.json()) as
      | ApiSuccess<TransactionCategory>
      | ApiErrorResponse;

    if (!response.ok || !("data" in payload)) {
      setIsSubmitting(false);
      setError(getApiErrorMessage(payload, "Failed to create category."));
      return;
    }

    setCreateForm(INITIAL_FORM_STATE);
    setCategories((previous) => [...previous, payload.data]);
    setCategories((previous) =>
      [...previous].sort((left, right) =>
        left.label.localeCompare(right.label),
      ),
    );
    setIsSubmitting(false);
    setSuccess("Category created successfully.");
  }

  async function onUpdateCategory(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!editForm) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const response = await fetch(
      `/api/transaction-categories/${editForm.transactionCategoryId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          label: editForm.label,
          remarks: toNullableString(editForm.remarks),
        }),
      },
    );

    const payload = (await response.json()) as
      | ApiSuccess<TransactionCategory>
      | ApiErrorResponse;

    if (!response.ok || !("data" in payload)) {
      setIsSubmitting(false);
      setError(getApiErrorMessage(payload, "Failed to update category."));
      return;
    }

    setCategories((previous) =>
      previous
        .map((category) =>
          category.transaction_category_id ===
          payload.data.transaction_category_id
            ? payload.data
            : category,
        )
        .sort((left, right) => left.label.localeCompare(right.label)),
    );
    setIsSubmitting(false);
    setSuccess("Category updated successfully.");
  }

  async function onDeleteCategory(
    transactionCategoryId: string,
  ): Promise<void> {
    const category = categoryById.get(transactionCategoryId);

    if (!category) {
      return;
    }

    const confirmed = window.confirm(
      `Delete category "${category.label}"? This performs a soft delete.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const response = await fetch(
      `/api/transaction-categories/${transactionCategoryId}`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      const payload = (await response.json()) as ApiErrorResponse;
      setIsSubmitting(false);
      setError(getApiErrorMessage(payload, "Failed to delete category."));
      return;
    }

    setCategories((previous) =>
      previous.filter(
        (categoryItem) =>
          categoryItem.transaction_category_id !== transactionCategoryId,
      ),
    );
    setEditForm((previous) =>
      previous?.transactionCategoryId === transactionCategoryId
        ? null
        : previous,
    );
    setIsSubmitting(false);
    setSuccess("Category deleted successfully.");
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">
          Admin Category Management
        </h1>
        <p className="text-sm text-slate-600">
          Create, view, update, and delete transaction categories.
        </p>
      </header>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={onCreateCategory}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-slate-900">
            Create category
          </h2>

          <label className="block text-sm text-slate-700">
            <span className="mb-1 block font-medium">Label</span>
            <input
              type="text"
              value={createForm.label}
              onChange={(event) =>
                setCreateForm((previous) => ({
                  ...previous,
                  label: event.target.value,
                }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              required
              maxLength={150}
              disabled={isSubmitting}
            />
          </label>

          <label className="block text-sm text-slate-700">
            <span className="mb-1 block font-medium">Remarks</span>
            <textarea
              value={createForm.remarks}
              onChange={(event) =>
                setCreateForm((previous) => ({
                  ...previous,
                  remarks: event.target.value,
                }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              rows={3}
              maxLength={1000}
              disabled={isSubmitting}
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Create category
          </button>
        </form>

        <form
          onSubmit={onUpdateCategory}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-slate-900">
            Edit category
          </h2>

          {editForm ? (
            <>
              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Label</span>
                <input
                  type="text"
                  value={editForm.label}
                  onChange={(event) =>
                    setEditForm((previous) =>
                      previous
                        ? {
                            ...previous,
                            label: event.target.value,
                          }
                        : previous,
                    )
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                  required
                  maxLength={150}
                  disabled={isSubmitting}
                />
              </label>

              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Remarks</span>
                <textarea
                  value={editForm.remarks}
                  onChange={(event) =>
                    setEditForm((previous) =>
                      previous
                        ? {
                            ...previous,
                            remarks: event.target.value,
                          }
                        : previous,
                    )
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                  rows={3}
                  maxLength={1000}
                  disabled={isSubmitting}
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Save changes
              </button>
            </>
          ) : (
            <p className="text-sm text-slate-600">
              Select a category from the table to edit it.
            </p>
          )}
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">All categories</h2>

        {isLoading ? (
          <p className="mt-3 text-sm text-slate-600">Loading categories...</p>
        ) : categories.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No categories found.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="px-3 py-2 font-medium">Label</th>
                  <th className="px-3 py-2 font-medium">Remarks</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((category) => (
                  <tr key={category.transaction_category_id}>
                    <td className="px-3 py-2 text-slate-900">
                      {category.label}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {category.remarks ?? "-"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(category)}
                          disabled={isSubmitting}
                          className="inline-flex rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onDeleteCategory(category.transaction_category_id)
                          }
                          disabled={isSubmitting}
                          className="inline-flex rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
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

      <p className="text-sm">
        <Link
          href="/settings"
          className="text-slate-800 underline underline-offset-2"
        >
          Back to settings
        </Link>
      </p>
    </div>
  );
}
