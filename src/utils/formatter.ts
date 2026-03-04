/**
 * Formats query results into markdown tables, JSON, or CSV.
 */

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
}

/** Formats a value for display, handling nulls and objects */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

/** Formats query results as a markdown table */
export function formatAsTable(result: QueryResult): string {
  if (result.rows.length === 0) {
    return `*No rows returned.*\n\n_Query executed in ${result.executionTimeMs}ms._`;
  }

  const { columns, rows } = result;

  // Calculate column widths
  const widths = columns.map((col) => {
    const values = rows.map((row) => formatValue(row[col]).length);
    return Math.max(col.length, ...values);
  });

  // Build header
  const header = columns.map((col, i) => col.padEnd(widths[i])).join(" | ");
  const separator = widths.map((w) => "-".repeat(w)).join(" | ");

  // Build rows
  const dataRows = rows.map((row) =>
    columns.map((col, i) => formatValue(row[col]).padEnd(widths[i])).join(" | ")
  );

  const table = [header, separator, ...dataRows].join("\n");
  return `${table}\n\n_${result.rowCount} row(s) returned in ${result.executionTimeMs}ms._`;
}

/** Formats query results as JSON */
export function formatAsJson(result: QueryResult): string {
  const output = {
    columns: result.columns,
    rows: result.rows,
    rowCount: result.rowCount,
    executionTimeMs: result.executionTimeMs,
  };
  return JSON.stringify(output, null, 2);
}

/** Formats query results as CSV */
export function formatAsCsv(result: QueryResult): string {
  if (result.rows.length === 0) {
    return result.columns.join(",");
  }

  const header = result.columns.map(escapeCsvField).join(",");
  const dataRows = result.rows.map((row) =>
    result.columns.map((col) => escapeCsvField(formatValue(row[col]))).join(",")
  );

  return [header, ...dataRows].join("\n");
}

/** Escapes a CSV field value */
function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Formats query results in the specified format */
export function formatResult(result: QueryResult, format: "table" | "json" | "csv"): string {
  switch (format) {
    case "json":
      return formatAsJson(result);
    case "csv":
      return formatAsCsv(result);
    case "table":
    default:
      return formatAsTable(result);
  }
}
