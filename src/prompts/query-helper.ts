/**
 * MCP Prompt: query_helper — helps AI agents write correct queries.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DatabaseAdapter } from "../databases/index.js";
import { logger } from "../utils/logger.js";

/** Returns database-specific syntax hints */
function getSyntaxHints(dbType: string): string {
  switch (dbType) {
    case "postgresql":
      return `
### PostgreSQL Syntax Notes
- Use double quotes for case-sensitive identifiers: "TableName"
- String concatenation: || operator
- Boolean type: TRUE/FALSE
- Date functions: NOW(), CURRENT_DATE, CURRENT_TIMESTAMP
- String functions: LENGTH(), UPPER(), LOWER(), TRIM()
- Use ILIKE for case-insensitive LIKE
- Array support: column = ANY(ARRAY[...])
- JSON: column->>'key' for text, column->'key' for JSON
- CTEs: WITH cte AS (SELECT ...) SELECT * FROM cte
- Window functions: ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)`;

    case "mysql":
      return `
### MySQL Syntax Notes
- Use backticks for identifiers: \`table_name\`
- String concatenation: CONCAT() function
- Boolean: 1/0 or TRUE/FALSE
- Date functions: NOW(), CURDATE(), DATE_FORMAT()
- String functions: LENGTH(), UPPER(), LOWER(), TRIM()
- Use LIKE for pattern matching (case-insensitive by default)
- JSON: column->>'$.key' or JSON_EXTRACT(column, '$.key')
- CTEs: WITH cte AS (SELECT ...) SELECT * FROM cte (MySQL 8+)
- LIMIT with OFFSET: LIMIT n OFFSET m`;

    case "mongodb":
      return `
### MongoDB Query Notes
- Queries are JSON objects, not SQL
- Format: { "collection": "name", "filter": {}, "limit": 10 }
- Filter operators: $eq, $gt, $lt, $gte, $lte, $ne, $in, $nin
- Logical: $and, $or, $not
- Example: { "collection": "users", "filter": { "age": { "$gt": 25 } } }`;

    default:
      return "";
  }
}

/** Registers the query_helper prompt with the MCP server */
export function registerQueryHelperPrompt(server: McpServer, db: DatabaseAdapter): void {
  server.prompt(
    "query_helper",
    "Helps formulate correct database queries based on a natural language question.",
    { question: z.string().describe("The question about the data you want to query") },
    async ({ question }) => {
      logger.debug("query_helper prompt called", { question });

      let schemaContext = "";
      try {
        const tables = await db.getTables();
        schemaContext = `\n### Available Tables\n`;
        for (const table of tables) {
          const info = await db.getTableInfo(table);
          const cols = info.columns.map((c) => `${c.name} (${c.type})`).join(", ");
          schemaContext += `- **${table}**: ${cols}\n`;
        }
      } catch {
        schemaContext = "\n_Could not load schema. Please use the get_schema tool first._\n";
      }

      const syntaxHints = getSyntaxHints(db.getType());

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `You are a database query assistant for a ${db.getType()} database.

## User's Question
${question}

## Database Information
${schemaContext}
${syntaxHints}

## Instructions
1. Analyze the user's question and the available schema
2. Write a correct, optimized ${db.getType() === "mongodb" ? "MongoDB query (JSON format)" : "SQL query"}
3. Use only SELECT statements (the database is in read-only mode)
4. Include column aliases for clarity
5. Add appropriate WHERE clauses, JOINs, and ORDER BY as needed
6. Explain the query and what results to expect

Please provide the query and a brief explanation.`,
            },
          },
        ],
      };
    }
  );
}
