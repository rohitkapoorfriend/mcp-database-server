/**
 * Abstract base interface for database adapters.
 * All database adapters must implement this interface.
 */

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyRef?: {
    table: string;
    column: string;
  };
}

export interface IndexInfo {
  name: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
}

export interface TableInfo {
  name: string;
  schema: string;
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  rowCount: number;
}

export interface TableStats {
  tableName: string;
  rowCount: number;
  sizeBytes: number | null;
  columnCount: number;
  indexCount: number;
}

export interface QueryResultRow {
  [key: string]: unknown;
}

export interface RawQueryResult {
  columns: string[];
  rows: QueryResultRow[];
  rowCount: number;
}

/** Base interface that all database adapters must implement */
export interface DatabaseAdapter {
  /** Connects to the database */
  connect(): Promise<void>;

  /** Disconnects from the database */
  disconnect(): Promise<void>;

  /** Executes a read-only query with a timeout */
  executeQuery(query: string, timeout: number): Promise<RawQueryResult>;

  /** Returns all table names in the given schema */
  getTables(schema?: string): Promise<string[]>;

  /** Returns detailed information about a table */
  getTableInfo(tableName: string): Promise<TableInfo>;

  /** Returns statistics for a table or all tables */
  getTableStats(tableName?: string): Promise<TableStats[]>;

  /** Returns sample rows from a table */
  getSampleRows(tableName: string, limit: number): Promise<RawQueryResult>;

  /** Returns the database type identifier */
  getType(): string;

  /** Checks if a table exists */
  tableExists(tableName: string): Promise<boolean>;

  /** Returns distinct sample values for a column */
  getSampleValues(tableName: string, columnName: string, limit: number): Promise<unknown[]>;
}
