/**
 * MCP Resource: database://schema — expose database schema as a readable resource.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DatabaseAdapter } from "../databases/index.js";
import { logger } from "../utils/logger.js";

/** Registers the database schema resource with the MCP server */
export function registerSchemaResource(server: McpServer, db: DatabaseAdapter): void {
  server.resource(
    "database-schema",
    "database://schema",
    {
      description: "Full database schema including tables, columns, types, and relationships",
      mimeType: "text/markdown",
    },
    async () => {
      logger.debug("Schema resource accessed");

      try {
        const tables = await db.getTables();
        let output = `# Database Schema (${db.getType()})\n\n`;

        for (const tableName of tables) {
          const info = await db.getTableInfo(tableName);
          output += `## ${info.name}\n\n`;

          for (const col of info.columns) {
            const flags: string[] = [];
            if (col.isPrimaryKey) flags.push("PK");
            if (col.isForeignKey && col.foreignKeyRef) {
              flags.push(`FK → ${col.foreignKeyRef.table}.${col.foreignKeyRef.column}`);
            }
            if (!col.nullable) flags.push("NOT NULL");

            const flagStr = flags.length > 0 ? ` [${flags.join(", ")}]` : "";
            output += `- **${col.name}** ${col.type}${flagStr}\n`;
          }
          output += `\n`;
        }

        return {
          contents: [
            {
              uri: "database://schema",
              mimeType: "text/markdown",
              text: output,
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("Schema resource error", { error: message });
        return {
          contents: [
            {
              uri: "database://schema",
              mimeType: "text/plain",
              text: `Error loading schema: ${message}`,
            },
          ],
        };
      }
    }
  );
}
