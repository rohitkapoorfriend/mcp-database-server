import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DatabaseAdapter } from "../databases/index.js";
import type { Config } from "../config.js";
import { validateQuery } from "../safety/query-validator.js";
import { sanitizeLimit } from "../safety/sanitizer.js";
import { formatResult } from "../utils/formatter.js";
import { logger } from "../utils/logger.js";

export function registerQueryTool(server: McpServer, db: DatabaseAdapter, config: Config): void {
  server.tool(
    "execute_query",
    "Execute a SQL query against the database. Read-only (SELECT) by default.",
    {
      query: z.string().describe("The SQL query to execute"),
      format: z
        .enum(["table", "json", "csv"])
        .optional()
        .default("table")
        .describe("Output format: table (markdown), json, or csv"),
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Maximum number of rows to return"),
    },
    async ({ query, format, limit }) => {
      logger.debug("execute_query called", { query: query.substring(0, 200) });

      const validation = validateQuery(query, config.allowWrite);
      if (!validation.valid) {
        return {
          content: [{ type: "text" as const, text: `Error: ${validation.error}` }],
          isError: true,
        };
      }

      const effectiveLimit = sanitizeLimit(limit, config.maxRows);
      let limitedQuery = query.trim().replace(/;\s*$/, "");

      // auto-append LIMIT if missing (sql only)
      if (db.getType() !== "mongodb" && !/\bLIMIT\b/i.test(limitedQuery)) {
        limitedQuery += ` LIMIT ${effectiveLimit}`;
      }

      try {
        const startTime = Date.now();
        const result = await db.executeQuery(limitedQuery, config.queryTimeout);
        const executionTimeMs = Date.now() - startTime;

        const formatted = formatResult(
          {
            columns: result.columns,
            rows: result.rows,
            rowCount: result.rowCount,
            executionTimeMs,
          },
          format ?? "table"
        );

        return {
          content: [{ type: "text" as const, text: formatted }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("Query execution failed", { error: message });
        return {
          content: [{ type: "text" as const, text: `Query execution failed: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
