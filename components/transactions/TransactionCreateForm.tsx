"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { PublicUser, TransactionCategory } from "@/types/database";

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
  paidBy: string;
  category: string;
  partiesInvolved: string[];
};

const INITIAL_FORM_STATE: Omit<FormState, "paidBy"> = {
  name: "",
  transactionRemark: "",
  amount: "",
  category: "",
  partiesInvolved: [],
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

export function TransactionCreateForm({
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const involvedParties = Array.from(
    new Set([...form.partiesInvolved, form.paidBy].filter(Boolean)),
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

    if (!form.paidBy) {
      setIsSubmitting(false);
      setError("Please select who paid for this transaction.");
      return;
    }

    if (involvedParties.length === 0) {
      setIsSubmitting(false);
      setError("Select at least one party involved.");
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
        paidBy: form.paidBy,
        amount,
        category: form.category.length > 0 ? form.category : null,
        partiesInvolved: involvedParties,
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

    setForm({
      ...INITIAL_FORM_STATE,
      paidBy: form.paidBy,
    });
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
          <span className="mb-1 block font-medium">Paid by</span>
          <select
            value={form.paidBy}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                paidBy: event.target.value,
              }))
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            disabled={isSubmitting || isLoadingUsers}
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

        <fieldset className="block text-sm text-slate-700">
          <legend className="mb-1 block font-medium">Parties involved</legend>
          <div className="max-h-52 space-y-2 overflow-y-auto rounded-md border border-slate-300 p-3">
            {users.length === 0 ? (
              <p className="text-xs text-slate-500">No users available.</p>
            ) : (
              users.map((user) => {
                const isChecked = form.partiesInvolved.includes(user.user_id);

                return (
                  <label
                    key={user.user_id}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      value={user.user_id}
                      checked={isChecked}
                      onChange={(event) =>
                        setForm((previous) => {
                          const nextParties = event.target.checked
                            ? [...previous.partiesInvolved, user.user_id]
                            : previous.partiesInvolved.filter(
                                (partyId) => partyId !== user.user_id,
                              );

                          return {
                            ...previous,
                            partiesInvolved: nextParties,
                          };
                        })
                      }
                      disabled={isSubmitting || isLoadingUsers}
                    />
                    <span>{user.name}</span>
                    <span className="text-xs text-slate-500">
                      ({user.email})
                    </span>
                  </label>
                );
              })
            )}
          </div>
          <span className="mt-1 block text-xs text-slate-500">
            Total involved in split (including payer): {involvedParties.length}
          </span>
        </fieldset>

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
