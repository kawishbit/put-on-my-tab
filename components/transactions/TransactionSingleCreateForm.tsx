"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import FileUploadDropzone3 from "@/components/file-upload-dropzone-3";
import { FormPageTemplate } from "@/components/layout/PageTemplates";
import { Button } from "@/components/ui/button";
import type {
  PublicUser,
  TransactionCategory,
  TransactionStatus,
  TransactionType,
} from "@/types/database";

type ApiSuccess<TData> = {
  data: TData;
};

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

type FormState = {
  name: string;
  transactionRemark: string;
  transactionDate: string;
  amount: string;
  paidBy: string;
  type: TransactionType;
  status: TransactionStatus;
  category: string;
};

type BulkImportResult = {
  importedCount: number;
  failedCount: number;
  failures: string[];
};

const INITIAL_FORM_STATE: Omit<FormState, "paidBy"> = {
  name: "",
  transactionRemark: "",
  transactionDate: new Date().toISOString().slice(0, 10),
  amount: "",
  type: "deposit",
  status: "completed",
  category: "",
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

export function TransactionSingleCreateForm({
  initialPaidByUserId,
}: {
  initialPaidByUserId: string;
}): React.JSX.Element {
  const [form, setForm] = useState<FormState>({
    ...INITIAL_FORM_STATE,
    paidBy: initialPaidByUserId,
  });
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadUsers(): Promise<void> {
      setIsLoadingUsers(true);

      const response = await fetch("/api/users", {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json()) as
        | ApiSuccess<PublicUser[]>
        | ApiErrorResponse;

      if (!isActive) {
        return;
      }

      if (!response.ok || !("data" in payload)) {
        setError(getApiErrorMessage(payload, "Failed to load users."));
        setIsLoadingUsers(false);
        return;
      }

      setUsers(payload.data);
      setForm((previous) => {
        const hasPaidBy = payload.data.some(
          (user) => user.user_id === previous.paidBy,
        );

        if (hasPaidBy) {
          return previous;
        }

        return {
          ...previous,
          paidBy:
            payload.data.find((user) => user.user_id === initialPaidByUserId)
              ?.user_id ??
            payload.data[0]?.user_id ??
            "",
        };
      });
      setIsLoadingUsers(false);
    }

    async function loadCategories(): Promise<void> {
      setIsLoadingCategories(true);

      const response = await fetch("/api/transaction-categories", {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json()) as
        | ApiSuccess<TransactionCategory[]>
        | ApiErrorResponse;

      if (!isActive) {
        return;
      }

      if (!response.ok || !("data" in payload)) {
        setError(getApiErrorMessage(payload, "Failed to load categories."));
        setIsLoadingCategories(false);
        return;
      }

      setCategories(payload.data);
      setIsLoadingCategories(false);
    }

    void loadUsers();
    void loadCategories();

    return () => {
      isActive = false;
    };
  }, [initialPaidByUserId]);

  async function handleBulkImport(): Promise<void> {
    if (!selectedImportFile) {
      toast.error("Please choose a JSON file first.");
      return;
    }

    setError(null);
    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.set("file", selectedImportFile);
      formData.set("defaultPaidBy", form.paidBy);

      const response = await fetch("/api/transactions/import", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as
        | ApiSuccess<BulkImportResult>
        | ApiErrorResponse;

      if (!response.ok || !("data" in payload)) {
        throw new Error(
          getApiErrorMessage(payload, "Failed to import transactions."),
        );
      }

      if (payload.data.importedCount > 0) {
        toast.success(`Imported ${payload.data.importedCount} transaction(s).`);
      }

      if (payload.data.failedCount > 0) {
        const preview = payload.data.failures.slice(0, 3).join(" ");
        const suffix = payload.data.failedCount > 3 ? " ..." : "";
        toast.error(
          `${payload.data.failedCount} transaction(s) failed to import. ${preview}${suffix}`,
        );
      }

      if (payload.data.importedCount === 0 && payload.data.failedCount === 0) {
        toast.error("No transactions were imported.");
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to import transactions.";
      toast.error(message);
    } finally {
      setIsImporting(false);
      setSelectedImportFile(null);
    }
  }

  async function onSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setIsSubmitting(false);
      toast.error("Amount must be a positive number.");
      return;
    }

    if (!form.paidBy) {
      setIsSubmitting(false);
      toast.error("Please select who paid for this transaction.");
      return;
    }

    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: form.name,
        transactionRemark: toNullableString(form.transactionRemark),
        transactionDate: form.transactionDate,
        paidBy: form.paidBy,
        amount,
        type: form.type,
        status: form.status,
        category: form.category.length > 0 ? form.category : null,
      }),
    });

    const payload = (await response.json()) as
      | ApiSuccess<{ transactionId: string }>
      | ApiErrorResponse;

    if (!response.ok || !("data" in payload)) {
      setIsSubmitting(false);
      toast.error(getApiErrorMessage(payload, "Failed to create transaction."));
      return;
    }

    setForm({
      ...INITIAL_FORM_STATE,
      paidBy: form.paidBy,
      type: form.type,
      status: form.status,
    });
    setIsSubmitting(false);
    toast.success(
      `Transaction created successfully. ID: ${payload.data.transactionId}`,
    );
  }

  return (
    <FormPageTemplate
      title="Add Transaction"
      subtitle="Create a single transaction record without split parties."
    >
      {error ? <p className="mt-4 app-alert-error">{error}</p> : null}

      <section className="app-surface mt-6 space-y-3">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Bulk Import from JSON
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Upload a JSON file containing one object or an array of objects that
          follow this form shape: name, transactionRemark, transaction_date,
          amount, paidBy, type, status, and category.
        </p>
        <FileUploadDropzone3
          value={selectedImportFile ? [selectedImportFile] : []}
          onValueChange={(files) => {
            setSelectedImportFile(files[0] ?? null);
          }}
          accept="application/json,.json"
          maxFiles={1}
          maxSize={5 * 1024 * 1024}
          disabled={isSubmitting || isImporting}
          className="w-full"
          title="Drop JSON file here or click to upload"
          subtitle="Max 1 file, 5MB"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={!selectedImportFile || isSubmitting || isImporting}
          onClick={() => {
            void handleBulkImport();
          }}
        >
          {isImporting ? "Importing..." : "Import JSON"}
        </Button>
      </section>

      <form onSubmit={onSubmit} className="app-surface mt-6 space-y-4">
        <label className="block text-sm text-slate-700 dark:text-slate-300">
          <span className="mb-1 block font-medium">Transaction name</span>
          <input
            type="text"
            value={form.name}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                name: event.target.value,
              }))
            }
            className="app-field"
            required
            maxLength={200}
            disabled={isSubmitting || isImporting}
          />
        </label>

        <label className="block text-sm text-slate-700 dark:text-slate-300">
          <span className="mb-1 block font-medium">Transaction date</span>
          <input
            type="date"
            value={form.transactionDate}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                transactionDate: event.target.value,
              }))
            }
            className="app-field"
            required
            disabled={isSubmitting || isImporting}
          />
        </label>

        <label className="block text-sm text-slate-700 dark:text-slate-300">
          <span className="mb-1 block font-medium">Amount</span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={form.amount}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                amount: event.target.value,
              }))
            }
            className="app-field"
            required
            disabled={isSubmitting || isImporting}
          />
        </label>

        <label className="block text-sm text-slate-700 dark:text-slate-300">
          <span className="mb-1 block font-medium">Type</span>
          <select
            value={form.type}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                type: event.target.value as TransactionType,
              }))
            }
            className="app-field"
            disabled={isSubmitting || isImporting}
          >
            <option value="deposit">Deposit</option>
            <option value="withdraw">Withdraw</option>
          </select>
        </label>

        <label className="block text-sm text-slate-700 dark:text-slate-300">
          <span className="mb-1 block font-medium">Status</span>
          <select
            value={form.status}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                status: event.target.value as TransactionStatus,
              }))
            }
            className="app-field"
            disabled={isSubmitting || isImporting}
          >
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label className="block text-sm text-slate-700 dark:text-slate-300">
          <span className="mb-1 block font-medium">Paid by</span>
          <select
            value={form.paidBy}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                paidBy: event.target.value,
              }))
            }
            className="app-field"
            disabled={isSubmitting || isImporting || isLoadingUsers}
            required
          >
            {users.length === 0 ? (
              <option value="">No users available</option>
            ) : null}
            {users.map((user) => (
              <option key={user.user_id} value={user.user_id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-slate-700 dark:text-slate-300">
          <span className="mb-1 block font-medium">Category</span>
          <select
            value={form.category}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                category: event.target.value,
              }))
            }
            className="app-field"
            disabled={isSubmitting || isImporting || isLoadingCategories}
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option
                key={category.transaction_category_id}
                value={category.transaction_category_id}
              >
                {category.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-slate-700 dark:text-slate-300">
          <span className="mb-1 block font-medium">Transaction remark</span>
          <textarea
            value={form.transactionRemark}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                transactionRemark: event.target.value,
              }))
            }
            className="app-field"
            rows={3}
            maxLength={1500}
            disabled={isSubmitting || isImporting}
          />
        </label>

        <Button type="submit" disabled={isSubmitting || isImporting}>
          Add transaction
        </Button>
      </form>

      <p className="mt-6 text-sm">
        <Link
          href="/"
          className="font-medium text-slate-800 underline underline-offset-2"
        >
          Back to home
        </Link>
      </p>
    </FormPageTemplate>
  );
}
