import { describe, it, expect, vi } from "vitest";
import { formatResult, formatAsTable, formatAsJson, formatAsCsv } from "../../src/utils/formatter.js";
import type { QueryResult } from "../../src/utils/formatter.js";

const sampleResult: QueryResult = {
  columns: ["id", "name", "email"],
  rows: [
    { id: 1, name: "Alice", email: "alice@example.com" },
    { id: 2, name: "Bob", email: "bob@example.com" },
  ],
  rowCount: 2,
  executionTimeMs: 15,
};

const emptyResult: QueryResult = {
  columns: ["id", "name"],
  rows: [],
  rowCount: 0,
  executionTimeMs: 5,
};

describe("formatAsTable", () => {
  it("should format results as markdown table", () => {
    const output = formatAsTable(sampleResult);
    expect(output).toContain("id");
    expect(output).toContain("name");
    expect(output).toContain("email");
    expect(output).toContain("Alice");
    expect(output).toContain("Bob");
    expect(output).toContain("2 row(s) returned");
    expect(output).toContain("15ms");
  });

  it("should handle empty results", () => {
    const output = formatAsTable(emptyResult);
    expect(output).toContain("No rows returned");
  });

  it("should handle NULL values", () => {
    const resultWithNull: QueryResult = {
      columns: ["id", "name"],
      rows: [{ id: 1, name: null }],
      rowCount: 1,
      executionTimeMs: 10,
    };
    const output = formatAsTable(resultWithNull);
    expect(output).toContain("NULL");
  });
});

describe("formatAsJson", () => {
  it("should format results as valid JSON", () => {
    const output = formatAsJson(sampleResult);
    const parsed = JSON.parse(output);
    expect(parsed.columns).toEqual(["id", "name", "email"]);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rowCount).toBe(2);
    expect(parsed.executionTimeMs).toBe(15);
  });
});

describe("formatAsCsv", () => {
  it("should format results as CSV", () => {
    const output = formatAsCsv(sampleResult);
    const lines = output.split("\n");
    expect(lines[0]).toBe("id,name,email");
    expect(lines[1]).toBe("1,Alice,alice@example.com");
    expect(lines[2]).toBe("2,Bob,bob@example.com");
  });

  it("should escape fields with commas", () => {
    const resultWithComma: QueryResult = {
      columns: ["name", "address"],
      rows: [{ name: "Alice", address: "123 Main St, Apt 4" }],
      rowCount: 1,
      executionTimeMs: 10,
    };
    const output = formatAsCsv(resultWithComma);
    expect(output).toContain('"123 Main St, Apt 4"');
  });

  it("should handle empty results", () => {
    const output = formatAsCsv(emptyResult);
    expect(output).toBe("id,name");
  });
});

describe("formatResult", () => {
  it("should dispatch to table formatter", () => {
    const output = formatResult(sampleResult, "table");
    expect(output).toContain("---");
  });

  it("should dispatch to json formatter", () => {
    const output = formatResult(sampleResult, "json");
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it("should dispatch to csv formatter", () => {
    const output = formatResult(sampleResult, "csv");
    expect(output.split("\n")[0]).toBe("id,name,email");
  });
});
