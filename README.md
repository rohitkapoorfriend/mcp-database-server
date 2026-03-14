# mcp-database-server

An MCP server that lets AI agents (Claude, Cursor, etc.) query and explore databases safely. Built with TypeScript, supports PostgreSQL, MySQL, and MongoDB.

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-green)
![Docker](https://img.shields.io/badge/Docker-ready-2496ed?logo=docker&logoColor=white)
![MCP](https://img.shields.io/badge/MCP-Protocol-8b5cf6)

## Why?

I wanted a way to let Claude and other AI tools talk to my databases without giving them raw access. This server sits in between — it validates queries, blocks writes by default, and formats results so the AI can actually understand them.

## Architecture

```
AI Agent (Claude / Cursor / GPT)
          │
          │  JSON-RPC over stdio (MCP Protocol)
          ▼
┌─────────────────────────────────────┐
│         MCP DATABASE SERVER         │
│           TypeScript · Node.js      │
│                                     │
│  ┌──────────────┐  ┌─────────────┐  │
│  │ Safety Layer │  │  5 Tools    │  │
│  │              │  │             │  │
│  │ · SQL inject │  │ execute_    │  │
│  │   detection  │  │   query     │  │
│  │ · Write-op   │  │ get_schema  │  │
│  │   blocking   │  │ describe_   │  │
│  │ · Row limits │  │   table     │  │
│  │ · Timeouts   │  │ sample_data │  │
│  │ · Sanitizer  │  │ table_stats │  │
│  └──────────────┘  └─────────────┘  │
└──────────┬──────────────────────────┘
           │  DB Adapter (factory pattern)
    ┌──────┼──────┐
    ▼      ▼      ▼
  [PG]  [MySQL] [MongoDB]
```

Each query passes through the safety layer before reaching the database adapter. The adapter pattern means adding a new database is one file with a standard interface.

## Features

- PostgreSQL, MySQL, MongoDB support
- Read-only by default (SELECT only, unless you flip `ALLOW_WRITE`)
- SQL injection detection — blocks dangerous patterns, validates inputs
- 5 MCP tools: query, schema, describe, sample data, table stats
- Output as markdown tables, JSON, or CSV
- Schema exposed as an MCP resource
- Built-in query helper prompt
- Row limits, query timeouts, write protection
- Docker setup with sample ecommerce data

## Quick Start

```bash
# Clone and install
git clone https://github.com/rohitkapoorfriend/mcp-database-server
cd mcp-database-server
npm install

# Configure your database
cp .env.example .env
# Edit .env with your database credentials

# Build and start
npm run build
node build/index.js
```

## Installation

```bash
npm install
npm run build
```

## Configuration

All configuration is via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_TYPE` | `postgresql` | Database type: `postgresql`, `mysql`, `mongodb` |
| `DB_HOST` | `localhost` | Database host |
| `DB_PORT` | `5432` | Database port |
| `DB_NAME` | `mydb` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | _(empty)_ | Database password |
| `DB_SSL` | `false` | Enable SSL connection |
| `ALLOW_WRITE` | `false` | Allow INSERT/UPDATE/DELETE queries |
| `MAX_ROWS` | `1000` | Maximum rows per query result |
| `QUERY_TIMEOUT` | `30000` | Query timeout in milliseconds |
| `LOG_LEVEL` | `info` | Log level: `debug`, `info`, `warn`, `error` |

## Usage

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "database": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-database-server/build/index.js"],
      "env": {
        "DB_TYPE": "postgresql",
        "DB_HOST": "localhost",
        "DB_PORT": "5432",
        "DB_NAME": "mydb",
        "DB_USER": "postgres",
        "DB_PASSWORD": "your_password"
      }
    }
  }
}
```

### Cursor IDE

Add to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "database": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-database-server/build/index.js"],
      "env": {
        "DB_TYPE": "postgresql",
        "DB_HOST": "localhost",
        "DB_PORT": "5432",
        "DB_NAME": "mydb",
        "DB_USER": "postgres",
        "DB_PASSWORD": "your_password"
      }
    }
  }
}
```

### Claude Code CLI

```bash
DB_TYPE=postgresql DB_HOST=localhost DB_NAME=mydb DB_USER=postgres DB_PASSWORD=pass node build/index.js
```

## Tools

### `execute_query`

Execute a SQL query against the database.

**Input:**
```json
{ "query": "SELECT name, email FROM users LIMIT 5", "format": "table" }
```

**Output:**
```
name  | email
----- | -----------------
Alice | alice@example.com
Bob   | bob@example.com

_2 row(s) returned in 12ms._
```

### `get_schema`

Get the full database schema.

**Input:**
```json
{ "schema": "public" }
```

**Output:** Markdown with all tables, columns, types, keys, indexes.

### `describe_table`

Get detailed information about a specific table.

**Input:**
```json
{ "table_name": "users" }
```

**Output:** Column details, constraints, sample values, indexes.

### `sample_data`

Get sample rows from a table.

**Input:**
```json
{ "table_name": "orders", "limit": 5 }
```

**Output:** Formatted markdown table with sample rows.

### `table_stats`

Get statistics for tables.

**Input:**
```json
{ "table_name": "users" }
```

**Output:** Row count, table size, column count, index count.

## Docker Setup

```bash
# Start server with PostgreSQL and seed data
cd docker
docker-compose up -d

# The PostgreSQL database will be seeded with an ecommerce sample:
# - users (20 rows)
# - products (22 rows)
# - orders (20 rows)
# - order_items (30 rows)
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node build/index.js
```

## Development

```bash
# Run in dev mode (auto-recompile)
npm run dev

# Build
npm run build

# Lint
npm run lint
```

## Project Structure

```
src/
├── index.ts              # Entry point — MCP server setup
├── config.ts             # Environment config with zod validation
├── databases/
│   ├── base.ts           # DatabaseAdapter interface
│   ├── index.ts          # Adapter factory
│   ├── postgresql.ts     # PostgreSQL adapter
│   ├── mysql.ts          # MySQL adapter
│   └── mongodb.ts        # MongoDB adapter
├── tools/
│   ├── query.ts          # execute_query tool
│   ├── schema.ts         # get_schema tool
│   ├── describe.ts       # describe_table tool
│   ├── sample.ts         # sample_data tool
│   └── stats.ts          # table_stats tool
├── resources/
│   └── schema-resource.ts # database://schema resource
├── prompts/
│   └── query-helper.ts   # query_helper prompt
├── safety/
│   ├── query-validator.ts # SQL safety validation
│   └── sanitizer.ts      # Input/output sanitization
└── utils/
    ├── formatter.ts      # Result formatting (table/json/csv)
    └── logger.ts         # Structured stderr logging
```

## Roadmap

- [ ] SSE transport support (HTTP mode)
- [ ] SQLite adapter
- [ ] Redis adapter
- [ ] Connection pooling metrics tool
- [ ] Rate limiting per client

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and add tests
4. Ensure all tests pass: `npm test`
5. Ensure the build succeeds: `npm run build`
6. Submit a pull request

## License

[MIT](LICENSE)