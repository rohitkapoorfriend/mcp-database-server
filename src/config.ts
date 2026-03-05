import { z } from "zod";
import { logger } from "./utils/logger.js";

const ConfigSchema = z.object({
  dbType: z.enum(["postgresql", "mysql", "mongodb"]).default("postgresql"),
  dbHost: z.string().default("localhost"),
  dbPort: z.coerce.number().int().positive().default(5432),
  dbName: z.string().default("mydb"),
  dbUser: z.string().default("postgres"),
  dbPassword: z.string().default(""),
  dbSsl: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  allowWrite: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  maxRows: z.coerce.number().int().positive().default(1000),
  queryTimeout: z.coerce.number().int().positive().default(30000),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  const raw = {
    dbType: process.env.DB_TYPE,
    dbHost: process.env.DB_HOST,
    dbPort: process.env.DB_PORT,
    dbName: process.env.DB_NAME,
    dbUser: process.env.DB_USER,
    dbPassword: process.env.DB_PASSWORD,
    dbSsl: process.env.DB_SSL,
    allowWrite: process.env.ALLOW_WRITE,
    maxRows: process.env.MAX_ROWS,
    queryTimeout: process.env.QUERY_TIMEOUT,
    logLevel: process.env.LOG_LEVEL,
  };

  const result = ConfigSchema.safeParse(raw);

  if (!result.success) {
    logger.error("Invalid configuration", {
      errors: result.error.flatten().fieldErrors,
    });
    throw new Error(`Invalid configuration: ${result.error.message}`);
  }

  const config = result.data;
  logger.setLogLevel(config.logLevel);
  logger.info("Configuration loaded", {
    dbType: config.dbType,
    dbHost: config.dbHost,
    dbPort: config.dbPort,
    dbName: config.dbName,
    allowWrite: config.allowWrite,
    maxRows: config.maxRows,
    queryTimeout: config.queryTimeout,
  });

  return config;
}
