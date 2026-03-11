# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | ✅ Active           |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report privately via [GitHub Security Advisories](https://github.com/rohitkapoorfriend/mcp-database-server/security/advisories/new) or email the maintainer directly.

We aim to acknowledge reports within **48 hours** and resolve critical issues within **7 days**.

---

## Security Model

This server is a **read-only proxy** between AI agents and your database.

| Protection | How it works |
|---|---|
| SQL injection detection | All queries scanned for ~15 known injection patterns before execution |
| Write protection | INSERT/UPDATE/DELETE/DROP blocked by default unless `ALLOW_WRITE=true` |
| Row limits | Results capped at `MAX_ROWS` (default: 1000) |
| Query timeouts | Queries killed after `QUERY_TIMEOUT` ms (default: 30s) |
| Query length cap | Queries over 10,000 characters are rejected |
| Input sanitization | All tool inputs sanitized before reaching the DB adapter |
| Credential redaction | Connection strings and passwords never appear in logs |

---

## Hardening Checklist for Production

- [ ] Use a **read-only database user** — even if `ALLOW_WRITE=false`, limit DB-level permissions too
- [ ] Set `DB_SSL=true` for remote databases
- [ ] Keep `ALLOW_WRITE=false` (default) unless you explicitly need it
- [ ] Run behind a firewall — never expose the MCP server port publicly
- [ ] Set `LOG_LEVEL=warn` in production to avoid logging query details
- [ ] Rotate database credentials periodically

## Known Limitations

- MongoDB queries receive less strict SQL-injection validation than PostgreSQL/MySQL (they are JSON-based, not SQL)
- No authentication between the AI agent and this MCP server — it relies on stdio transport security
- `ALLOW_WRITE=true` disables write-keyword blocking entirely; use with caution