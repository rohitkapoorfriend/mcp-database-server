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

export interface DatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  executeQuery(query: string, timeout: number): Promise<RawQueryResult>;
  getTables(schema?: string): Promise<string[]>;
  getTableInfo(tableName: string): Promise<TableInfo>;
  getTableStats(tableName?: string): Promise<TableStats[]>;
  getSampleRows(tableName: string, limit: number): Promise<RawQueryResult>;
  getType(): string;
  tableExists(tableName: string): Promise<boolean>;
  getSampleValues(tableName: string, columnName: string, limit: number): Promise<unknown[]>;
}
