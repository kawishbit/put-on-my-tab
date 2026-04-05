import { ApiError } from "@/lib/api/errors";
import { supabase } from "@/lib/supabaseServer";

interface UserBalanceRow {
  user_id: string;
  name: string;
  current_balance: number;
}

interface DepositTransactionRow {
  transaction_id: string;
  group_key: string;
  name: string;
  paid_by: string;
  amount: number;
  status: "pending" | "completed" | "cancelled";
  category: string | null;
  transaction_date: string;
  created_at: string;
}

interface UserTransactionRow {
  transaction_id: string;
  name: string;
  amount: number;
  status: "pending" | "completed" | "cancelled";
  category: string | null;
  type: "deposit" | "withdraw";
  transaction_date: string;
  created_at: string;
}

interface CategoryRow {
  transaction_category_id: string;
  label: string;
}

export interface AdminDashboardSummary {
  totalTransactions: number;
  totalSystemBalance: number;
  activeUsers: number;
  pendingTransactions: number;
}

export interface BalanceOverviewItem {
  userId: string;
  name: string;
  balance: number;
}

export interface MonthlyExpenditurePoint {
  monthKey: string;
  monthLabel: string;
  amount: number;
}

export interface RecentTransactionItem {
  transactionId: string;
  name: string;
  paidByUserName: string;
  amount: number;
  status: "pending" | "completed" | "cancelled";
  categoryLabel: string;
  createdAt: string;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  label: string;
  amount: number;
  percentage: number;
}

export interface TopSpenderItem {
  userId: string;
  name: string;
  spent: number;
}

export interface FrequentCategoryItem {
  categoryId: string;
  label: string;
  count: number;
}

export interface UserDashboardSummary {
  currentBalance: number;
}

export interface UserRecentTransactionItem {
  transactionId: string;
  name: string;
  amount: number;
  status: "pending" | "completed" | "cancelled";
  categoryLabel: string;
  createdAt: string;
}

export interface UserDashboardData {
  summary: UserDashboardSummary;
  monthlyExpenditure: MonthlyExpenditurePoint[];
  recentTransactions: UserRecentTransactionItem[];
  categoryBreakdown: CategoryBreakdownItem[];
}

export interface AdminDashboardData {
  summary: AdminDashboardSummary;
  balances: BalanceOverviewItem[];
  monthlyExpenditure: MonthlyExpenditurePoint[];
  monthlyComparison: {
    currentMonthAmount: number;
    previousMonthAmount: number;
    percentChange: number | null;
    currentMonthLabel: string;
    previousMonthLabel: string;
  };
  recentTransactions: RecentTransactionItem[];
  categoryBreakdown: CategoryBreakdownItem[];
  topSpenders: TopSpenderItem[];
  frequentCategories: FrequentCategoryItem[];
}

function formatMonthKey(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getMonthLabel(monthKey: string): string {
  const [yearRaw, monthRaw] = monthKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return monthKey;
  }

  const value = new Date(Date.UTC(year, month - 1, 1));

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(value);
}

function getCurrentAndPreviousMonthKeys(referenceDate: Date): {
  currentMonthKey: string;
  previousMonthKey: string;
} {
  const current = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1),
  );
  const previous = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth() - 1,
      1,
    ),
  );

  return {
    currentMonthKey: formatMonthKey(current),
    previousMonthKey: formatMonthKey(previous),
  };
}

function getRecentMonthKeys(
  referenceDate: Date,
  monthsCount: number,
): string[] {
  const keys: string[] = [];
  const base = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1),
  );

  for (let offset = monthsCount - 1; offset >= 0; offset -= 1) {
    const month = new Date(
      Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - offset, 1),
    );
    keys.push(formatMonthKey(month));
  }

  return keys;
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const [usersResult, depositsResult, categoriesResult] = await Promise.all([
    supabase
      .from("users")
      .select("user_id,name,current_balance")
      .eq("is_deleted", false)
      .order("current_balance", { ascending: false }),
    supabase
      .from("transactions")
      .select(
        "transaction_id,group_key,name,paid_by,amount,status,category,transaction_date,created_at",
      )
      .eq("is_deleted", false)
      .eq("type", "deposit")
      .order("transaction_date", { ascending: false }),
    supabase
      .from("transaction_categories")
      .select("transaction_category_id,label")
      .eq("is_deleted", false),
  ]);

  if (usersResult.error) {
    throw new ApiError(
      500,
      "dashboard_users_fetch_failed",
      usersResult.error.message,
      usersResult.error,
    );
  }

  if (depositsResult.error) {
    throw new ApiError(
      500,
      "dashboard_transactions_fetch_failed",
      depositsResult.error.message,
      depositsResult.error,
    );
  }

  if (categoriesResult.error) {
    throw new ApiError(
      500,
      "dashboard_categories_fetch_failed",
      categoriesResult.error.message,
      categoriesResult.error,
    );
  }

  const users = (usersResult.data ?? []) as UserBalanceRow[];
  const deposits = (depositsResult.data ?? []) as DepositTransactionRow[];
  const categories = (categoriesResult.data ?? []) as CategoryRow[];

  const usersById = new Map(users.map((user) => [user.user_id, user]));
  const categoriesById = new Map(
    categories.map((category) => [category.transaction_category_id, category]),
  );

  const totalSystemBalance = users.reduce(
    (sum, user) => sum + Number(user.current_balance ?? 0),
    0,
  );

  const summary: AdminDashboardSummary = {
    totalTransactions: deposits.length,
    totalSystemBalance,
    activeUsers: users.length,
    pendingTransactions: deposits.filter(
      (transaction) => transaction.status === "pending",
    ).length,
  };

  const balances: BalanceOverviewItem[] = users
    .map((user) => ({
      userId: user.user_id,
      name: user.name,
      balance: Number(user.current_balance ?? 0),
    }))
    .sort(
      (left, right) =>
        right.balance - left.balance || left.name.localeCompare(right.name),
    );

  const completedDeposits = deposits.filter(
    (transaction) => transaction.status === "completed",
  );

  const monthlyTotals = new Map<string, number>();

  for (const transaction of completedDeposits) {
    const monthKey = formatMonthKey(new Date(transaction.transaction_date));
    monthlyTotals.set(
      monthKey,
      (monthlyTotals.get(monthKey) ?? 0) + Number(transaction.amount),
    );
  }

  const recentMonthKeys = new Set(getRecentMonthKeys(new Date(), 7));

  const monthlyExpenditure: MonthlyExpenditurePoint[] = Array.from(
    monthlyTotals.entries(),
  )
    .filter(([monthKey]) => recentMonthKeys.has(monthKey))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([monthKey, amount]) => ({
      monthKey,
      monthLabel: getMonthLabel(monthKey),
      amount,
    }));

  const monthKeys = getCurrentAndPreviousMonthKeys(new Date());
  const currentMonthAmount = monthlyTotals.get(monthKeys.currentMonthKey) ?? 0;
  const previousMonthAmount =
    monthlyTotals.get(monthKeys.previousMonthKey) ?? 0;

  const monthlyComparison = {
    currentMonthAmount,
    previousMonthAmount,
    percentChange:
      previousMonthAmount === 0
        ? currentMonthAmount === 0
          ? 0
          : null
        : ((currentMonthAmount - previousMonthAmount) / previousMonthAmount) *
          100,
    currentMonthLabel: getMonthLabel(monthKeys.currentMonthKey),
    previousMonthLabel: getMonthLabel(monthKeys.previousMonthKey),
  };

  const recentTransactions: RecentTransactionItem[] = deposits
    .slice(0, 10)
    .map((transaction) => ({
      transactionId: transaction.transaction_id,
      name: transaction.name,
      paidByUserName:
        usersById.get(transaction.paid_by)?.name ?? "Unknown user",
      amount: Number(transaction.amount),
      status: transaction.status,
      categoryLabel: transaction.category
        ? (categoriesById.get(transaction.category)?.label ??
          "Unknown category")
        : "Uncategorized",
      createdAt: transaction.transaction_date,
    }));

  const categoryAmountMap = new Map<string, number>();

  for (const transaction of completedDeposits) {
    const key = transaction.category ?? "uncategorized";
    categoryAmountMap.set(
      key,
      (categoryAmountMap.get(key) ?? 0) + Number(transaction.amount),
    );
  }

  const totalCategorizedAmount = Array.from(categoryAmountMap.values()).reduce(
    (sum, amount) => sum + amount,
    0,
  );

  const categoryBreakdown: CategoryBreakdownItem[] = Array.from(
    categoryAmountMap.entries(),
  )
    .map(([categoryId, amount]) => ({
      categoryId,
      label:
        categoryId === "uncategorized"
          ? "Uncategorized"
          : (categoriesById.get(categoryId)?.label ?? "Unknown category"),
      amount,
      percentage:
        totalCategorizedAmount > 0
          ? (amount / totalCategorizedAmount) * 100
          : 0,
    }))
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 6);

  const spenderMap = new Map<string, number>();

  for (const transaction of completedDeposits) {
    spenderMap.set(
      transaction.paid_by,
      (spenderMap.get(transaction.paid_by) ?? 0) + Number(transaction.amount),
    );
  }

  const topSpenders: TopSpenderItem[] = Array.from(spenderMap.entries())
    .map(([userId, spent]) => ({
      userId,
      name: usersById.get(userId)?.name ?? "Unknown user",
      spent,
    }))
    .sort((left, right) => right.spent - left.spent)
    .slice(0, 5);

  const categoryFrequencyMap = new Map<string, number>();

  for (const transaction of deposits) {
    const key = transaction.category ?? "uncategorized";
    categoryFrequencyMap.set(key, (categoryFrequencyMap.get(key) ?? 0) + 1);
  }

  const frequentCategories: FrequentCategoryItem[] = Array.from(
    categoryFrequencyMap.entries(),
  )
    .map(([categoryId, count]) => ({
      categoryId,
      label:
        categoryId === "uncategorized"
          ? "Uncategorized"
          : (categoriesById.get(categoryId)?.label ?? "Unknown category"),
      count,
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  return {
    summary,
    balances,
    monthlyExpenditure,
    monthlyComparison,
    recentTransactions,
    categoryBreakdown,
    topSpenders,
    frequentCategories,
  };
}

export async function getUserDashboardData(
  userId: string,
): Promise<UserDashboardData> {
  const [userResult, transactionsResult, categoriesResult] = await Promise.all([
    supabase
      .from("users")
      .select("current_balance")
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select(
        "transaction_id,name,amount,status,category,type,transaction_date,created_at",
      )
      .eq("is_deleted", false)
      .eq("paid_by", userId)
      .eq("type", "withdraw")
      .order("transaction_date", { ascending: false }),
    supabase
      .from("transaction_categories")
      .select("transaction_category_id,label")
      .eq("is_deleted", false),
  ]);

  if (userResult.error) {
    throw new ApiError(
      500,
      "dashboard_user_fetch_failed",
      userResult.error.message,
      userResult.error,
    );
  }

  if (!userResult.data) {
    throw new ApiError(404, "user_not_found", "User was not found");
  }

  const userBalance = userResult.data as { current_balance: number };

  if (transactionsResult.error) {
    throw new ApiError(
      500,
      "dashboard_user_transactions_fetch_failed",
      transactionsResult.error.message,
      transactionsResult.error,
    );
  }

  if (categoriesResult.error) {
    throw new ApiError(
      500,
      "dashboard_categories_fetch_failed",
      categoriesResult.error.message,
      categoriesResult.error,
    );
  }

  const transactions = (transactionsResult.data ?? []) as UserTransactionRow[];
  const categories = (categoriesResult.data ?? []) as CategoryRow[];

  const categoriesById = new Map(
    categories.map((category) => [category.transaction_category_id, category]),
  );

  const completedTransactions = transactions.filter(
    (transaction) => transaction.status === "completed",
  );

  const monthlyTotals = new Map<string, number>();

  for (const transaction of completedTransactions) {
    const monthKey = formatMonthKey(new Date(transaction.transaction_date));
    monthlyTotals.set(
      monthKey,
      (monthlyTotals.get(monthKey) ?? 0) + Number(transaction.amount),
    );
  }

  const recentMonthKeys = new Set(getRecentMonthKeys(new Date(), 7));

  const monthlyExpenditure: MonthlyExpenditurePoint[] = Array.from(
    monthlyTotals.entries(),
  )
    .filter(([monthKey]) => recentMonthKeys.has(monthKey))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([monthKey, amount]) => ({
      monthKey,
      monthLabel: getMonthLabel(monthKey),
      amount,
    }));

  const recentTransactions: UserRecentTransactionItem[] = transactions
    .slice(0, 10)
    .map((transaction) => ({
      transactionId: transaction.transaction_id,
      name: transaction.name,
      amount: Number(transaction.amount),
      status: transaction.status,
      categoryLabel: transaction.category
        ? (categoriesById.get(transaction.category)?.label ??
          "Unknown category")
        : "Uncategorized",
      createdAt: transaction.transaction_date,
    }));

  const categoryTotals = new Map<string, number>();

  for (const transaction of completedTransactions) {
    const key = transaction.category ?? "uncategorized";
    categoryTotals.set(
      key,
      (categoryTotals.get(key) ?? 0) + Number(transaction.amount),
    );
  }

  const totalCategoryAmount = Array.from(categoryTotals.values()).reduce(
    (sum, value) => sum + value,
    0,
  );

  const categoryBreakdown: CategoryBreakdownItem[] = Array.from(
    categoryTotals.entries(),
  )
    .map(([categoryId, amount]) => ({
      categoryId,
      label:
        categoryId === "uncategorized"
          ? "Uncategorized"
          : (categoriesById.get(categoryId)?.label ?? "Unknown category"),
      amount,
      percentage:
        totalCategoryAmount > 0 ? (amount / totalCategoryAmount) * 100 : 0,
    }))
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 6);

  return {
    summary: {
      currentBalance: Number(userBalance.current_balance ?? 0),
    },
    monthlyExpenditure,
    recentTransactions,
    categoryBreakdown,
  };
}
