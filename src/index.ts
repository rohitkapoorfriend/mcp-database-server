#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createDatabaseAdapter } from "./databases/index.js";
import { registerQueryTool } from "./tools/query.js";
import { registerSchemaTool } from "./tools/schema.js";
import { registerDescribeTool } from "./tools/describe.js";
import { registerSampleTool } from "./tools/sample.js";
import { registerStatsTool } from "./tools/stats.js";
import { registerSchemaResource } from "./resources/schema-resource.js";
import { registerQueryHelperPrompt } from "./prompts/query-helper.js";
import { logger } from "./utils/logger.js";

async function main(): Promise<void> {
  logger.info("Starting MCP Database Server...");

  const config = loadConfig();
  const db = createDatabaseAdapter(config);

  try {
    await db.connect();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Failed to connect to database", { error: message });
    process.exit(1);
  }

  const server = new McpServer({
    name: "mcp-database-server",
    version: "1.0.0",
  });

  registerQueryTool(server, db, config);
  registerSchemaTool(server, db);
  registerDescribeTool(server, db);
  registerSampleTool(server, db, config);
  registerStatsTool(server, db);
  registerSchemaResource(server, db);
  registerQueryHelperPrompt(server, db);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("MCP Database Server running on stdio transport");

  const shutdown = async (): Promise<void> => {
    logger.info("Shutting down MCP Database Server...");
    await db.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  logger.error("Fatal error", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
