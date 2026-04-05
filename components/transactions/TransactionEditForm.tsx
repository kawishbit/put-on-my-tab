"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Select, { type MultiValue } from "react-select";
import { toast } from "sonner";

import { FormPageTemplate } from "@/components/layout/PageTemplates";
import { Button } from "@/components/ui/button";
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

type PartyOption = {
  value: string;
  label: string;
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

  const partyOptions = useMemo<PartyOption[]>(
    () =>
      users.map((user) => ({
        value: user.user_id,
        label: `${user.name} (${user.email})`,
      })),
    [users],
  );

  const selectedPartyOptions = useMemo(() => {
    if (!form) {
      return [];
    }

    return partyOptions.filter((option) =>
      form.partiesInvolved.includes(option.value),
    );
  }, [form, partyOptions]);

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
          <label className="block text-sm text-slate-700 dark:text-slate-300">
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

          <label className="block text-sm text-slate-700 dark:text-slate-300">
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

          <label className="block text-sm text-slate-700 dark:text-slate-300">
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

          <label className="block text-sm text-slate-700 dark:text-slate-300">
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

          <label className="block text-sm text-slate-700 dark:text-slate-300">
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

          <label className="block text-sm text-slate-700 dark:text-slate-300">
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

          <fieldset className="block text-sm text-slate-700 dark:text-slate-300">
            <legend className="mb-1 block font-medium">Parties involved</legend>
            <Select<PartyOption, true>
              instanceId="transaction-edit-parties"
              inputId="transaction-edit-parties-input"
              isMulti
              isSearchable
              closeMenuOnSelect={false}
              isDisabled={isSubmitting}
              options={partyOptions}
              value={selectedPartyOptions}
              placeholder="Select users involved..."
              noOptionsMessage={() => "No users available"}
              unstyled
              classNames={{
                control: (state) =>
                  `mt-1 min-h-10 w-full rounded-xl border px-3 py-2 transition ${state.isFocused ? "border-slate-400 ring-4 ring-slate-100 dark:border-white/30 dark:ring-white/5" : "border-slate-200 dark:border-white/15"} bg-white text-slate-900 dark:bg-slate-800/80 dark:text-slate-100`,
                valueContainer: () => "flex flex-wrap gap-1",
                multiValue: () =>
                  "rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200",
                multiValueRemove: () =>
                  "ml-1 cursor-pointer text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100",
                input: () => "text-sm text-slate-900 dark:text-slate-100",
                placeholder: () => "text-sm text-slate-500 dark:text-slate-400",
                indicatorsContainer: () => "text-slate-500 dark:text-slate-400",
                clearIndicator: () => "cursor-pointer px-1",
                dropdownIndicator: () => "cursor-pointer px-1",
                menu: () =>
                  "z-20 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-800",
                menuList: () => "max-h-56 overflow-auto p-1",
                option: (state) =>
                  `cursor-pointer rounded-md px-3 py-2 text-sm ${state.isFocused ? "bg-slate-100 dark:bg-slate-700/70" : ""} ${state.isSelected ? "bg-slate-200 dark:bg-slate-700" : ""} text-slate-700 dark:text-slate-200`,
              }}
              onChange={(value: MultiValue<PartyOption>) => {
                setForm((previous) =>
                  previous
                    ? {
                        ...previous,
                        partiesInvolved: value.map((entry) => entry.value),
                      }
                    : previous,
                );
              }}
            />
            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
              Total involved in split (including payer):{" "}
              {involvedParties.length}
            </span>
          </fieldset>

          <Button type="submit" disabled={isSubmitting}>
            Save transaction
          </Button>
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
