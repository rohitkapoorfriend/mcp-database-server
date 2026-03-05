import { logger } from "../utils/logger.js";

// keywords that signal a write/DDL operation
const WRITE_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "ALTER",
  "TRUNCATE",
  "CREATE",
  "REPLACE",
  "MERGE",
  "UPSERT",
  "GRANT",
  "REVOKE",
  "EXEC",
  "EXECUTE",
  "CALL",
] as const;

// common injection vectors
const INJECTION_PATTERNS: RegExp[] = [
  /;\s*(DROP|ALTER|DELETE|INSERT|UPDATE|CREATE|TRUNCATE|GRANT|REVOKE)/i,
  /--\s*$/m,
  /\/\*[\s\S]*?\*\//,
  /\bUNION\b[\s\S]*?\bSELECT\b[\s\S]*?\bFROM\b[\s\S]*?\binformation_schema\b/i,
  /\bSLEEP\s*\(/i,
  /\bBENCHMARK\s*\(/i,
  /\bLOAD_FILE\s*\(/i,
  /\bINTO\s+OUTFILE\b/i,
  /\bINTO\s+DUMPFILE\b/i,
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateQuery(query: string, allowWrite: boolean): ValidationResult {
  if (!query || query.trim().length === 0) {
    return { valid: false, error: "Query cannot be empty." };
  }

  const trimmed = query.trim();

  // Check for injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      logger.warn("Potential SQL injection detected", { query: trimmed.substring(0, 100) });
      return {
        valid: false,
        error: "Query contains potentially dangerous patterns and was blocked for safety.",
      };
    }
  }

  // If write operations are not allowed, check for write keywords
  if (!allowWrite) {
    // strip out string literals so we don't match keywords inside values
    const normalized = stripStringsAndComments(trimmed);

    for (const keyword of WRITE_KEYWORDS) {
      // Match keyword as a standalone word (not inside identifiers)
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      if (regex.test(normalized)) {
        logger.warn("Write operation blocked", { keyword, query: trimmed.substring(0, 100) });
        return {
          valid: false,
          error: `Write operations are not allowed. The query contains '${keyword}'. Set ALLOW_WRITE=true to enable write operations.`,
        };
      }
    }

    // Ensure the query starts with SELECT, WITH (CTE), EXPLAIN, or SHOW
    const firstWord = normalized.trim().split(/\s+/)[0]?.toUpperCase();
    if (firstWord && !["SELECT", "WITH", "EXPLAIN", "SHOW", "DESCRIBE", "DESC"].includes(firstWord)) {
      return {
        valid: false,
        error: `Only SELECT queries are allowed in read-only mode. Query starts with '${firstWord}'.`,
      };
    }
  }

  return { valid: true };
}

function stripStringsAndComments(sql: string): string {
  let result = sql.replace(/'(?:[^'\\]|\\.)*'/g, "''");
  result = result.replace(/"(?:[^"\\]|\\.)*"/g, '""');
  result = result.replace(/--[^\n]*/g, "");
  result = result.replace(/\/\*[\s\S]*?\*\//g, "");
  return result;
}

export function validateTableName(tableName: string): ValidationResult {
  if (!tableName || tableName.trim().length === 0) {
    return { valid: false, error: "Table name cannot be empty." };
  }

  const validPattern = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;
  if (!validPattern.test(tableName)) {
    return {
      valid: false,
      error: "Table name contains invalid characters. Only letters, numbers, underscores, and dots are allowed.",
    };
  }

  if (tableName.length > 128) {
    return { valid: false, error: "Table name is too long (max 128 characters)." };
  }

  return { valid: true };
}
