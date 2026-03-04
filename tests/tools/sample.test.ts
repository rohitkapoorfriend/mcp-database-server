import { describe, it, expect } from "vitest";
import { sanitizeLimit } from "../../src/safety/sanitizer.js";

describe("sanitizeLimit", () => {
  it("should use default when limit is undefined", () => {
    expect(sanitizeLimit(undefined, 1000)).toBe(100);
  });

  it("should use default when limit is 0 or negative", () => {
    expect(sanitizeLimit(0, 1000)).toBe(100);
    expect(sanitizeLimit(-5, 1000)).toBe(100);
  });

  it("should respect maxRows cap", () => {
    expect(sanitizeLimit(5000, 1000)).toBe(1000);
  });

  it("should pass through valid limits", () => {
    expect(sanitizeLimit(50, 1000)).toBe(50);
  });

  it("should use maxRows as cap for default if maxRows is small", () => {
    expect(sanitizeLimit(undefined, 10)).toBe(10);
  });
});
