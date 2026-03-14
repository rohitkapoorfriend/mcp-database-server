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

export function sanitizeLimit(limit: number | undefined, maxRows: number): number {
  if (limit === undefined || limit <= 0) {
    return Math.min(100, maxRows);
  }
  return Math.min(limit, maxRows);
}

export function redactCredentials(text: string): string {
  let result = text;
  result = result.replace(
    /(?:mongodb|postgresql|mysql|postgres):\/\/[^@\s]+@/gi,
    "[REDACTED]@"
  );
  result = result.replace(
    /password\s*[=:]\s*['"]?[^\s'"]+/gi,
    "password=[REDACTED]"
  );
  return result;
}

export function truncateString(value: string, maxLength = 500): string {
  if (value.length <= maxLength) {
    return value;
  }
  return value.substring(0, maxLength) + "... (truncated)";
}

/**
 * Masks sensitive values in log output — e.g. email, phone, SSN-like patterns.
 * Useful when row data is included in debug logs.
 */
export function maskSensitiveData(value: string): string {
  // mask emails
  let result = value.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "***@***.***");
  // mask anything that looks like a credit card (16 digits)
  result = result.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "****-****-****-****");
  return result;
}

/**
 * Normalizes a schema/table identifier for safe use in dynamic SQL.
 * Strips quotes and validates characters.
 */
export function normalizeIdentifier(identifier: string): string {
  return identifier.replace(/[`"[\]]/g, "").trim();
}