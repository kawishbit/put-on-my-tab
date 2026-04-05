"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { TablePageTemplate } from "@/components/layout/PageTemplates";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  SimpleTableBody,
  SimpleTableCell,
  SimpleTableEmpty,
  SimpleTableHead,
  SimpleTableHeader,
  SimpleTableRoot,
  SimpleTableRow,
} from "@/components/ui/simple-table-core";
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
  transaction_date: string;
  updated_at: string;
  is_deleted: boolean;
  remarks: string | null;
  paid_by_user_name: string | null;
  paid_by_user_email: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_by_user_name: string | null;
  created_by_user_email: string | null;
  updated_by_user_name: string | null;
  updated_by_user_email: string | null;
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
  sortBy: "transaction_date" | "amount" | "name" | "status" | "type";
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

function getDownloadFileName(
  contentDisposition: string | null,
  fallbackName: string,
): string {
  if (!contentDisposition) {
    return fallbackName;
  }

  const match = contentDisposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? fallbackName;
}

const INITIAL_FILTERS: FiltersState = {
  status: "",
  type: "",
  category: "",
  paidBy: "",
  search: "",
  sortBy: "transaction_date",
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
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const canEdit = policy === "admin";
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

  async function onExportCsv(): Promise<void> {
    setIsExporting(true);

    const searchParams = new URLSearchParams();
    searchParams.set("scope", scope);
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
      `/api/transactions/export?${searchParams.toString()}`,
      {
        method: "GET",
      },
    );

    if (!response.ok) {
      const contentType = response.headers.get("content-type") ?? "";

      if (contentType.includes("application/json")) {
        const payload = (await response.json()) as ApiErrorResponse;
        toast.error(getApiErrorMessage(payload, "Failed to export CSV."));
      } else {
        toast.error("Failed to export CSV.");
      }

      setIsExporting(false);
      return;
    }

    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);

    link.href = downloadUrl;
    link.download = getDownloadFileName(
      response.headers.get("content-disposition"),
      `transactions-${today}.csv`,
    );
    link.click();

    URL.revokeObjectURL(downloadUrl);
    setIsExporting(false);
    toast.success("Transactions CSV downloaded.");
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
            className="font-medium text-slate-800 underline underline-offset-2 dark:text-slate-200"
          >
            Back to home
          </Link>
          {policy !== "user" ? (
            <Link
              href="/transactions/create"
              className="font-medium text-slate-800 underline underline-offset-2 dark:text-slate-200"
            >
              Add transaction
            </Link>
          ) : null}
          {policy !== "user" ? (
            <Link
              href="/transactions/create-group"
              className="font-medium text-slate-800 underline underline-offset-2 dark:text-slate-200"
            >
              Add group transaction
            </Link>
          ) : null}
          {scope === "all" ? (
            <Link
              href="/my-transactions"
              className="font-medium text-slate-800 underline underline-offset-2 dark:text-slate-200"
            >
              View my transactions
            </Link>
          ) : (
            policy !== "user" && (
              <Link
                href="/transactions"
                className="font-medium text-slate-800 underline underline-offset-2 dark:text-slate-200"
              >
                View all transactions
              </Link>
            )
          )}
          <Button
            onClick={() => void onExportCsv()}
            variant="secondary"
            size="sm"
            disabled={isExporting}
          >
            {isExporting ? "Exporting..." : "Download CSV"}
          </Button>
        </div>
      }
    >
      {error ? <p className="app-alert-error">{error}</p> : null}

      <section className="app-surface">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-slate-700 dark:text-slate-300">
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

          <label className="text-sm text-slate-700 dark:text-slate-300">
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

          <label className="text-sm text-slate-700 dark:text-slate-300">
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

          <label className="text-sm text-slate-700 dark:text-slate-300">
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
            <label className="text-sm text-slate-700 dark:text-slate-300">
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

          <label className="text-sm text-slate-700 dark:text-slate-300">
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
              <option value="transaction_date">Transaction date</option>
              <option value="amount">Amount</option>
              <option value="name">Name</option>
              <option value="status">Status</option>
              <option value="type">Type</option>
            </select>
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-300">
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

          <label className="text-sm text-slate-700 dark:text-slate-300">
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

      <SimpleTableRoot className="overflow-x-auto">
        <table className="min-w-[980px] w-full">
          <SimpleTableHeader>
            <SimpleTableRow>
              <SimpleTableHead>Name</SimpleTableHead>
              <SimpleTableHead>Paid By</SimpleTableHead>
              <SimpleTableHead>Created By</SimpleTableHead>
              <SimpleTableHead>Updated By</SimpleTableHead>
              <SimpleTableHead>Amount</SimpleTableHead>
              <SimpleTableHead>Type</SimpleTableHead>
              <SimpleTableHead>Status</SimpleTableHead>
              <SimpleTableHead>Date</SimpleTableHead>
              <SimpleTableHead>Category</SimpleTableHead>
              <SimpleTableHead>Actions</SimpleTableHead>
            </SimpleTableRow>
          </SimpleTableHeader>
          <SimpleTableBody>
            {isLoading ? (
              <SimpleTableEmpty
                message="Loading transactions..."
                colSpan={10}
              />
            ) : transactions.length === 0 ? (
              <SimpleTableEmpty message="No transactions found." colSpan={10} />
            ) : (
              transactions.map((transaction) => (
                <SimpleTableRow
                  key={transaction.transaction_id}
                  className="border-t border-slate-200 dark:border-white/10"
                >
                  <SimpleTableCell>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {transaction.name}
                    </p>
                    {transaction.transaction_remark ? (
                      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                        {transaction.transaction_remark}
                      </p>
                    ) : null}
                  </SimpleTableCell>
                  <SimpleTableCell className="text-slate-700 dark:text-slate-300">
                    {transaction.paid_by_user_name ?? transaction.paid_by}
                  </SimpleTableCell>
                  <SimpleTableCell className="text-slate-700 dark:text-slate-300">
                    {transaction.created_by_user_name ??
                      transaction.created_by ??
                      "-"}
                  </SimpleTableCell>
                  <SimpleTableCell className="text-slate-700 dark:text-slate-300">
                    {transaction.updated_by_user_name ??
                      transaction.updated_by ??
                      "-"}
                  </SimpleTableCell>
                  <SimpleTableCell className="text-slate-700 dark:text-slate-300">
                    {formatCurrencyAmount(transaction.amount)}
                  </SimpleTableCell>
                  <SimpleTableCell className="text-slate-700 dark:text-slate-300">
                    {transaction.type}
                  </SimpleTableCell>
                  <SimpleTableCell className="text-slate-700 dark:text-slate-300">
                    {transaction.status}
                  </SimpleTableCell>
                  <SimpleTableCell className="text-slate-700 dark:text-slate-300">
                    {formatDateTime(transaction.transaction_date)}
                  </SimpleTableCell>
                  <SimpleTableCell className="text-slate-700 dark:text-slate-300">
                    {transaction.category_label ?? "Uncategorized"}
                  </SimpleTableCell>
                  <SimpleTableCell>
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
                          <Button
                            disabled={isMutating}
                            onClick={() =>
                              void onUpdateStatus(
                                transaction.transaction_id,
                                "completed",
                              )
                            }
                            variant="success"
                            size="sm"
                            className="text-xs"
                          >
                            Mark completed
                          </Button>
                          <Button
                            disabled={isMutating}
                            onClick={() =>
                              void onUpdateStatus(
                                transaction.transaction_id,
                                "cancelled",
                              )
                            }
                            variant="warning"
                            size="sm"
                            className="text-xs"
                          >
                            Cancel
                          </Button>
                        </>
                      ) : null}

                      {canDelete ? (
                        <Button
                          disabled={isMutating}
                          onClick={() =>
                            setDeleteTarget({
                              id: transaction.transaction_id,
                              name: transaction.name,
                            })
                          }
                          variant="danger"
                          size="sm"
                          className="text-xs"
                        >
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </SimpleTableCell>
                </SimpleTableRow>
              ))
            )}
          </SimpleTableBody>
        </table>
      </SimpleTableRoot>

      <section className="app-surface flex items-center justify-between px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
        <span>
          Total: {total} transaction records | Page {currentPage} of {pageCount}
        </span>
        <div className="flex gap-2">
          <Button
            disabled={currentPage <= 1 || isLoading}
            onClick={() =>
              setCurrentPage((previous) => Math.max(previous - 1, 1))
            }
            variant="secondary"
            size="sm"
          >
            Previous
          </Button>
          <Button
            disabled={currentPage >= pageCount || isLoading}
            onClick={() =>
              setCurrentPage((previous) => Math.min(previous + 1, pageCount))
            }
            variant="secondary"
            size="sm"
          >
            Next
          </Button>
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
