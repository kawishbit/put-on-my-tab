"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { TransactionCategory, TransactionStatus } from "@/types/database";

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
  amount: string;
  category: string;
  status: TransactionStatus;
  partiesInvolved: string;
};

const INITIAL_FORM_STATE: FormState = {
  name: "",
  transactionRemark: "",
  amount: "",
  category: "",
  status: "completed",
  partiesInvolved: "",
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

function parseParties(rawParties: string): string[] {
  return rawParties
    .split(",")
    .map((entry) => entry.trim())
    .filter(
      (entry, index, source) =>
        entry.length > 0 && source.indexOf(entry) === index,
    );
}

export function TransactionCreateForm({
  paidByUserId,
}: {
  paidByUserId: string;
}): React.JSX.Element {
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

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

    void loadCategories();

    return () => {
      isActive = false;
    };
  }, []);

  const parsedParties = useMemo(
    () => parseParties(form.partiesInvolved),
    [form.partiesInvolved],
  );

  async function onSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setIsSubmitting(false);
      setError("Amount must be a positive number.");
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
        paidBy: paidByUserId,
        amount,
        category: form.category.length > 0 ? form.category : null,
        status: form.status,
        partiesInvolved: parsedParties,
      }),
    });

    const payload = (await response.json()) as
      | ApiSuccess<{ groupKey: string; transactionIds: string[] }>
      | ApiErrorResponse;

    if (!response.ok || !("data" in payload)) {
      setIsSubmitting(false);
      setError(getApiErrorMessage(payload, "Failed to create transaction."));
      return;
    }

    setForm(INITIAL_FORM_STATE);
    setIsSubmitting(false);
    setSuccess(
      `Transaction created successfully. Group key: ${payload.data.groupKey}`,
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">
          Create Transaction
        </h1>
        <p className="text-sm text-slate-600">
          Create a split transaction and optionally assign a category.
        </p>
      </header>

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <label className="block text-sm text-slate-700">
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
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            required
            maxLength={200}
            disabled={isSubmitting}
          />
        </label>

        <label className="block text-sm text-slate-700">
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
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            required
            disabled={isSubmitting}
          />
        </label>

        <label className="block text-sm text-slate-700">
          <span className="mb-1 block font-medium">Category</span>
          <select
            value={form.category}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                category: event.target.value,
              }))
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            disabled={isSubmitting || isLoadingCategories}
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

        <label className="block text-sm text-slate-700">
          <span className="mb-1 block font-medium">Status</span>
          <select
            value={form.status}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                status: event.target.value as TransactionStatus,
              }))
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            disabled={isSubmitting}
          >
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label className="block text-sm text-slate-700">
          <span className="mb-1 block font-medium">Transaction remark</span>
          <textarea
            value={form.transactionRemark}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                transactionRemark: event.target.value,
              }))
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            rows={3}
            maxLength={1500}
            disabled={isSubmitting}
          />
        </label>

        <label className="block text-sm text-slate-700">
          <span className="mb-1 block font-medium">Parties involved</span>
          <textarea
            value={form.partiesInvolved}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                partiesInvolved: event.target.value,
              }))
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            rows={3}
            placeholder="Comma-separated user UUIDs"
            disabled={isSubmitting}
          />
          <span className="mt-1 block text-xs text-slate-500">
            Parsed parties: {parsedParties.length}
          </span>
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Create transaction
        </button>
      </form>

      <p className="mt-6 text-sm">
        <Link href="/" className="text-slate-800 underline underline-offset-2">
          Back to home
        </Link>
      </p>
    </div>
  );
}
