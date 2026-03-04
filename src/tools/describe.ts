/**
 * MCP Tool: describe_table — detailed info about a specific table.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DatabaseAdapter } from "../databases/index.js";
import { validateTableName } from "../safety/query-validator.js";
import { logger } from "../utils/logger.js";

/** Registers the describe_table tool with the MCP server */
export function registerDescribeTool(server: McpServer, db: DatabaseAdapter): void {
  server.tool(
    "describe_table",
    "Get detailed information about a specific table including columns, types, constraints, and sample values.",
    {
      table_name: z.string().describe("The name of the table to describe"),
    },
    async ({ table_name }) => {
      logger.debug("describe_table called", { table_name });

      // Validate table name
      const nameValidation = validateTableName(table_name);
      if (!nameValidation.valid) {
        return {
          content: [{ type: "text" as const, text: `Error: ${nameValidation.error}` }],
          isError: true,
        };
      }

      try {
        // Check if table exists
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

        const info = await db.getTableInfo(table_name);

        let output = `# Table: ${info.name}\n\n`;
        output += `**Schema:** ${info.schema}\n`;
        output += `**Estimated rows:** ${info.rowCount}\n\n`;

        output += `## Columns\n\n`;
        output += `| # | Column | Type | Nullable | Default | Constraints |\n`;
        output += `|---|--------|------|----------|---------|-------------|\n`;

        for (let i = 0; i < info.columns.length; i++) {
          const col = info.columns[i];
          const constraints: string[] = [];
          if (col.isPrimaryKey) constraints.push("PRIMARY KEY");
          if (col.isForeignKey && col.foreignKeyRef) {
            constraints.push(`FK → ${col.foreignKeyRef.table}(${col.foreignKeyRef.column})`);
          }
          if (!col.nullable) constraints.push("NOT NULL");

          output += `| ${i + 1} | ${col.name} | ${col.type} | ${col.nullable ? "YES" : "NO"} | ${col.defaultValue ?? "-"} | ${constraints.join(", ") || "-"} |\n`;
        }

        // Sample values per column
        output += `\n## Sample Values\n\n`;
        for (const col of info.columns) {
          try {
            const samples = await db.getSampleValues(info.name, col.name, 3);
            if (samples.length > 0) {
              const displayValues = samples.map((v) =>
                v === null ? "NULL" : String(v)
              );
              output += `- **${col.name}**: ${displayValues.join(", ")}\n`;
            }
          } catch {
            // Skip columns that can't be sampled
          }
        }

        if (info.indexes.length > 0) {
          output += `\n## Indexes\n\n`;
          output += `| Name | Columns | Unique | Primary |\n`;
          output += `|------|---------|--------|---------|\n`;
          for (const idx of info.indexes) {
            output += `| ${idx.name} | ${idx.columns.join(", ")} | ${idx.isUnique ? "YES" : "NO"} | ${idx.isPrimary ? "YES" : "NO"} |\n`;
          }
        }

        return {
          content: [{ type: "text" as const, text: output }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("Table description failed", { error: message });
        return {
          content: [
            { type: "text" as const, text: `Failed to describe table: ${message}` },
          ],
          isError: true,
        };
      }
    }
  );
}
