import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const DEFAULT_SUPABASE_URL = "http://127.0.0.1:54321";
const DEFAULT_SUPABASE_KEY = "development-placeholder-key";

function resolveSupabaseUrl(value: string | undefined): string {
  if (!value) {
    return DEFAULT_SUPABASE_URL;
  }

  try {
    new URL(value);
    return value;
  } catch {
    return DEFAULT_SUPABASE_URL;
  }
}

const supabaseUrl = resolveSupabaseUrl(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
);
const supabaseKey = process.env.SUPABASE_SECRET_KEY || DEFAULT_SUPABASE_KEY;

export const supabase = createClient<Database, "public">(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);
