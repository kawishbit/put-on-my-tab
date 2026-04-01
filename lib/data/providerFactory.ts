import {
  type DatabaseProvider,
  getDatabaseProvider,
} from "@/lib/config/databaseProvider";

export interface DatabaseProviderDescriptor {
  provider: DatabaseProvider;
  driver: "supabase-postgres" | "sqlite" | "mysql" | "mongodb";
  implemented: boolean;
}

const PROVIDER_DESCRIPTORS: Record<
  DatabaseProvider,
  DatabaseProviderDescriptor
> = {
  supabase: {
    provider: "supabase",
    driver: "supabase-postgres",
    implemented: true,
  },
  sqlite: {
    provider: "sqlite",
    driver: "sqlite",
    implemented: false,
  },
  mysql: {
    provider: "mysql",
    driver: "mysql",
    implemented: false,
  },
  mongodb: {
    provider: "mongodb",
    driver: "mongodb",
    implemented: false,
  },
};

export function getActiveProviderDescriptor(): DatabaseProviderDescriptor {
  const provider = getDatabaseProvider();
  const descriptor = PROVIDER_DESCRIPTORS[provider];

  if (!descriptor.implemented) {
    throw new Error(
      `DB_PROVIDER=${provider} is configured, but this provider is not implemented yet. Current implemented provider: supabase.`,
    );
  }

  return descriptor;
}
