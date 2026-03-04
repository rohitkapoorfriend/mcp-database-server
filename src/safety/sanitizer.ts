/**
 * Input sanitization and output formatting utilities.
 */

/** Sanitizes a string value to prevent injection in non-parameterized contexts */
export function sanitizeString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\0/g, "")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\x1a/g, "");
}

/** Ensures a limit value is within safe bounds */
export function sanitizeLimit(limit: number | undefined, maxRows: number): number {
  if (limit === undefined || limit <= 0) {
    return Math.min(100, maxRows);
  }
  return Math.min(limit, maxRows);
}

/** Removes any connection credentials from output strings */
export function redactCredentials(text: string): string {
  // Redact common credential patterns
  let result = text;
  // Connection strings
  result = result.replace(
    /(?:mongodb|postgresql|mysql|postgres):\/\/[^@\s]+@/gi,
    "[REDACTED]@"
  );
  // Password fields
  result = result.replace(
    /password\s*[=:]\s*['"]?[^\s'"]+/gi,
    "password=[REDACTED]"
  );
  return result;
}

/** Truncates a string to a maximum length for display */
export function truncateString(value: string, maxLength: number = 500): string {
  if (value.length <= maxLength) {
    return value;
  }
  return value.substring(0, maxLength) + "... (truncated)";
}
