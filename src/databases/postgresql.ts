import pg from "pg";
import type {
  DatabaseAdapter,
  ColumnInfo,
  IndexInfo,
  TableInfo,
  TableStats,
  RawQueryResult,
} from "./base.js";
import { logger } from "../utils/logger.js";
import type { Config } from "../config.js";

export class PostgreSQLAdapter implements DatabaseAdapter {
  private pool: pg.Pool | null = null;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async connect(): Promise<void> {
    this.pool = new pg.Pool({
      host: this.config.dbHost,
      port: this.config.dbPort,
      database: this.config.dbName,
      user: this.config.dbUser,
      password: this.config.dbPassword,
      ssl: this.config.dbSsl ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
    });

    const client = await this.pool.connect();
    client.release();
    logger.info("Connected to PostgreSQL", { host: this.config.dbHost, database: this.config.dbName });
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info("Disconnected from PostgreSQL");
    }
  }

  getType(): string {
    return "postgresql";
  }

  private getPool(): pg.Pool {
    if (!this.pool) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.pool;
  }

  async executeQuery(query: string, timeout: number): Promise<RawQueryResult> {
    const pool = this.getPool();
    const result = await pool.query({
      text: query,
      statement_timeout: timeout,
    } as pg.QueryConfig);

    const columns = result.fields.map((f) => f.name);
    return {
      columns,
      rows: result.rows as Record<string, unknown>[],
      rowCount: result.rowCount ?? 0,
    };
  }

  async getTables(schema: string = "public"): Promise<string[]> {
    const pool = this.getPool();
    const result = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = $1 AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
      [schema]
    );
    return result.rows.map((r: Record<string, unknown>) => r.table_name as string);
  }

  async getTableInfo(tableName: string): Promise<TableInfo> {
    const pool = this.getPool();

    const colResult = await pool.query(
      `SELECT
        c.column_name, c.data_type, c.is_nullable, c.column_default,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
        CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key,
        fk.foreign_table_name, fk.foreign_column_name
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.column_name = pk.column_name
      LEFT JOIN (
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = $1 AND tc.constraint_type = 'FOREIGN KEY'
      ) fk ON c.column_name = fk.column_name
      WHERE c.table_name = $1
      ORDER BY c.ordinal_position`,
      [tableName]
    );

    const columns: ColumnInfo[] = colResult.rows.map((r: Record<string, unknown>) => ({
      name: r.column_name as string,
      type: r.data_type as string,
      nullable: r.is_nullable === "YES",
      defaultValue: r.column_default as string | null,
      isPrimaryKey: r.is_primary_key as boolean,
      isForeignKey: r.is_foreign_key as boolean,
      ...(r.is_foreign_key
        ? {
            foreignKeyRef: {
              table: r.foreign_table_name as string,
              column: r.foreign_column_name as string,
            },
          }
        : {}),
    }));

    const idxResult = await pool.query(
      `SELECT
        i.relname as index_name,
        array_agg(a.attname ORDER BY k.n) as columns,
        ix.indisunique as is_unique,
        ix.indisprimary as is_primary
      FROM pg_index ix
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      CROSS JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS k(attnum, n)
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
      WHERE t.relname = $1
      GROUP BY i.relname, ix.indisunique, ix.indisprimary`,
      [tableName]
    );

    const indexes: IndexInfo[] = idxResult.rows.map((r: Record<string, unknown>) => {
      // array_agg can return a JS array or a Postgres "{col1,col2}" string
      // depending on the pg driver version — normalise both cases
      let cols: string[];
      const raw = r.columns;
      if (Array.isArray(raw)) {
        cols = raw as string[];
      } else if (typeof raw === "string") {
        // strip curly braces and split: "{id,name}" → ["id", "name"]
        cols = raw.replace(/^\{/, "").replace(/\}$/, "").split(",").filter(Boolean);
      } else {
        cols = [];
      }

      return {
        name: r.index_name as string,
        columns: cols,
        isUnique: r.is_unique as boolean,
        isPrimary: r.is_primary as boolean,
      };
    });

    const countResult = await pool.query(
      `SELECT reltuples::bigint AS estimate FROM pg_class WHERE relname = $1`,
      [tableName]
    );
    const rowCount = countResult.rows[0]
      ? Number(countResult.rows[0].estimate as string | number)
      : 0;

    return {
      name: tableName,
      schema: "public",
      columns,
      indexes,
      rowCount: Math.max(0, rowCount),
    };
  }

  async getTableStats(tableName?: string): Promise<TableStats[]> {
    const pool = this.getPool();

    let query: string;
    let params: string[];

    if (tableName) {
      query = `SELECT
        c.relname as table_name,
        c.reltuples::bigint as row_count,
        pg_total_relation_size(c.oid) as size_bytes,
        (SELECT count(*) FROM information_schema.columns ic WHERE ic.table_name = c.relname) as column_count,
        (SELECT count(*) FROM pg_index i WHERE i.indrelid = c.oid) as index_count
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = $1 AND n.nspname = 'public' AND c.relkind = 'r'`;
      params = [tableName];
    } else {
      query = `SELECT
        c.relname as table_name,
        c.reltuples::bigint as row_count,
        pg_total_relation_size(c.oid) as size_bytes,
        (SELECT count(*) FROM information_schema.columns ic WHERE ic.table_name = c.relname) as column_count,
        (SELECT count(*) FROM pg_index i WHERE i.indrelid = c.oid) as index_count
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname`;
      params = [];
    }

    const result = await pool.query(query, params);

    return result.rows.map((r: Record<string, unknown>) => ({
      tableName: r.table_name as string,
      rowCount: Math.max(0, Number(r.row_count as string | number)),
      sizeBytes: Number(r.size_bytes as string | number),
      columnCount: Number(r.column_count as string | number),
      indexCount: Number(r.index_count as string | number),
    }));
  }

  async getSampleRows(tableName: string, limit: number): Promise<RawQueryResult> {
    return this.executeQuery(
      `SELECT * FROM "${tableName}" LIMIT ${limit}`,
      this.config.queryTimeout
    );
  }

  async tableExists(tableName: string): Promise<boolean> {
    const pool = this.getPool();
    const result = await pool.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = $1 AND table_schema = 'public'
      ) as exists`,
      [tableName]
    );
    return result.rows[0]?.exists as boolean;
  }

  async getSampleValues(
    tableName: string,
    columnName: string,
    limit: number
  ): Promise<unknown[]> {
    const pool = this.getPool();
    const result = await pool.query(
      `SELECT DISTINCT "${columnName}" FROM "${tableName}" WHERE "${columnName}" IS NOT NULL LIMIT $1`,
      [limit]
    );
    return result.rows.map((r: Record<string, unknown>) => r[columnName]);
  }
}