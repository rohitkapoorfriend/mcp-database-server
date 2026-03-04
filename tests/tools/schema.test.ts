import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DatabaseAdapter, TableInfo } from "../../src/databases/base.js";

// Mock database adapter for testing
function createMockAdapter(): DatabaseAdapter {
  const mockTableInfo: TableInfo = {
    name: "users",
    schema: "public",
    columns: [
      {
        name: "id",
        type: "integer",
        nullable: false,
        defaultValue: "nextval('users_id_seq')",
        isPrimaryKey: true,
        isForeignKey: false,
      },
      {
        name: "name",
        type: "varchar",
        nullable: false,
        defaultValue: null,
        isPrimaryKey: false,
        isForeignKey: false,
      },
      {
        name: "email",
        type: "varchar",
        nullable: false,
        defaultValue: null,
        isPrimaryKey: false,
        isForeignKey: false,
      },
    ],
    indexes: [
      { name: "users_pkey", columns: ["id"], isUnique: true, isPrimary: true },
      { name: "users_email_key", columns: ["email"], isUnique: true, isPrimary: false },
    ],
    rowCount: 20,
  };

  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    executeQuery: vi.fn(),
    getTables: vi.fn().mockResolvedValue(["users", "orders"]),
    getTableInfo: vi.fn().mockResolvedValue(mockTableInfo),
    getTableStats: vi.fn(),
    getSampleRows: vi.fn(),
    getType: vi.fn().mockReturnValue("postgresql"),
    tableExists: vi.fn().mockResolvedValue(true),
    getSampleValues: vi.fn().mockResolvedValue(["Alice", "Bob", "Carol"]),
  };
}

describe("Schema tool mock adapter", () => {
  let adapter: DatabaseAdapter;

  beforeEach(() => {
    adapter = createMockAdapter();
  });

  it("should return table names", async () => {
    const tables = await adapter.getTables();
    expect(tables).toEqual(["users", "orders"]);
  });

  it("should return table info with columns", async () => {
    const info = await adapter.getTableInfo("users");
    expect(info.name).toBe("users");
    expect(info.columns).toHaveLength(3);
    expect(info.columns[0].isPrimaryKey).toBe(true);
  });

  it("should return table info with indexes", async () => {
    const info = await adapter.getTableInfo("users");
    expect(info.indexes).toHaveLength(2);
    expect(info.indexes[0].isPrimary).toBe(true);
  });

  it("should report correct database type", () => {
    expect(adapter.getType()).toBe("postgresql");
  });

  it("should check table existence", async () => {
    const exists = await adapter.tableExists("users");
    expect(exists).toBe(true);
  });

  it("should return sample values", async () => {
    const values = await adapter.getSampleValues("users", "name", 3);
    expect(values).toEqual(["Alice", "Bob", "Carol"]);
  });
});
