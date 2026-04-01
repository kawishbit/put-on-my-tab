"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { FormPageTemplate } from "@/components/layout/PageTemplates";
import type {
  PublicUser,
  TransactionCategory,
  TransactionStatus,
} from "@/types/database";

type ApiSuccess<TData> = {
  data: TData;
};

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

type EditDetails = {
  transactionId: string;
  groupKey: string;
  name: string;
  transactionRemark: string | null;
  paidBy: string;
  amount: number;
  category: string | null;
  status: TransactionStatus;
  partiesInvolved: string[];
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  name: string;
  transactionRemark: string;
  amount: string;
  paidBy: string;
  category: string;
  status: TransactionStatus;
  partiesInvolved: string[];
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

export function TransactionEditForm({
  transactionId,
}: {
  transactionId: string;
}): React.JSX.Element {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [groupKey, setGroupKey] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData(): Promise<void> {
      setIsLoading(true);
      setError(null);

      const [transactionResponse, usersResponse, categoriesResponse] =
        await Promise.all([
          fetch(`/api/transactions/${transactionId}`, {
            method: "GET",
            cache: "no-store",
          }),
          fetch("/api/users", {
            method: "GET",
            cache: "no-store",
          }),
          fetch("/api/transaction-categories", {
            method: "GET",
            cache: "no-store",
          }),
        ]);

      const transactionPayload = (await transactionResponse.json()) as
        | ApiSuccess<EditDetails>
        | ApiErrorResponse;

      const usersPayload = (await usersResponse.json()) as
        | ApiSuccess<PublicUser[]>
        | ApiErrorResponse;

      const categoriesPayload = (await categoriesResponse.json()) as
        | ApiSuccess<TransactionCategory[]>
        | ApiErrorResponse;

      if (!active) {
        return;
      }

      if (!transactionResponse.ok || !("data" in transactionPayload)) {
        setIsLoading(false);
        setError(
          getApiErrorMessage(
            transactionPayload,
            "Failed to load transaction details.",
          ),
        );
        return;
      }

      if (!usersResponse.ok || !("data" in usersPayload)) {
        setIsLoading(false);
        setError(getApiErrorMessage(usersPayload, "Failed to load users."));
        return;
      }

      if (!categoriesResponse.ok || !("data" in categoriesPayload)) {
        setIsLoading(false);
        setError(
          getApiErrorMessage(categoriesPayload, "Failed to load categories."),
        );
        return;
      }

      const transaction = transactionPayload.data;

      setUsers(usersPayload.data);
      setCategories(categoriesPayload.data);
      setGroupKey(transaction.groupKey);
      setForm({
        name: transaction.name,
        transactionRemark: transaction.transactionRemark ?? "",
        amount: String(transaction.amount),
        paidBy: transaction.paidBy,
        category: transaction.category ?? "",
        status: transaction.status,
        partiesInvolved: transaction.partiesInvolved,
      });
      setIsLoading(false);
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [transactionId]);

  const involvedParties = useMemo(() => {
    if (!form) {
      return [];
    }

    return Array.from(
      new Set([...form.partiesInvolved, form.paidBy].filter(Boolean)),
    );
  }, [form]);

  async function onSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!form) {
      return;
    }

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

    if (involvedParties.length === 0) {
      setIsSubmitting(false);
      toast.error("Select at least one party involved.");
      return;
    }

    const response = await fetch(`/api/transactions/${transactionId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: form.name,
        transactionRemark: toNullableString(form.transactionRemark),
        paidBy: form.paidBy,
        amount,
        category: form.category.length > 0 ? form.category : null,
        status: form.status,
        partiesInvolved: involvedParties,
      }),
    });

    const payload = (await response.json()) as
      | ApiSuccess<{ groupKey: string }>
      | ApiErrorResponse;

    if (!response.ok || !("data" in payload)) {
      setIsSubmitting(false);
      toast.error(getApiErrorMessage(payload, "Failed to update transaction."));
      return;
    }

    setGroupKey(payload.data.groupKey);
    setIsSubmitting(false);
    toast.success("Transaction updated successfully.");
  }

  return (
    <FormPageTemplate
      title="Edit Transaction"
      subtitle="Update transaction details for this group."
    >
      {groupKey ? (
        <p className="text-xs text-slate-500">Group key: {groupKey}</p>
      ) : null}

      {error ? <p className="mt-4 app-alert-error">{error}</p> : null}

      {isLoading || !form ? (
        <p className="mt-5 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          Loading transaction...
        </p>
      ) : (
        <form onSubmit={onSubmit} className="app-surface mt-6 space-y-4">
          <label className="block text-sm text-slate-700">
            <span className="mb-1 block font-medium">Transaction name</span>
            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((previous) =>
                  previous
                    ? {
                        ...previous,
                        name: event.target.value,
                      }
                    : previous,
                )
              }
              className="app-field"
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
                setForm((previous) =>
                  previous
                    ? {
                        ...previous,
                        amount: event.target.value,
                      }
                    : previous,
                )
              }
              className="app-field"
              required
              disabled={isSubmitting}
            />
          </label>

          <label className="block text-sm text-slate-700">
            <span className="mb-1 block font-medium">Status</span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((previous) =>
                  previous
                    ? {
                        ...previous,
                        status: event.target.value as TransactionStatus,
                      }
                    : previous,
                )
              }
              className="app-field"
              disabled={isSubmitting}
            >
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <label className="block text-sm text-slate-700">
            <span className="mb-1 block font-medium">Paid by</span>
            <select
              value={form.paidBy}
              onChange={(event) =>
                setForm((previous) =>
                  previous
                    ? {
                        ...previous,
                        paidBy: event.target.value,
                      }
                    : previous,
                )
              }
              className="app-field"
              disabled={isSubmitting}
              required
            >
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
                setForm((previous) =>
                  previous
                    ? {
                        ...previous,
                        category: event.target.value,
                      }
                    : previous,
                )
              }
              className="app-field"
              disabled={isSubmitting}
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
                setForm((previous) =>
                  previous
                    ? {
                        ...previous,
                        transactionRemark: event.target.value,
                      }
                    : previous,
                )
              }
              className="app-field"
              rows={3}
              maxLength={1500}
              disabled={isSubmitting}
            />
          </label>

          <fieldset className="block text-sm text-slate-700">
            <legend className="mb-1 block font-medium">Parties involved</legend>
            <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
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
                            if (!previous) {
                              return previous;
                            }

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
                        disabled={isSubmitting}
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
              Total involved in split (including payer):{" "}
              {involvedParties.length}
            </span>
          </fieldset>

          <button
            type="submit"
            disabled={isSubmitting}
            className="app-button-primary"
          >
            Save transaction
          </button>
        </form>
      )}

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link
          href="/transactions"
          className="font-medium text-slate-800 underline underline-offset-2"
        >
          Back to all transactions
        </Link>
        <Link
          href="/my-transactions"
          className="font-medium text-slate-800 underline underline-offset-2"
        >
          Back to my transactions
        </Link>
      </div>
    </FormPageTemplate>
  );
}
