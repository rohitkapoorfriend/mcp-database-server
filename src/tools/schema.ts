import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DatabaseAdapter } from "../databases/index.js";
import { logger } from "../utils/logger.js";

export function registerSchemaTool(server: McpServer, db: DatabaseAdapter): void {
  server.tool(
    "get_schema",
    "Get the database schema including tables, columns, types, and relationships.",
    {
      schema: z
        .string()
        .optional()
        .describe("Schema name (defaults to public/default)"),
    },
    async ({ schema }) => {
      logger.debug("get_schema called", { schema });

      try {
        const tables = await db.getTables(schema);

        if (tables.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No tables found in the database." }],
          };
        }

        let output = `# Database Schema\n\n`;
        output += `**Database type:** ${db.getType()}\n`;
        output += `**Tables:** ${tables.length}\n\n`;

        for (const tableName of tables) {
          const info = await db.getTableInfo(tableName);

          output += `## ${info.name}\n\n`;
          output += `| Column | Type | Nullable | Key | Default |\n`;
          output += `|--------|------|----------|-----|--------|\n`;

          for (const col of info.columns) {
            const key = col.isPrimaryKey
              ? "PK"
              : col.isForeignKey
                ? `FK → ${col.foreignKeyRef?.table}.${col.foreignKeyRef?.column}`
                : "";
            output += `| ${col.name} | ${col.type} | ${col.nullable ? "YES" : "NO"} | ${key} | ${col.defaultValue ?? ""} |\n`;
          }

          if (info.indexes.length > 0) {
            output += `\n**Indexes:**\n`;
            for (const idx of info.indexes) {
              const flags = [
                idx.isPrimary ? "PRIMARY" : "",
                idx.isUnique ? "UNIQUE" : "",
              ]
                .filter(Boolean)
                .join(", ");
              output += `- ${idx.name} (${idx.columns.join(", ")})${flags ? ` [${flags}]` : ""}\n`;
            }
          }

          output += `\n_Estimated rows: ${info.rowCount}_\n\n---\n\n`;
        }

        return {
          content: [{ type: "text" as const, text: output }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("Schema retrieval failed", { error: message });
        return {
          content: [{ type: "text" as const, text: `Failed to retrieve schema: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
