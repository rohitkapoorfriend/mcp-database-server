import { describe, it, expect } from "vitest";
import { sanitizeString, redactCredentials, truncateString } from "../../src/safety/sanitizer.js";

describe("sanitizeString", () => {
  it("should escape single quotes", () => {
    expect(sanitizeString("O'Brien")).toContain("\\'");
  });

  it("should escape backslashes", () => {
    expect(sanitizeString("path\\to\\file")).toContain("\\\\");
  });

  it("should remove null bytes", () => {
    expect(sanitizeString("hello\0world")).toBe("helloworld");
  });
});

describe("redactCredentials", () => {
  it("should redact PostgreSQL connection strings", () => {
    const result = redactCredentials("postgresql://user:secret@localhost:5432/db");
    expect(result).not.toContain("secret");
    expect(result).toContain("[REDACTED]");
  });

  it("should redact MongoDB connection strings", () => {
    const result = redactCredentials("mongodb://admin:p4ssw0rd@mongo:27017/mydb");
    expect(result).not.toContain("p4ssw0rd");
    expect(result).toContain("[REDACTED]");
  });

  it("should redact password fields", () => {
    const result = redactCredentials("password=supersecret");
    expect(result).not.toContain("supersecret");
    expect(result).toContain("[REDACTED]");
  });

  it("should leave non-credential text unchanged", () => {
    const text = "SELECT * FROM users WHERE name = 'Alice'";
    expect(redactCredentials(text)).toBe(text);
  });
});

describe("truncateString", () => {
  it("should not truncate short strings", () => {
    expect(truncateString("hello", 500)).toBe("hello");
  });

  it("should truncate long strings", () => {
    const long = "a".repeat(600);
    const result = truncateString(long, 500);
    expect(result.length).toBeLessThan(600);
    expect(result).toContain("(truncated)");
  });
});
