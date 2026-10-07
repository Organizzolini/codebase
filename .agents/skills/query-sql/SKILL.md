---
name: query-sql

description: Toolkit for interactively querying and exploring the local PostgreSQL database schema and data using the local psql client. Use when asked to write a SQL query, explore database schemas, inspect table structures, or execute local database queries. Connects as each project's own role to its `<project>_development` database and `<project>` schema, such as lexico's `lexico_development`.`lexico`.
---

# PostgreSQL SQL Query & Exploration

## When to Use This Skill

Use this skill when you need to:

- Explore the schema of the local PostgreSQL database.
- Inspect the structure of specific tables, views, or indexes.
- Draft and execute SQL queries to fetch or analyze data.
- Debug database state or verify data integrity locally.

## Prerequisites

- The local PostgreSQL container must be running. Use `nx run codebase:postgres-container:up` if needed.
- `psql` (PostgreSQL client) must be installed locally.
- Know which project's data you are querying. Each database-backed project has its own database, schema, and role ([ADR 0022](../../../docs/adr/0022-give-every-database-project-its-own-database-schema-and-role.md)):

  | Project     | Database                | Schema      | Role / password                             |
  | ----------- | ----------------------- | ----------- | ------------------------------------------- |
  | `lexico`    | `lexico_development`    | `lexico`    | `lexico_username` / `lexico_password`       |
  | `meanderaw` | `meanderaw_development` | `meanderaw` | `meanderaw_username` / `meanderaw_password` |
  | `caelundas` | `caelundas_development` | `caelundas` | `caelundas_username` / `caelundas_password` |

  Lexico's dictionary and literature tables live in `lexico_development`.`lexico`, not in `postgres`.`public`.

- Each project reads its own `<PROJECT>_POSTGRES_*` variables, defaulting to the values above. The root `.env`'s unprefixed `POSTGRES_*` are the shared container's admin login; use them only for administration, never to query a project's data.

## Step-by-Step Workflows

### 1. Schema Exploration

To explore the database quickly, use `psql` meta-commands passed via the `-c` flag. Connect as the project's role to its database; the examples use lexico, and the `LEXICO_POSTGRES_*` defaults apply when the variables are unset. Swap the prefix and defaults for another project.

- **List all tables:**

  ```bash
  PGPASSWORD=${LEXICO_POSTGRES_PASSWORD:-lexico_password} psql -h ${LEXICO_POSTGRES_HOST:-localhost} -p ${LEXICO_POSTGRES_PORT:-5432} -U ${LEXICO_POSTGRES_USERNAME:-lexico_username} -d ${LEXICO_POSTGRES_DATABASE:-lexico_development} -c "\dt lexico.*"

  ```

- **Describe a specific table:**

  ```bash
  PGPASSWORD=${LEXICO_POSTGRES_PASSWORD:-lexico_password} psql -h ${LEXICO_POSTGRES_HOST:-localhost} -p ${LEXICO_POSTGRES_PORT:-5432} -U ${LEXICO_POSTGRES_USERNAME:-lexico_username} -d ${LEXICO_POSTGRES_DATABASE:-lexico_development} -c "\d+ lexico.table_name"

  ```

- **List all schemas:**

  ```bash
  PGPASSWORD=${LEXICO_POSTGRES_PASSWORD:-lexico_password} psql -h ${LEXICO_POSTGRES_HOST:-localhost} -p ${LEXICO_POSTGRES_PORT:-5432} -U ${LEXICO_POSTGRES_USERNAME:-lexico_username} -d ${LEXICO_POSTGRES_DATABASE:-lexico_development} -c "\dn"

  ```

### 2. Query Execution

**CRITICAL:** NEVER execute multiline or complex queries using the inline `-c` flag, as this often leads to shell escaping errors. Always use `notepads/notepad.sql` as a scratchpad.

1. **Write the query to the scratchpad:**
   Use your file editing tools to write your SQL query into `notepads/notepad.sql`.

2. **Execute the query:**
   Run the file using the `-f` flag in the terminal:

   ```bash
   PGPASSWORD=${LEXICO_POSTGRES_PASSWORD:-lexico_password} psql -h ${LEXICO_POSTGRES_HOST:-localhost} -p ${LEXICO_POSTGRES_PORT:-5432} -U ${LEXICO_POSTGRES_USERNAME:-lexico_username} -d ${LEXICO_POSTGRES_DATABASE:-lexico_development} -f notepads/notepad.sql
   ```

## Good SQL Practices

- **Always use `LIMIT`:** When running exploratory `SELECT` queries, always append a limit (e.g., `LIMIT 10`) to avoid flooding the terminal output.
- **Use Expanded Display (`\x`):** For queries returning many columns, prepend `\x on;` to your query in `notepads/notepad.sql` to render the output in a readable key-value format (similar to MySQL's `\G`).

  \_Example `notepads/notepad.sql`:*

  ```sql
  \x on;
  SELECT * FROM lexico.lexemes LIMIT 1;

  ```

- **Formatting:** Keep SQL clean and well-indented in the scratchpad for easy review and modification.
