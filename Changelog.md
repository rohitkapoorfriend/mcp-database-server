# Changelog

All notable changes to this project will be documented in this file.  
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) · Versioning: [SemVer](https://semver.org/)

---

## [Unreleased]

### Planned
- Redis adapter
- SQLite adapter
- Per-tool rate limiting
- Audit log for all executed queries
- Query result caching

---

## [1.1.0] - 2025-03-07

### Added
- `query-validator`: new `validateColumnName()` helper for column-level validation
- `query-validator`: added `RENAME`, `LOCK`, `UNLOCK` to blocked write keywords
- `query-validator`: added 5 new injection patterns — WAITFOR DELAY, PG_SLEEP, xp_cmdshell, CHAR() obfuscation, hex-encoded payloads
- `query-validator`: query length cap (10,000 characters) to prevent oversized payloads
- `query-validator`: schema-qualified table names now accepted (e.g. `public.users`)
- `sanitizer`: new `maskSensitiveData()` helper — masks emails and credit card patterns in log output
- `sanitizer`: new `normalizeIdentifier()` helper — strips quote characters from identifiers
- `formatter`: cell values now truncated at 200 characters to keep markdown tables readable
- `formatter`: `truncated` flag added to `QueryResult` — shown as a warning note in table output
- `formatter`: boolean values now render as `true`/`false` instead of `1`/`0`
- `formatter`: JSON output now includes `truncated` field when results were capped
- `execute_query` tool: truncation warning shown when result hits the row cap
- `execute_query` tool: timeout errors now show a helpful tip about adding WHERE/LIMIT
- `table_stats` tool: numbers now formatted with thousands separators
- `table_stats` tool: total size added to the summary row when showing all tables
- `table_stats` tool: right-aligned numeric columns in the stats table
- `mongodb`: `MONGO_URI` env var now supported as a direct connection string
- `mongodb`: `sort` field now supported in MongoDB JSON queries
- `mongodb`: column union across all documents — rows with missing fields now show `null` instead of being skipped
- `mongodb`: improved connection error message with actionable fix hint
- `mongodb`: connection timeout options set (`serverSelectionTimeoutMS`, `connectTimeoutMS`)
- `mongodb`: null/array JS types now correctly reflected in inferred schema
- GitHub Actions CI workflow (`.github/workflows/ci.yml`) — tests on Node 18 and 20

### Fixed
- `mongodb`: `getSampleRows` could miss fields present only in some documents
- `formatter`: separator line used `-` only, now uses `-+-` to align with column separators

---

## [1.0.0] - 2025-02-01

### Added
- Initial release
- PostgreSQL, MySQL, MongoDB adapters
- 5 MCP tools: `execute_query`, `get_schema`, `describe_table`, `sample_data`, `table_stats`
- MCP resource: `database://schema`
- MCP prompt: `query_helper`
- Safety layer: SQL injection detection, write protection, row limits, query timeouts
- Output formats: markdown table, JSON, CSV
- Docker + ecommerce seed data
- TypeScript + Zod config validation
- Vitest test setup
- ESLint configuration