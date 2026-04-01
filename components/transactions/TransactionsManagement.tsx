"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { TablePageTemplate } from "@/components/layout/PageTemplates";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCurrencyAmount } from "@/lib/utils/currency";
import type {
  PublicUser,
  TransactionCategory,
  TransactionStatus,
  TransactionType,
  UserPolicy,
} from "@/types/database";

type ApiSuccess<TData> = {
  data: TData;
};

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

type TransactionListItem = {
  transaction_id: string;
  name: string;
  transaction_remark: string | null;
  paid_by: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  group_key: string;
  category: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  remarks: string | null;
  paid_by_user_name: string | null;
  paid_by_user_email: string | null;
  category_label: string | null;
};

type TransactionListResponse = {
  items: TransactionListItem[];
  total: number;
  page: number;
  pageSize: number;
};

type TransactionScope = "all" | "mine";

type FiltersState = {
  status: "" | TransactionStatus;
  type: "" | TransactionType;
  category: string;
  paidBy: string;
  search: string;
  sortBy: "created_at" | "amount" | "name" | "status" | "type";
  sortOrder: "asc" | "desc";
  pageSize: number;
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

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

const INITIAL_FILTERS: FiltersState = {
  status: "",
  type: "",
  category: "",
  paidBy: "",
  search: "",
  sortBy: "created_at",
  sortOrder: "desc",
  pageSize: 20,
};

export function TransactionsManagement({
  policy,
  initialScope,
}: {
  policy: UserPolicy;
  initialScope: TransactionScope;
}): React.JSX.Element {
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [filters, setFilters] = useState<FiltersState>(INITIAL_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const canEdit = policy === "mod" || policy === "admin";
  const canDelete = policy === "admin";

  const scope: TransactionScope = policy === "user" ? "mine" : initialScope;

  const loadTransactions = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    const searchParams = new URLSearchParams();
    searchParams.set("scope", scope);
    searchParams.set("page", String(currentPage));
    searchParams.set("pageSize", String(filters.pageSize));
    searchParams.set("sortBy", filters.sortBy);
    searchParams.set("sortOrder", filters.sortOrder);

    if (filters.status) {
      searchParams.set("status", filters.status);
    }

    if (filters.type) {
      searchParams.set("type", filters.type);
    }

    if (filters.category) {
      searchParams.set("category", filters.category);
    }

    if (filters.search.trim().length > 0) {
      searchParams.set("search", filters.search.trim());
    }

    if (filters.paidBy && scope === "all") {
      searchParams.set("paidBy", filters.paidBy);
    }

    const response = await fetch(
      `/api/transactions?${searchParams.toString()}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    const payload = (await response.json()) as
      | ApiSuccess<TransactionListResponse>
      | ApiErrorResponse;

    if (!response.ok || !("data" in payload)) {
      setIsLoading(false);
      setTransactions([]);
      setTotal(0);
      setError(getApiErrorMessage(payload, "Failed to load transactions."));
      return;
    }

    setTransactions(payload.data.items);
    setTotal(payload.data.total);
    setIsLoading(false);
  }, [currentPage, filters, scope]);

  const loadCategories = useCallback(async (): Promise<void> => {
    const response = await fetch("/api/transaction-categories", {
      method: "GET",
      cache: "no-store",
    });

    const payload = (await response.json()) as
      | ApiSuccess<TransactionCategory[]>
      | ApiErrorResponse;

    if (!response.ok || !("data" in payload)) {
      setError(getApiErrorMessage(payload, "Failed to load categories."));
      return;
    }

    setCategories(payload.data);
  }, []);

  const loadUsers = useCallback(async (): Promise<void> => {
    if (policy === "user") {
      return;
    }

    const response = await fetch("/api/users", {
      method: "GET",
      cache: "no-store",
    });

    const payload = (await response.json()) as
      | ApiSuccess<PublicUser[]>
      | ApiErrorResponse;

    if (!response.ok || !("data" in payload)) {
      setError(getApiErrorMessage(payload, "Failed to load users."));
      return;
    }

    setUsers(payload.data);
  }, [policy]);

  useEffect(() => {
    void loadCategories();
    void loadUsers();
  }, [loadCategories, loadUsers]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  async function onDelete(transactionId: string): Promise<void> {
    if (!canDelete) {
      return;
    }

    setError(null);
    setIsMutating(true);

    const response = await fetch(`/api/transactions/${transactionId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = (await response.json()) as ApiErrorResponse;
      setIsMutating(false);
      toast.error(getApiErrorMessage(payload, "Failed to delete transaction."));
      return;
    }

    setIsMutating(false);
    toast.success("Transaction deleted successfully.");
    await loadTransactions();
  }

  async function onUpdateStatus(
    transactionId: string,
    status: TransactionStatus,
  ): Promise<void> {
    setError(null);
    setIsMutating(true);

    const response = await fetch(`/api/transactions/${transactionId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    const payload = (await response.json()) as
      | ApiSuccess<unknown>
      | ApiErrorResponse;

    if (!response.ok || !("data" in payload)) {
      setIsMutating(false);
      toast.error(
        getApiErrorMessage(payload, "Failed to update transaction status."),
      );
      return;
    }

    setIsMutating(false);
    toast.success("Transaction status updated successfully.");
    await loadTransactions();
  }

  const pageCount = Math.max(Math.ceil(total / filters.pageSize), 1);

  return (
    <TablePageTemplate
      title={scope === "mine" ? "My Transactions" : "All Transactions"}
      subtitle="Filter, sort, paginate, and manage transactions."
      actions={
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/"
            className="font-medium text-slate-800 underline underline-offset-2"
          >
            Back to home
          </Link>
          {policy !== "user" ? (
            <Link
              href="/transactions/create"
              className="font-medium text-slate-800 underline underline-offset-2"
            >
              Create transaction
            </Link>
          ) : null}
          {scope === "all" ? (
            <Link
              href="/my-transactions"
              className="font-medium text-slate-800 underline underline-offset-2"
            >
              View my transactions
            </Link>
          ) : (
            policy !== "user" && (
              <Link
                href="/transactions"
                className="font-medium text-slate-800 underline underline-offset-2"
              >
                View all transactions
              </Link>
            )
          )}
        </div>
      }
    >
      {error ? <p className="app-alert-error">{error}</p> : null}

      <section className="app-surface">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-slate-700">
            <span className="mb-1 block font-medium">Search</span>
            <input
              value={filters.search}
              onChange={(event) => {
                setCurrentPage(1);
                setFilters((previous) => ({
                  ...previous,
                  search: event.target.value,
                }));
              }}
              className="app-field"
              placeholder="Search by name"
            />
          </label>

          <label className="text-sm text-slate-700">
            <span className="mb-1 block font-medium">Status</span>
            <select
              value={filters.status}
              onChange={(event) => {
                setCurrentPage(1);
                setFilters((previous) => ({
                  ...previous,
                  status: event.target.value as FiltersState["status"],
                }));
              }}
              className="app-field"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <label className="text-sm text-slate-700">
            <span className="mb-1 block font-medium">Type</span>
            <select
              value={filters.type}
              onChange={(event) => {
                setCurrentPage(1);
                setFilters((previous) => ({
                  ...previous,
                  type: event.target.value as FiltersState["type"],
                }));
              }}
              className="app-field"
            >
              <option value="">All types</option>
              <option value="deposit">Deposit</option>
              <option value="withdraw">Withdraw</option>
            </select>
          </label>

          <label className="text-sm text-slate-700">
            <span className="mb-1 block font-medium">Category</span>
            <select
              value={filters.category}
              onChange={(event) => {
                setCurrentPage(1);
                setFilters((previous) => ({
                  ...previous,
                  category: event.target.value,
                }));
              }}
              className="app-field"
            >
              <option value="">All categories</option>
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

          {scope === "all" && policy !== "user" ? (
            <label className="text-sm text-slate-700">
              <span className="mb-1 block font-medium">Paid by</span>
              <select
                value={filters.paidBy}
                onChange={(event) => {
                  setCurrentPage(1);
                  setFilters((previous) => ({
                    ...previous,
                    paidBy: event.target.value,
                  }));
                }}
                className="app-field"
              >
                <option value="">All users</option>
                {users.map((user) => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="text-sm text-slate-700">
            <span className="mb-1 block font-medium">Sort by</span>
            <select
              value={filters.sortBy}
              onChange={(event) => {
                setCurrentPage(1);
                setFilters((previous) => ({
                  ...previous,
                  sortBy: event.target.value as FiltersState["sortBy"],
                }));
              }}
              className="app-field"
            >
              <option value="created_at">Created at</option>
              <option value="amount">Amount</option>
              <option value="name">Name</option>
              <option value="status">Status</option>
              <option value="type">Type</option>
            </select>
          </label>

          <label className="text-sm text-slate-700">
            <span className="mb-1 block font-medium">Sort order</span>
            <select
              value={filters.sortOrder}
              onChange={(event) => {
                setCurrentPage(1);
                setFilters((previous) => ({
                  ...previous,
                  sortOrder: event.target.value as FiltersState["sortOrder"],
                }));
              }}
              className="app-field"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>

          <label className="text-sm text-slate-700">
            <span className="mb-1 block font-medium">Page size</span>
            <select
              value={filters.pageSize}
              onChange={(event) => {
                setCurrentPage(1);
                setFilters((previous) => ({
                  ...previous,
                  pageSize: Number.parseInt(event.target.value, 10),
                }));
              }}
              className="app-field"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>
      </section>

      <section className="app-table-shell">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100/80 text-left text-slate-700">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Paid By</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-4 text-center text-slate-500"
                >
                  Loading transactions...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-4 text-center text-slate-500"
                >
                  No transactions found.
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => (
                <tr
                  key={transaction.transaction_id}
                  className="border-t border-slate-200 align-top"
                >
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-900">
                      {transaction.name}
                    </p>
                    {transaction.transaction_remark ? (
                      <p className="mt-0.5 text-xs text-slate-600">
                        {transaction.transaction_remark}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {transaction.paid_by_user_name ?? transaction.paid_by}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {formatCurrencyAmount(transaction.amount)}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {transaction.type}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {transaction.status}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {formatDateTime(transaction.created_at)}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {transaction.category_label ?? "Uncategorized"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {canEdit ? (
                        <Link
                          href={`/transactions/${transaction.transaction_id}/edit`}
                          className="app-button-secondary px-2 py-1 text-xs"
                        >
                          Edit
                        </Link>
                      ) : null}

                      {canEdit && transaction.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            disabled={isMutating}
                            onClick={() =>
                              void onUpdateStatus(
                                transaction.transaction_id,
                                "completed",
                              )
                            }
                            className="inline-flex items-center justify-center rounded-xl border border-emerald-300 px-2 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"
                          >
                            Mark completed
                          </button>
                          <button
                            type="button"
                            disabled={isMutating}
                            onClick={() =>
                              void onUpdateStatus(
                                transaction.transaction_id,
                                "cancelled",
                              )
                            }
                            className="inline-flex items-center justify-center rounded-xl border border-amber-300 px-2 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-50 disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </>
                      ) : null}

                      {canDelete ? (
                        <button
                          type="button"
                          disabled={isMutating}
                          onClick={() =>
                            setDeleteTarget({
                              id: transaction.transaction_id,
                              name: transaction.name,
                            })
                          }
                          className="inline-flex items-center justify-center rounded-xl border border-red-300 px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="app-surface flex items-center justify-between px-4 py-3 text-sm text-slate-700">
        <span>
          Total: {total} transaction records | Page {currentPage} of {pageCount}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={currentPage <= 1 || isLoading}
            onClick={() =>
              setCurrentPage((previous) => Math.max(previous - 1, 1))
            }
            className="app-button-secondary px-3 py-1.5"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={currentPage >= pageCount || isLoading}
            onClick={() =>
              setCurrentPage((previous) => Math.min(previous + 1, pageCount))
            }
            className="app-button-secondary px-3 py-1.5"
          >
            Next
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="Delete transaction group?"
        description={
          deleteTarget
            ? `This will soft-delete the transaction group for "${deleteTarget.name}" and recalculate balances.`
            : "This will soft-delete the selected transaction group and recalculate balances."
        }
        confirmLabel="Delete"
        isPending={isMutating}
        isDestructive
        onConfirm={async () => {
          if (!deleteTarget) {
            return;
          }

          const targetId = deleteTarget.id;
          setDeleteTarget(null);
          await onDelete(targetId);
        }}
      />
    </TablePageTemplate>
  );
}
