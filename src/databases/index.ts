/**
 * Database factory — returns the correct adapter based on configuration.
 */

import type { DatabaseAdapter } from "./base.js";
import type { Config } from "../config.js";
import { PostgreSQLAdapter } from "./postgresql.js";
import { MySQLAdapter } from "./mysql.js";
import { MongoDBAdapter } from "./mongodb.js";

/** Creates a database adapter based on the configured database type */
export function createDatabaseAdapter(config: Config): DatabaseAdapter {
  switch (config.dbType) {
    case "postgresql":
      return new PostgreSQLAdapter(config);
    case "mysql":
      return new MySQLAdapter(config);
    case "mongodb":
      return new MongoDBAdapter(config);
    default:
      throw new Error(`Unsupported database type: ${config.dbType as string}`);
  }
}

export type { DatabaseAdapter } from "./base.js";
export type {
  ColumnInfo,
  IndexInfo,
  TableInfo,
  TableStats,
  RawQueryResult,
  QueryResultRow,
} from "./base.js";
