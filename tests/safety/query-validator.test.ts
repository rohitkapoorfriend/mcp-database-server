import { describe, it, expect } from "vitest";
import { validateQuery, validateTableName } from "../../src/safety/query-validator.js";

describe("validateQuery", () => {
  describe("blocks dangerous operations in read-only mode", () => {
    it("should block DROP statements", () => {
      const result = validateQuery("DROP TABLE users", false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("DROP");
    });

    it("should block DELETE statements", () => {
      const result = validateQuery("DELETE FROM users WHERE id = 1", false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("DELETE");
    });

    it("should block UPDATE statements", () => {
      const result = validateQuery("UPDATE users SET name = 'test' WHERE id = 1", false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("UPDATE");
    });

    it("should block INSERT statements", () => {
      const result = validateQuery("INSERT INTO users (name) VALUES ('test')", false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("INSERT");
    });

    it("should block ALTER statements", () => {
      const result = validateQuery("ALTER TABLE users ADD COLUMN age INT", false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("ALTER");
    });

    it("should block TRUNCATE statements", () => {
      const result = validateQuery("TRUNCATE TABLE users", false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("TRUNCATE");
    });

    it("should block CREATE statements", () => {
      const result = validateQuery("CREATE TABLE test (id INT)", false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("CREATE");
    });

    it("should block GRANT statements", () => {
      const result = validateQuery("GRANT ALL ON users TO hacker", false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("GRANT");
    });
  });

  describe("allows valid SELECT queries", () => {
    it("should allow simple SELECT", () => {
      const result = validateQuery("SELECT * FROM users", false);
      expect(result.valid).toBe(true);
    });

    it("should allow SELECT with WHERE", () => {
      const result = validateQuery("SELECT name, email FROM users WHERE id = 1", false);
      expect(result.valid).toBe(true);
    });

    it("should allow SELECT with JOINs", () => {
      const result = validateQuery(
        "SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id",
        false
      );
      expect(result.valid).toBe(true);
    });

    it("should allow SELECT with subqueries", () => {
      const result = validateQuery(
        "SELECT * FROM users WHERE id IN (SELECT user_id FROM orders WHERE total > 100)",
        false
      );
      expect(result.valid).toBe(true);
    });

    it("should allow CTEs (WITH queries)", () => {
      const result = validateQuery(
        "WITH top_users AS (SELECT user_id, SUM(total) as sum FROM orders GROUP BY user_id) SELECT * FROM top_users",
        false
      );
      expect(result.valid).toBe(true);
    });

    it("should allow EXPLAIN queries", () => {
      const result = validateQuery("EXPLAIN SELECT * FROM users", false);
      expect(result.valid).toBe(true);
    });
  });

  describe("allows write operations when enabled", () => {
    it("should allow INSERT when write is enabled", () => {
      const result = validateQuery("INSERT INTO users (name) VALUES ('test')", true);
      expect(result.valid).toBe(true);
    });

    it("should allow UPDATE when write is enabled", () => {
      const result = validateQuery("UPDATE users SET name = 'test' WHERE id = 1", true);
      expect(result.valid).toBe(true);
    });

    it("should allow DELETE when write is enabled", () => {
      const result = validateQuery("DELETE FROM users WHERE id = 1", true);
      expect(result.valid).toBe(true);
    });
  });

  describe("detects injection patterns", () => {
    it("should block multi-statement with DROP", () => {
      const result = validateQuery("SELECT 1; DROP TABLE users", false);
      expect(result.valid).toBe(false);
    });

    it("should block SLEEP injection", () => {
      const result = validateQuery("SELECT SLEEP(10)", false);
      expect(result.valid).toBe(false);
    });

    it("should block INTO OUTFILE", () => {
      const result = validateQuery("SELECT * FROM users INTO OUTFILE '/tmp/data'", false);
      expect(result.valid).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should reject empty queries", () => {
      const result = validateQuery("", false);
      expect(result.valid).toBe(false);
    });

    it("should reject whitespace-only queries", () => {
      const result = validateQuery("   ", false);
      expect(result.valid).toBe(false);
    });

    it("should allow keywords inside string literals", () => {
      // SELECT where a string value contains "DELETE" should be allowed
      const result = validateQuery("SELECT * FROM logs WHERE message = 'DELETE action'", false);
      expect(result.valid).toBe(true);
    });
  });
});

describe("validateTableName", () => {
  it("should accept valid table names", () => {
    expect(validateTableName("users").valid).toBe(true);
    expect(validateTableName("order_items").valid).toBe(true);
    expect(validateTableName("public.users").valid).toBe(true);
  });

  it("should reject empty table names", () => {
    expect(validateTableName("").valid).toBe(false);
  });

  it("should reject table names with special characters", () => {
    expect(validateTableName("users; DROP TABLE").valid).toBe(false);
    expect(validateTableName("users'--").valid).toBe(false);
  });

  it("should reject overly long table names", () => {
    const longName = "a".repeat(129);
    expect(validateTableName(longName).valid).toBe(false);
  });
});
