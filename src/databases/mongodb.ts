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
    // Support a direct connection URI via MONGO_URI env var, falling back to
    // building one from individual DB_HOST / DB_PORT / DB_USER / DB_PASSWORD fields.
    const uri =
      process.env.MONGO_URI ??
      `mongodb://${this.config.dbUser}:${encodeURIComponent(this.config.dbPassword)}@${this.config.dbHost}:${this.config.dbPort}/${this.config.dbName}`;

    this.client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });

    try {
      await this.client.connect();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `MongoDB connection failed: ${message}. ` +
        `Check that DB_HOST, DB_PORT, DB_USER, DB_PASSWORD are correct, or set MONGO_URI directly.`
      );
    }

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

    // Accept queries as JSON: { collection, filter, limit, sort }
    let parsed: {
      collection: string;
      operation?: string;
      filter?: Document;
      sort?: Document;
      limit?: number;
    };

    try {
      parsed = JSON.parse(query);
    } catch {
      throw new Error(
        'MongoDB queries must be JSON. Example:\n' +
        '{ "collection": "users", "filter": { "age": { "$gt": 25 } }, "limit": 10, "sort": { "name": 1 } }'
      );
    }

    if (!parsed.collection) {
      throw new Error('MongoDB query must include a "collection" field.');
    }

    const collection = db.collection(parsed.collection);
    const filter = parsed.filter ?? {};
    const limit = parsed.limit ?? 100;
    const sort = parsed.sort ?? {};

    const cursor = collection
      .find(filter)
      .sort(sort)
      .limit(limit)
      .maxTimeMS(timeout);

    const docs = await cursor.toArray();

    if (docs.length === 0) {
      return { columns: [], rows: [], rowCount: 0 };
    }

    // union all keys across all documents (documents can differ in a schemaless DB)
    const columnSet = new Set<string>();
    for (const doc of docs) {
      for (const key of Object.keys(doc)) {
        columnSet.add(key);
      }
    }
    const columns = Array.from(columnSet);

    const rows = docs.map((doc) => {
      const row: Record<string, unknown> = {};
      for (const col of columns) {
        row[col] = col in doc ? doc[col] : null;
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

    // infer schema from a sample of documents since mongo is schemaless
    const samples = await collection.find().limit(100).toArray();
    const fieldTypes = new Map<string, Set<string>>();
    for (const doc of samples) {
      for (const [key, value] of Object.entries(doc)) {
        if (!fieldTypes.has(key)) {
          fieldTypes.set(key, new Set());
        }
        const jsType = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
        fieldTypes.get(key)!.add(jsType);
      }
    }

    const columns: ColumnInfo[] = Array.from(fieldTypes.entries()).map(([name, types]) => ({
      name,
      type: Array.from(types).join(" | "),
      nullable: types.has("null") || types.has("undefined"),
      defaultValue: null,
      isPrimaryKey: name === "_id",
      isForeignKey: false,
    }));

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

    const columnSet = new Set<string>();
    for (const doc of docs) {
      for (const key of Object.keys(doc)) columnSet.add(key);
    }
    const columns = Array.from(columnSet);

    const rows = docs.map((doc) => {
      const row: Record<string, unknown> = {};
      for (const col of columns) {
        row[col] = col in doc ? doc[col] : null;
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
    const values = await db.collection(tableName).distinct(columnName);
    return values.slice(0, limit);
  }
}