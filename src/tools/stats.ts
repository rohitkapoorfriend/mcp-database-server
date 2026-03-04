/**
 * MCP Tool: table_stats — row counts, size, index info.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DatabaseAdapter } from "../databases/index.js";
import { validateTableName } from "../safety/query-validator.js";
import { logger } from "../utils/logger.js";

/** Formats bytes into a human-readable size string */
function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "N/A";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let size = bytes;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/** Registers the table_stats tool with the MCP server */
export function registerStatsTool(server: McpServer, db: DatabaseAdapter): void {
  server.tool(
    "table_stats",
    "Get statistics for a table or all tables: row count, size, columns, indexes.",
    {
      table_name: z
        .string()
        .optional()
        .describe("Table name (omit for all tables)"),
    },
    async ({ table_name }) => {
      logger.debug("table_stats called", { table_name });

      // Validate table name if provided
      if (table_name) {
        const nameValidation = validateTableName(table_name);
        if (!nameValidation.valid) {
          return {
            content: [{ type: "text" as const, text: `Error: ${nameValidation.error}` }],
            isError: true,
          };
        }

        const exists = await db.tableExists(table_name);
        if (!exists) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: Table '${table_name}' does not exist.`,
              },
            ],
            isError: true,
          };
        }
      }

      try {
        const stats = await db.getTableStats(table_name);

        if (stats.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No tables found." }],
          };
        }

        let output = table_name
          ? `# Statistics for \`${table_name}\`\n\n`
          : `# Database Statistics\n\n`;

        output += `| Table | Rows | Size | Columns | Indexes |\n`;
        output += `|-------|------|------|---------|---------|\n`;

        let totalRows = 0;
        for (const stat of stats) {
          output += `| ${stat.tableName} | ${stat.rowCount.toLocaleString()} | ${formatBytes(stat.sizeBytes)} | ${stat.columnCount} | ${stat.indexCount} |\n`;
          totalRows += stat.rowCount;
        }

        if (stats.length > 1) {
          output += `\n**Total tables:** ${stats.length}\n`;
          output += `**Total rows:** ${totalRows.toLocaleString()}\n`;
        }

        return {
          content: [{ type: "text" as const, text: output }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("Table stats retrieval failed", { error: message });
        return {
          content: [
            { type: "text" as const, text: `Failed to get table stats: ${message}` },
          ],
          isError: true,
        };
      }
    }
  );
}
