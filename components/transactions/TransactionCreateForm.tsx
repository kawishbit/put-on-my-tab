"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Select, { type MultiValue } from "react-select";
import { toast } from "sonner";

import { FormPageTemplate } from "@/components/layout/PageTemplates";
import { Button } from "@/components/ui/button";
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

type PartyOption = {
  value: string;
  label: string;
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

  const partyOptions: PartyOption[] = users.map((user) => ({
    value: user.user_id,
    label: `${user.name} (${user.email})`,
  }));

  const selectedPartyOptions = partyOptions.filter((option) =>
    form.partiesInvolved.includes(option.value),
  );

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

    if (involvedParties.length === 0) {
      setIsSubmitting(false);
      toast.error("Select at least one party involved.");
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
      toast.error(getApiErrorMessage(payload, "Failed to create transaction."));
      return;
    }

    setForm({
      ...INITIAL_FORM_STATE,
      paidBy: form.paidBy,
    });
    setIsSubmitting(false);
    toast.success(
      `Transaction created successfully. Group key: ${payload.data.groupKey}`,
    );
  }

  return (
    <FormPageTemplate
      title="Create Transaction"
      subtitle="Create a split transaction and optionally assign a category."
    >
      {error ? <p className="mt-4 app-alert-error">{error}</p> : null}

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
              setForm((previous) => ({
                ...previous,
                amount: event.target.value,
              }))
            }
            className="app-field"
            required
            disabled={isSubmitting}
          />
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
            disabled={isSubmitting}
          />
        </label>

        <fieldset className="block text-sm text-slate-700 dark:text-slate-300">
          <legend className="mb-1 block font-medium">Parties involved</legend>
          <Select<PartyOption, true>
            isMulti
            isSearchable
            closeMenuOnSelect={false}
            isDisabled={isSubmitting || isLoadingUsers}
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
              setForm((previous) => ({
                ...previous,
                partiesInvolved: value.map((entry) => entry.value),
              }));
            }}
          />
          <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
            Total involved in split (including payer): {involvedParties.length}
          </span>
        </fieldset>

        <Button type="submit" disabled={isSubmitting}>
          Create transaction
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
