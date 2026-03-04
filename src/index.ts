#!/usr/bin/env node

/**
 * MCP Database Server — Entry point.
 * Creates the MCP server, registers tools/resources/prompts, and connects transport.
 */

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

  // Load configuration
  const config = loadConfig();

  // Create database adapter
  const db = createDatabaseAdapter(config);

  // Connect to the database
  try {
    await db.connect();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Failed to connect to database", { error: message });
    process.exit(1);
  }

  // Create MCP server
  const server = new McpServer({
    name: "mcp-database-server",
    version: "1.0.0",
  });

  // Register tools
  registerQueryTool(server, db, config);
  registerSchemaTool(server, db);
  registerDescribeTool(server, db);
  registerSampleTool(server, db, config);
  registerStatsTool(server, db);

  // Register resources
  registerSchemaResource(server, db);

  // Register prompts
  registerQueryHelperPrompt(server, db);

  // Set up transport and connect
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("MCP Database Server running on stdio transport");

  // Graceful shutdown
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
