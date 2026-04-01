// =============================================================================
// Database Types — mirrors the Supabase schema defined in migrations/
// =============================================================================

export type UserPolicy = "user" | "mod" | "admin";
export type TransactionType = "deposit" | "withdraw";
export type TransactionStatus = "pending" | "completed" | "cancelled";
export type ProviderType = "google" | "github" | "credentials";

// -----------------------------------------------------------------------------
// transaction_categories
// -----------------------------------------------------------------------------
export interface TransactionCategory {
  transaction_category_id: string;
  label: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  remarks: string | null;
}

export type TransactionCategoryInsert = Omit<
  TransactionCategory,
  "transaction_category_id" | "created_at" | "updated_at"
>;

export type TransactionCategoryUpdate = Partial<
  Omit<
    TransactionCategory,
    "transaction_category_id" | "created_at" | "updated_at"
  >
>;

// -----------------------------------------------------------------------------
// users
// -----------------------------------------------------------------------------
export interface User {
  user_id: string;
  name: string;
  email: string;
  /** bcrypt hash — never expose on the client */
  password: string;
  avatar: string | null;
  current_balance: number;
  last_login_date: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  remarks: string | null;
  policy: UserPolicy;
}

export type UserInsert = Omit<User, "user_id" | "created_at" | "updated_at">;
export type UserUpdate = Partial<
  Omit<User, "user_id" | "created_at" | "updated_at">
>;

/** Safe user shape — excludes the password hash */
export type PublicUser = Omit<User, "password">;

// -----------------------------------------------------------------------------
// user_login_providers
// -----------------------------------------------------------------------------
export interface UserLoginProvider {
  user_login_provider_id: string;
  user_id: string;
  provider_type: ProviderType;
  provider_key: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  remarks: string | null;
}

export type UserLoginProviderInsert = Omit<
  UserLoginProvider,
  "user_login_provider_id" | "created_at" | "updated_at"
>;

export type UserLoginProviderUpdate = Partial<
  Omit<
    UserLoginProvider,
    "user_login_provider_id" | "created_at" | "updated_at"
  >
>;

// -----------------------------------------------------------------------------
// transactions
// -----------------------------------------------------------------------------
export interface Transaction {
  transaction_id: string;
  name: string;
  transaction_remark: string | null;
  paid_by: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  /** UUID that groups the 1 deposit + N withdraw records for a single expense */
  group_key: string;
  category: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  remarks: string | null;
}

export type TransactionInsert = Omit<
  Transaction,
  "transaction_id" | "created_at" | "updated_at"
>;
export type TransactionUpdate = Partial<
  Omit<Transaction, "transaction_id" | "created_at" | "updated_at">
>;

// -----------------------------------------------------------------------------
// Supabase database schema type (for createClient<Database>())
// -----------------------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
        Relationships: [];
      };
      user_login_providers: {
        Row: UserLoginProvider;
        Insert: UserLoginProviderInsert;
        Update: UserLoginProviderUpdate;
        Relationships: [];
      };
      transactions: {
        Row: Transaction;
        Insert: TransactionInsert;
        Update: TransactionUpdate;
        Relationships: [];
      };
      transaction_categories: {
        Row: TransactionCategory;
        Insert: TransactionCategoryInsert;
        Update: TransactionCategoryUpdate;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      create_split_transaction: {
        Args: {
          p_name: string;
          p_transaction_remark: string | null;
          p_paid_by: string;
          p_amount: number;
          p_parties: string[];
          p_category: string | null;
          p_status: TransactionStatus;
        };
        Returns: {
          group_key: string;
          transaction_ids: string[];
        }[];
      };
      update_split_transaction: {
        Args: {
          p_transaction_id: string;
          p_name: string;
          p_transaction_remark: string | null;
          p_paid_by: string;
          p_amount: number;
          p_parties: string[];
          p_category: string | null;
          p_status: TransactionStatus;
        };
        Returns: {
          group_key: string;
          transaction_ids: string[];
        }[];
      };
      soft_delete_transaction_group: {
        Args: {
          p_transaction_id: string;
        };
        Returns: {
          group_key: string;
          transaction_ids: string[];
        }[];
      };
      update_transaction_group_status: {
        Args: {
          p_transaction_id: string;
          p_status: TransactionStatus;
        };
        Returns: unknown;
      };
      recompute_user_balances: {
        Args: Record<string, never>;
        Returns: unknown;
      };
    };
    Enums: {
      user_policy: UserPolicy;
      transaction_type: TransactionType;
      transaction_status: TransactionStatus;
      provider_type: ProviderType;
    };
    CompositeTypes: Record<never, never>;
  };
}
