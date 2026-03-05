import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DatabaseAdapter } from "../databases/index.js";
import type { Config } from "../config.js";
import { validateTableName } from "../safety/query-validator.js";
import { sanitizeLimit } from "../safety/sanitizer.js";
import { formatAsTable } from "../utils/formatter.js";
import { logger } from "../utils/logger.js";

export function registerSampleTool(server: McpServer, db: DatabaseAdapter, config: Config): void {
  server.tool(
    "sample_data",
    "Get sample rows from a table, formatted as a markdown table.",
    {
      table_name: z.string().describe("The name of the table to sample"),
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .default(5)
        .describe("Number of sample rows to return (default: 5)"),
    },
    async ({ table_name, limit }) => {
      logger.debug("sample_data called", { table_name, limit });

      const nameValidation = validateTableName(table_name);
      if (!nameValidation.valid) {
        return {
          content: [{ type: "text" as const, text: `Error: ${nameValidation.error}` }],
          isError: true,
        };
      }

      try {
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

        const effectiveLimit = sanitizeLimit(limit, config.maxRows);
        const startTime = Date.now();
        const result = await db.getSampleRows(table_name, effectiveLimit);
        const executionTimeMs = Date.now() - startTime;

        const formatted = formatAsTable({
          columns: result.columns,
          rows: result.rows,
          rowCount: result.rowCount,
          executionTimeMs,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `## Sample data from \`${table_name}\`\n\n${formatted}`,
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("Sample data retrieval failed", { error: message });
        return {
          content: [
            { type: "text" as const, text: `Failed to get sample data: ${message}` },
          ],
          isError: true,
        };
      }
    }
  );
}
