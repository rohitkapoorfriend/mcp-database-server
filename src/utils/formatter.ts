export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
}

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

export function formatAsTable(result: QueryResult): string {
  if (result.rows.length === 0) {
    return `*No rows returned.*\n\n_Query executed in ${result.executionTimeMs}ms._`;
  }

  const { columns, rows } = result;

  const widths = columns.map((col) => {
    const values = rows.map((row) => formatValue(row[col]).length);
    return Math.max(col.length, ...values);
  });

  const header = columns.map((col, i) => col.padEnd(widths[i])).join(" | ");
  const separator = widths.map((w) => "-".repeat(w)).join(" | ");
  const dataRows = rows.map((row) =>
    columns.map((col, i) => formatValue(row[col]).padEnd(widths[i])).join(" | ")
  );

  const table = [header, separator, ...dataRows].join("\n");
  return `${table}\n\n_${result.rowCount} row(s) returned in ${result.executionTimeMs}ms._`;
}

export function formatAsJson(result: QueryResult): string {
  const output = {
    columns: result.columns,
    rows: result.rows,
    rowCount: result.rowCount,
    executionTimeMs: result.executionTimeMs,
  };
  return JSON.stringify(output, null, 2);
}

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

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

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
