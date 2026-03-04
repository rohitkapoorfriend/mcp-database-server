/**
 * MongoDB database adapter using the official MongoDB driver.
 */

import { MongoClient, type Db, type Document } from "mongodb";
import type {
  DatabaseAdapter,
  ColumnInfo,
  TableInfo,
  TableStats,
  RawQueryResult,
} from "./base.js";
import { logger } from "../utils/logger.js";
import type { Config } from "../config.js";

export class MongoDBAdapter implements DatabaseAdapter {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async connect(): Promise<void> {
    const uri = `mongodb://${this.config.dbUser}:${encodeURIComponent(this.config.dbPassword)}@${this.config.dbHost}:${this.config.dbPort}/${this.config.dbName}`;
    this.client = new MongoClient(uri);
    await this.client.connect();
    this.db = this.client.db(this.config.dbName);
    logger.info("Connected to MongoDB", { host: this.config.dbHost, database: this.config.dbName });
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      logger.info("Disconnected from MongoDB");
    }
  }

  getType(): string {
    return "mongodb";
  }

  private getDb(): Db {
    if (!this.db) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.db;
  }

  async executeQuery(query: string, timeout: number): Promise<RawQueryResult> {
    const db = this.getDb();

    // Parse the query as JSON: { collection: "name", operation: "find", filter: {}, limit: N }
    let parsed: {
      collection: string;
      operation?: string;
      filter?: Document;
      limit?: number;
    };

    try {
      parsed = JSON.parse(query);
    } catch {
      throw new Error(
        'MongoDB queries must be JSON format: { "collection": "name", "filter": {}, "limit": 10 }'
      );
    }

    const collection = db.collection(parsed.collection);
    const filter = parsed.filter ?? {};
    const limit = parsed.limit ?? 100;

    const cursor = collection.find(filter).limit(limit).maxTimeMS(timeout);
    const docs = await cursor.toArray();

    if (docs.length === 0) {
      return { columns: [], rows: [], rowCount: 0 };
    }

    // Infer columns from first document
    const columns = Object.keys(docs[0]);
    const rows = docs.map((doc) => {
      const row: Record<string, unknown> = {};
      for (const col of columns) {
        row[col] = doc[col];
      }
      return row;
    });

    return { columns, rows, rowCount: docs.length };
  }

  async getTables(): Promise<string[]> {
    const db = this.getDb();
    const collections = await db.listCollections().toArray();
    return collections.map((c) => c.name).sort();
  }

  async getTableInfo(tableName: string): Promise<TableInfo> {
    const db = this.getDb();
    const collection = db.collection(tableName);

    // Sample documents to infer schema
    const samples = await collection.find().limit(100).toArray();

    // Infer columns from all sampled documents
    const fieldTypes = new Map<string, Set<string>>();
    for (const doc of samples) {
      for (const [key, value] of Object.entries(doc)) {
        if (!fieldTypes.has(key)) {
          fieldTypes.set(key, new Set());
        }
        fieldTypes.get(key)!.add(typeof value);
      }
    }

    const columns: ColumnInfo[] = Array.from(fieldTypes.entries()).map(([name, types]) => ({
      name,
      type: Array.from(types).join(" | "),
      nullable: true,
      defaultValue: null,
      isPrimaryKey: name === "_id",
      isForeignKey: false,
    }));

    // Get indexes
    const rawIndexes = await collection.indexes();
    const indexes = rawIndexes.map((idx) => ({
      name: idx.name ?? "unknown",
      columns: Object.keys(idx.key as Record<string, unknown>),
      isUnique: idx.unique ?? false,
      isPrimary: idx.name === "_id_",
    }));

    const rowCount = await collection.estimatedDocumentCount();

    return {
      name: tableName,
      schema: this.config.dbName,
      columns,
      indexes,
      rowCount,
    };
  }

  async getTableStats(tableName?: string): Promise<TableStats[]> {
    const db = this.getDb();

    if (tableName) {
      const stats = await db.command({ collStats: tableName });
      return [
        {
          tableName,
          rowCount: stats.count as number,
          sizeBytes: stats.size as number,
          columnCount: 0,
          indexCount: stats.nindexes as number,
        },
      ];
    }

    const collections = await db.listCollections().toArray();
    const results: TableStats[] = [];
    for (const col of collections) {
      try {
        const stats = await db.command({ collStats: col.name });
        results.push({
          tableName: col.name,
          rowCount: stats.count as number,
          sizeBytes: stats.size as number,
          columnCount: 0,
          indexCount: stats.nindexes as number,
        });
      } catch {
        results.push({
          tableName: col.name,
          rowCount: 0,
          sizeBytes: null,
          columnCount: 0,
          indexCount: 0,
        });
      }
    }
    return results;
  }

  async getSampleRows(tableName: string, limit: number): Promise<RawQueryResult> {
    const db = this.getDb();
    const docs = await db.collection(tableName).find().limit(limit).toArray();

    if (docs.length === 0) {
      return { columns: [], rows: [], rowCount: 0 };
    }

    const columns = Object.keys(docs[0]);
    const rows = docs.map((doc) => {
      const row: Record<string, unknown> = {};
      for (const col of columns) {
        row[col] = doc[col];
      }
      return row;
    });

    return { columns, rows, rowCount: docs.length };
  }

  async tableExists(tableName: string): Promise<boolean> {
    const db = this.getDb();
    const collections = await db.listCollections({ name: tableName }).toArray();
    return collections.length > 0;
  }

  async getSampleValues(
    tableName: string,
    columnName: string,
    limit: number
  ): Promise<unknown[]> {
    const db = this.getDb();
    const docs = await db
      .collection(tableName)
      .distinct(columnName)
      .then((values) => values.slice(0, limit));
    return docs;
  }
}
