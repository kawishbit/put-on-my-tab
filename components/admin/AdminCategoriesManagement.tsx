"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  const [deleteTargetCategoryId, setDeleteTargetCategoryId] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);

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
      toast.error(getApiErrorMessage(payload, "Failed to create category."));
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
    toast.success("Category created successfully.");
  }

  async function onUpdateCategory(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!editForm) {
      return;
    }

    setError(null);
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
      toast.error(getApiErrorMessage(payload, "Failed to update category."));
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
    toast.success("Category updated successfully.");
  }

  async function onDeleteCategory(
    transactionCategoryId: string,
  ): Promise<void> {
    const category = categoryById.get(transactionCategoryId);

    if (!category) {
      return;
    }

    setError(null);
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
      toast.error(getApiErrorMessage(payload, "Failed to delete category."));
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
    toast.success("Category deleted successfully.");
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-2">
        <h1 className="app-title">Admin Category Management</h1>
        <p className="app-subtitle">
          Create, view, update, and delete transaction categories.
        </p>
      </header>

      {error ? <p className="app-alert-error">{error}</p> : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={onCreateCategory} className="app-surface space-y-4">
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
              className="app-field"
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
              className="app-field"
              rows={3}
              maxLength={1000}
              disabled={isSubmitting}
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="app-button-primary"
          >
            Create category
          </button>
        </form>

        <form onSubmit={onUpdateCategory} className="app-surface space-y-4">
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
                  className="app-field"
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
                  className="app-field"
                  rows={3}
                  maxLength={1000}
                  disabled={isSubmitting}
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="app-button-primary"
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

      <section className="app-surface">
        <h2 className="text-lg font-semibold text-slate-900">All categories</h2>

        {isLoading ? (
          <p className="mt-3 text-sm text-slate-600">Loading categories...</p>
        ) : categories.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No categories found.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="bg-slate-100/80 text-left text-slate-600">
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
                          className="app-button-secondary px-3 py-1.5 text-xs"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTargetCategoryId(
                              category.transaction_category_id,
                            )
                          }
                          disabled={isSubmitting}
                          className="inline-flex items-center justify-center rounded-xl border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
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
          className="font-medium text-slate-800 underline underline-offset-2"
        >
          Back to settings
        </Link>
      </p>

      <ConfirmDialog
        open={deleteTargetCategoryId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTargetCategoryId(null);
          }
        }}
        title="Delete category?"
        description={
          deleteTargetCategoryId
            ? `This will soft-delete "${categoryById.get(deleteTargetCategoryId)?.label ?? "the selected category"}".`
            : "This will soft-delete the selected category."
        }
        confirmLabel="Delete"
        isPending={isSubmitting}
        isDestructive
        onConfirm={async () => {
          if (!deleteTargetCategoryId) {
            return;
          }

          const targetId = deleteTargetCategoryId;
          setDeleteTargetCategoryId(null);
          await onDeleteCategory(targetId);
        }}
      />
    </div>
  );
}
