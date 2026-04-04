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
  transactionDate: string;
  amount: string;
  paidBy: string;
  category: string;
  partiesInvolved: string[];
  useCustomSplit: boolean;
  partySplitAmounts: Record<string, string>;
};

type PartyOption = {
  value: string;
  label: string;
};

type BulkTransactionInput = Omit<FormState, "partySplitAmounts"> & {
  partySplits?: Record<string, number>;
};

type BulkTransactionImportRecord = Partial<
  BulkTransactionInput & {
    transaction_date: string;
    party_splits: Record<string, number | string>;
  }
>;

const INITIAL_FORM_STATE: Omit<FormState, "paidBy"> = {
  name: "",
  transactionRemark: "",
  transactionDate: new Date().toISOString().slice(0, 10),
  amount: "",
  category: "",
  partiesInvolved: [],
  useCustomSplit: false,
  partySplitAmounts: {},
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
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

  const filteredPartiesInvolved = Array.from(
    new Set(form.partiesInvolved.filter((partyId) => partyId !== form.paidBy)),
  );

  const involvedParties = Array.from(
    new Set([...filteredPartiesInvolved, form.paidBy].filter(Boolean)),
  );

  const partyOptions: PartyOption[] = users
    .filter((user) => user.user_id !== form.paidBy)
    .map((user) => ({
      value: user.user_id,
      label: `${user.name} (${user.email})`,
    }));

  const selectedPartyOptions = partyOptions.filter((option) =>
    filteredPartiesInvolved.includes(option.value),
  );

  const usersById = new Map(users.map((user) => [user.user_id, user]));

  useEffect(() => {
    const participants = Array.from(
      new Set([form.paidBy, ...filteredPartiesInvolved].filter(Boolean)),
    );

    setForm((previous) => {
      const nextPartySplitAmounts: Record<string, string> = {};

      for (const participantId of participants) {
        nextPartySplitAmounts[participantId] =
          previous.partySplitAmounts[participantId] ?? "";
      }

      const unchanged =
        Object.keys(previous.partySplitAmounts).length ===
          Object.keys(nextPartySplitAmounts).length &&
        Object.entries(nextPartySplitAmounts).every(
          ([key, value]) => previous.partySplitAmounts[key] === value,
        );

      if (unchanged) {
        return previous;
      }

      return {
        ...previous,
        partySplitAmounts: nextPartySplitAmounts,
      };
    });
  }, [form.paidBy, filteredPartiesInvolved]);

  function resolveUserId(value: string, fieldName: string): string {
    const raw = value.trim();

    if (!raw) {
      throw new Error(`${fieldName} is required.`);
    }

    const exactMatch = users.find((user) => user.user_id === raw);
    if (exactMatch) {
      return exactMatch.user_id;
    }

    if (UUID_PATTERN.test(raw)) {
      return raw;
    }

    const query = normalizeSearchValue(raw);
    const matches = users.filter((user) => {
      const name = normalizeSearchValue(user.name);
      const email = normalizeSearchValue(user.email);
      return name.includes(query) || email.includes(query);
    });

    if (matches.length === 0) {
      throw new Error(
        `${fieldName} "${raw}" did not match any user by id, name, or email.`,
      );
    }

    if (matches.length > 1) {
      throw new Error(
        `${fieldName} "${raw}" is ambiguous. Use a more specific value or user id.`,
      );
    }

    return matches[0].user_id;
  }

  function resolveCategoryId(value: string): string {
    const raw = value.trim();

    if (!raw) {
      return "";
    }

    const exactMatch = categories.find(
      (category) => category.transaction_category_id === raw,
    );
    if (exactMatch) {
      return exactMatch.transaction_category_id;
    }

    if (UUID_PATTERN.test(raw)) {
      return raw;
    }

    const query = normalizeSearchValue(raw);
    const matches = categories.filter((category) =>
      normalizeSearchValue(category.label).includes(query),
    );

    if (matches.length === 0) {
      throw new Error(
        `category "${raw}" did not match any category by id or label.`,
      );
    }

    if (matches.length > 1) {
      throw new Error(
        `category "${raw}" is ambiguous. Use a more specific value or category id.`,
      );
    }

    return matches[0].transaction_category_id;
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

    if (filteredPartiesInvolved.length === 0) {
      setIsSubmitting(false);
      toast.error("Select at least one party involved.");
      return;
    }

    let partySplits: Record<string, number> | undefined;

    if (form.useCustomSplit) {
      partySplits = {};
      let splitTotal = 0;

      for (const participantId of involvedParties) {
        const rawSplitAmount = form.partySplitAmounts[participantId] ?? "";
        const splitAmount = Number(rawSplitAmount);

        if (!Number.isFinite(splitAmount) || splitAmount <= 0) {
          const participantLabel =
            usersById.get(participantId)?.name ?? participantId;
          setIsSubmitting(false);
          toast.error(`Enter a positive split amount for ${participantLabel}.`);
          return;
        }

        partySplits[participantId] = splitAmount;
        splitTotal += splitAmount;
      }

      if (Math.round(splitTotal * 100) !== Math.round(amount * 100)) {
        setIsSubmitting(false);
        toast.error("Custom split total must exactly match the amount.");
        return;
      }
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
        category: form.category.length > 0 ? form.category : null,
        partiesInvolved: filteredPartiesInvolved,
        partySplits,
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

  async function createTransactionFromInput(
    input: BulkTransactionInput,
  ): Promise<void> {
    const resolvedPaidBy = resolveUserId(input.paidBy, "paidBy");
    const resolvedCategory = resolveCategoryId(input.category);
    const resolvedParties = Array.from(
      new Set(
        input.partiesInvolved
          .map((entry) => resolveUserId(entry, "partiesInvolved"))
          .filter((partyId) => partyId !== resolvedPaidBy),
      ),
    );
    const resolvedInvolvedParties = Array.from(
      new Set([resolvedPaidBy, ...resolvedParties]),
    );

    const amount = Number(input.amount);
    if (!input.name.trim()) {
      throw new Error("Transaction name is required.");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Amount must be a positive number.");
    }

    if (resolvedParties.length === 0) {
      throw new Error("At least one party must be involved.");
    }

    let partySplits: Record<string, number> | undefined;

    if (input.useCustomSplit || input.partySplits) {
      const sourceSplits = input.partySplits ?? {};
      partySplits = {};
      let splitTotal = 0;

      for (const participantId of resolvedInvolvedParties) {
        const splitValue = sourceSplits[participantId];

        if (!Number.isFinite(splitValue) || splitValue <= 0) {
          throw new Error(
            `Custom split is missing or invalid for participant ${participantId}.`,
          );
        }

        partySplits[participantId] = splitValue;
        splitTotal += splitValue;
      }

      if (Math.round(splitTotal * 100) !== Math.round(amount * 100)) {
        throw new Error("Custom split total must exactly match the amount.");
      }
    }

    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: input.name,
        transactionRemark: toNullableString(input.transactionRemark),
        transactionDate: input.transactionDate,
        paidBy: resolvedPaidBy,
        amount,
        category: resolvedCategory.length > 0 ? resolvedCategory : null,
        partiesInvolved: resolvedParties,
        partySplits,
      }),
    });

    const payload = (await response.json()) as
      | ApiSuccess<{ groupKey: string; transactionIds: string[] }>
      | ApiErrorResponse;

    if (!response.ok || !("data" in payload)) {
      throw new Error(
        getApiErrorMessage(payload, "Failed to create transaction."),
      );
    }
  }

  async function handleBulkImport(): Promise<void> {
    if (!selectedImportFile) {
      toast.error("Please choose a JSON file first.");
      return;
    }

    setError(null);
    setIsImporting(true);

    try {
      const rawContent = await selectedImportFile.text();
      const parsed = JSON.parse(rawContent) as unknown;

      const records = Array.isArray(parsed) ? parsed : [parsed];

      if (records.length === 0) {
        toast.error("JSON file is empty.");
        setIsImporting(false);
        return;
      }

      const failures: string[] = [];
      let successCount = 0;

      for (const [index, record] of records.entries()) {
        if (!record || typeof record !== "object") {
          failures.push(`Item ${index + 1}: invalid object.`);
          continue;
        }

        const candidateImport = record as BulkTransactionImportRecord;

        const normalized: BulkTransactionInput = {
          name:
            typeof candidateImport.name === "string"
              ? candidateImport.name
              : "",
          transactionRemark:
            typeof candidateImport.transactionRemark === "string"
              ? candidateImport.transactionRemark
              : "",
          transactionDate:
            typeof candidateImport.transaction_date === "string"
              ? candidateImport.transaction_date
              : typeof candidateImport.transactionDate === "string"
                ? candidateImport.transactionDate
                : new Date().toISOString().slice(0, 10),
          amount:
            typeof candidateImport.amount === "string"
              ? candidateImport.amount
              : String(candidateImport.amount ?? ""),
          paidBy:
            typeof candidateImport.paidBy === "string"
              ? candidateImport.paidBy
              : initialPaidByUserId,
          category:
            typeof candidateImport.category === "string"
              ? candidateImport.category
              : "",
          partiesInvolved: Array.isArray(candidateImport.partiesInvolved)
            ? candidateImport.partiesInvolved.filter(
                (entry): entry is string => typeof entry === "string",
              )
            : [],
          useCustomSplit: Boolean(candidateImport.party_splits),
          partySplits: Object.fromEntries(
            Object.entries(candidateImport.party_splits ?? {}).flatMap(
              ([participantId, splitValue]) => {
                const numericSplit = Number(splitValue);

                if (!Number.isFinite(numericSplit) || numericSplit <= 0) {
                  return [];
                }

                return [[participantId, numericSplit]];
              },
            ),
          ),
        };

        try {
          await createTransactionFromInput(normalized);
          successCount += 1;
        } catch (creationError) {
          const message =
            creationError instanceof Error
              ? creationError.message
              : "Failed to create transaction.";
          failures.push(`Item ${index + 1}: ${message}`);
        }
      }

      if (successCount > 0) {
        toast.success(`Imported ${successCount} transaction(s).`);
      }

      if (failures.length > 0) {
        const preview = failures.slice(0, 3).join(" ");
        const suffix = failures.length > 3 ? " ..." : "";
        toast.error(
          `${failures.length} transaction(s) failed to import. ${preview}${suffix}`,
        );
      }

      if (successCount === 0 && failures.length === 0) {
        toast.error("No transactions were imported.");
      }
    } catch (importError) {
      if (importError instanceof SyntaxError) {
        toast.error("Invalid JSON file.");
      } else {
        const message =
          importError instanceof Error
            ? importError.message
            : "Failed to import transactions.";
        toast.error(message);
      }
    } finally {
      setIsImporting(false);
      setSelectedImportFile(null);
    }
  }

  return (
    <FormPageTemplate
      title="Create Transaction"
      subtitle="Create a split transaction and optionally assign a category."
    >
      {error ? <p className="mt-4 app-alert-error">{error}</p> : null}

      <section className="app-surface mt-6 space-y-3">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Bulk Import from JSON
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Upload a JSON file containing one object or an array of objects that
          follow this form shape: name, transactionRemark, transaction_date,
          amount, paidBy, category, partiesInvolved, and optional party_splits.
        </p>
        <input
          type="file"
          accept="application/json,.json"
          className="app-field"
          disabled={isSubmitting || isImporting}
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            setSelectedImportFile(file);
          }}
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
            disabled={isSubmitting}
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
                partiesInvolved: previous.partiesInvolved.filter(
                  (partyId) => partyId !== event.target.value,
                ),
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

        <label className="block text-sm text-slate-700 dark:text-slate-300">
          <span className="mb-1 block font-medium">Split mode</span>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.useCustomSplit}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  useCustomSplit: event.target.checked,
                }))
              }
              disabled={isSubmitting || isImporting}
            />
            <span>Use custom amount per party</span>
          </div>
        </label>

        {form.useCustomSplit ? (
          <fieldset className="block text-sm text-slate-700 dark:text-slate-300">
            <legend className="mb-1 block font-medium">
              Custom split amounts
            </legend>
            <div className="space-y-2">
              {involvedParties.map((participantId) => {
                const participant = usersById.get(participantId);
                const participantLabel = participant
                  ? `${participant.name} (${participant.email})`
                  : participantId;

                return (
                  <label key={participantId} className="block">
                    <span className="mb-1 block text-xs">
                      {participantLabel}
                    </span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.partySplitAmounts[participantId] ?? ""}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          partySplitAmounts: {
                            ...previous.partySplitAmounts,
                            [participantId]: event.target.value,
                          },
                        }))
                      }
                      className="app-field"
                      disabled={isSubmitting || isImporting}
                    />
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        <Button type="submit" disabled={isSubmitting || isImporting}>
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
