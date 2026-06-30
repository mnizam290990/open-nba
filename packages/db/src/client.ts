import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  const client = postgres(connectionString, {
    max: process.env.NODE_ENV === "production" ? 10 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzle(client, { schema, logger: process.env.NODE_ENV === "development" });
}

type DbInstance = ReturnType<typeof createDb>;

let _db: DbInstance | undefined;

function getDb(): DbInstance {
  return (_db ??= createDb());
}

/**
 * Lazy database proxy — does not connect until the first query is executed.
 * This allows Next.js to import the module at build time without a DATABASE_URL.
 */
export const db = new Proxy({} as DbInstance, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
  has(_target, prop) {
    return Reflect.has(getDb(), prop);
  },
  getPrototypeOf(_target) {
    return Reflect.getPrototypeOf(getDb());
  },
});

export type Db = DbInstance;
