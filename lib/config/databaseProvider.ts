export const DATABASE_PROVIDERS = [
  "supabase",
  "sqlite",
  "mysql",
  "mongodb",
] as const;

export type DatabaseProvider = (typeof DATABASE_PROVIDERS)[number];

const DEFAULT_DATABASE_PROVIDER: DatabaseProvider = "supabase";

function isDatabaseProvider(value: string): value is DatabaseProvider {
  return (DATABASE_PROVIDERS as readonly string[]).includes(value);
}

function readDatabaseProviderFromEnv(): DatabaseProvider {
  const rawProvider = process.env.DB_PROVIDER;

  if (!rawProvider || rawProvider.trim().length === 0) {
    return DEFAULT_DATABASE_PROVIDER;
  }

  const normalized = rawProvider.trim().toLowerCase();

  if (isDatabaseProvider(normalized)) {
    return normalized;
  }

  throw new Error(
    `Invalid DB_PROVIDER value: ${rawProvider}. Supported values: ${DATABASE_PROVIDERS.join(", ")}`,
  );
}

function assertProviderEnvRequirements(provider: DatabaseProvider): void {
  if (provider === "supabase") {
    return;
  }

  if (provider === "sqlite") {
    const sqlitePath = process.env.SQLITE_DB_PATH;

    if (!sqlitePath || sqlitePath.trim().length === 0) {
      throw new Error("DB_PROVIDER=sqlite requires SQLITE_DB_PATH to be set.");
    }

    return;
  }

  if (provider === "mysql") {
    const mysqlUrl = process.env.MYSQL_DATABASE_URL;

    if (!mysqlUrl || mysqlUrl.trim().length === 0) {
      throw new Error(
        "DB_PROVIDER=mysql requires MYSQL_DATABASE_URL to be set.",
      );
    }

    return;
  }

  if (provider === "mongodb") {
    const mongodbUrl = process.env.MONGODB_URL;

    if (!mongodbUrl || mongodbUrl.trim().length === 0) {
      throw new Error("DB_PROVIDER=mongodb requires MONGODB_URL to be set.");
    }
  }
}

let cachedProvider: DatabaseProvider | null = null;

export function getDatabaseProvider(): DatabaseProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const provider = readDatabaseProviderFromEnv();
  assertProviderEnvRequirements(provider);
  cachedProvider = provider;

  return provider;
}
