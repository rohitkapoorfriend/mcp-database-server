/**
 * MySQL database adapter using mysql2 driver.
 */

import mysql from "mysql2/promise";
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

export class MySQLAdapter implements DatabaseAdapter {
  private pool: mysql.Pool | null = null;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async connect(): Promise<void> {
    this.pool = mysql.createPool({
      host: this.config.dbHost,
      port: this.config.dbPort,
      database: this.config.dbName,
      user: this.config.dbUser,
      password: this.config.dbPassword,
      ssl: this.config.dbSsl ? {} : undefined,
      connectionLimit: 10,
      waitForConnections: true,
    });

    // Test connection
    const conn = await this.pool.getConnection();
    conn.release();
    logger.info("Connected to MySQL", { host: this.config.dbHost, database: this.config.dbName });
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info("Disconnected from MySQL");
    }
  }

  getType(): string {
    return "mysql";
  }

  private getPool(): mysql.Pool {
    if (!this.pool) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.pool;
  }

  async executeQuery(query: string, timeout: number): Promise<RawQueryResult> {
    const pool = this.getPool();
    const [rows, fields] = await pool.query({ sql: query, timeout });

    const resultRows = rows as Record<string, unknown>[];
    const columns = (fields as mysql.FieldPacket[]).map((f) => f.name);

    return {
      columns,
      rows: resultRows,
      rowCount: resultRows.length,
    };
  }

  async getTables(schema?: string): Promise<string[]> {
    const pool = this.getPool();
    const dbName = schema ?? this.config.dbName;
    const [rows] = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = ? AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
      [dbName]
    );
    return (rows as Record<string, unknown>[]).map((r) => r.TABLE_NAME as string);
  }

  async getTableInfo(tableName: string): Promise<TableInfo> {
    const pool = this.getPool();

    // Get columns
    const [colRows] = await pool.query(
      `SELECT
        COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
      FROM information_schema.columns
      WHERE table_schema = ? AND table_name = ?
      ORDER BY ORDINAL_POSITION`,
      [this.config.dbName, tableName]
    );

    // Get foreign keys
    const [fkRows] = await pool.query(
      `SELECT
        COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM information_schema.key_column_usage
      WHERE table_schema = ? AND table_name = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [this.config.dbName, tableName]
    );

    const fkMap = new Map<string, { table: string; column: string }>();
    for (const fk of fkRows as Record<string, unknown>[]) {
      fkMap.set(fk.COLUMN_NAME as string, {
        table: fk.REFERENCED_TABLE_NAME as string,
        column: fk.REFERENCED_COLUMN_NAME as string,
      });
    }

    const columns: ColumnInfo[] = (colRows as Record<string, unknown>[]).map((r) => {
      const fkRef = fkMap.get(r.COLUMN_NAME as string);
      return {
        name: r.COLUMN_NAME as string,
        type: r.DATA_TYPE as string,
        nullable: r.IS_NULLABLE === "YES",
        defaultValue: r.COLUMN_DEFAULT as string | null,
        isPrimaryKey: r.COLUMN_KEY === "PRI",
        isForeignKey: !!fkRef,
        ...(fkRef ? { foreignKeyRef: fkRef } : {}),
      };
    });

    // Get indexes
    const [idxRows] = await pool.query(`SHOW INDEX FROM \`${tableName}\``);
    const indexMap = new Map<string, IndexInfo>();
    for (const row of idxRows as Record<string, unknown>[]) {
      const name = row.Key_name as string;
      if (!indexMap.has(name)) {
        indexMap.set(name, {
          name,
          columns: [],
          isUnique: (row.Non_unique as number) === 0,
          isPrimary: name === "PRIMARY",
        });
      }
      indexMap.get(name)!.columns.push(row.Column_name as string);
    }

    // Get row count estimate
    const [countRows] = await pool.query(
      `SELECT TABLE_ROWS FROM information_schema.tables WHERE table_schema = ? AND table_name = ?`,
      [this.config.dbName, tableName]
    );
    const rowCount = (countRows as Record<string, unknown>[])[0]?.TABLE_ROWS as number ?? 0;

    return {
      name: tableName,
      schema: this.config.dbName,
      columns,
      indexes: Array.from(indexMap.values()),
      rowCount,
    };
  }

  async getTableStats(tableName?: string): Promise<TableStats[]> {
    const pool = this.getPool();

    let query = `SELECT
      TABLE_NAME as table_name,
      TABLE_ROWS as row_count,
      DATA_LENGTH + INDEX_LENGTH as size_bytes,
      (SELECT count(*) FROM information_schema.columns c WHERE c.table_schema = t.TABLE_SCHEMA AND c.table_name = t.TABLE_NAME) as column_count
    FROM information_schema.tables t
    WHERE table_schema = ?`;
    const params: string[] = [this.config.dbName];

    if (tableName) {
      query += ` AND TABLE_NAME = ?`;
      params.push(tableName);
    }
    query += ` ORDER BY TABLE_NAME`;

    const [rows] = await pool.query(query, params);

    return (rows as Record<string, unknown>[]).map((r) => ({
      tableName: r.table_name as string,
      rowCount: Number(r.row_count ?? 0),
      sizeBytes: Number(r.size_bytes ?? 0),
      columnCount: Number(r.column_count ?? 0),
      indexCount: 0,
    }));
  }

  async getSampleRows(tableName: string, limit: number): Promise<RawQueryResult> {
    return this.executeQuery(
      `SELECT * FROM \`${tableName}\` LIMIT ${limit}`,
      this.config.queryTimeout
    );
  }

  async tableExists(tableName: string): Promise<boolean> {
    const pool = this.getPool();
    const [rows] = await pool.query(
      `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = ?`,
      [this.config.dbName, tableName]
    );
    return ((rows as Record<string, unknown>[])[0]?.cnt as number) > 0;
  }

  async getSampleValues(
    tableName: string,
    columnName: string,
    limit: number
  ): Promise<unknown[]> {
    const pool = this.getPool();
    const [rows] = await pool.query(
      `SELECT DISTINCT \`${columnName}\` FROM \`${tableName}\` WHERE \`${columnName}\` IS NOT NULL LIMIT ?`,
      [limit]
    );
    return (rows as Record<string, unknown>[]).map((r) => r[columnName]);
  }
}
