#!/usr/bin/env tsx
/**
 * Parses TypeORM migration files using the TypeScript compiler API and
 * extracts the raw SQL statements from `up` and `down` methods into separate
 * .sql files for linting and review, so sqlfluff and squawk lint every
 * database project's migrations the same way.
 *
 * Modes:
 *   --mode=latest  (default) Process only the most recently generated migration
 *   --mode=all               Process all migrations.
 *
 * Directory:
 *   --directory=<path>  The migrations directory, relative to the workspace
 *                       root. The `migration` target defaults pass
 *                       `{projectRoot}/<module>/migrations`, `<module>`
 *                       being the target's `module` option.
 *
 * Output, beside each migration:
 *   <directory>/<name>-up.sql
 *   <directory>/<name>-down.sql.
 *
 * Usage (run from workspace root):
 *   nx run <project>:migration:extract-sql-latest
 *   nx run <project>:migration:extract-sql-all.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import ts from "typescript";

const MIGRATION_GLOB = /^\d{13}-\w.*\.ts$/;

/**
 * Describes behavior.
 */
type Mode = "all" | "latest";

/**
 * Extract sql from literal.
 */
function extractSqlFromLiteral(
  argument: ts.Expression,
  sourceFile: ts.SourceFile,
): string | undefined {
  if (ts.isStringLiteral(argument)) return argument.text;
  if (ts.isNoSubstitutionTemplateLiteral(argument)) return argument.text;
  if (ts.isTemplateLiteral(argument)) {
    const { line } = sourceFile.getLineAndCharacterOfPosition(
      argument.getStart(),
    );
    console.warn(
      `Warning: template literal with expressions found at ${sourceFile.fileName}:${line + 1} — skipping`,
    );
  }
  return undefined;
}

/**
 * Extract sql from method.
 */
function extractSqlFromMethod(
  method: ts.MethodDeclaration,
  sourceFile: ts.SourceFile,
): string[] {
  const statements: string[] = [];

  /**
   * Visit.
   */
  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "query"
    ) {
      const firstArgument = node.arguments[0];
      if (firstArgument === undefined) {
        ts.forEachChild(node, visit);
        return;
      }

      const sql = extractSqlFromLiteral(firstArgument, sourceFile);
      if (sql !== undefined) {
        const trimmed = sql.trim();
        const normalized = trimmed.endsWith(";") ? trimmed : `${trimmed};`;
        statements.push(normalized);
      }
    }

    ts.forEachChild(node, visit);
  }

  ts.forEachChild(method, visit);
  return statements;
}

/**
 * Extract sql from migration.
 */
function extractSqlFromMigration(
  source: string,
  filePath: string,
): { down: string[]; up: string[] } {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
  );

  let upStatements: string[] = [];
  let downStatements: string[] = [];

  /**
   * Visit.
   */
  function visit(node: ts.Node): void {
    if (ts.isClassDeclaration(node)) {
      for (const member of node.members) {
        if (
          ts.isMethodDeclaration(member) &&
          ts.isIdentifier(member.name) &&
          (member.name.text === "up" || member.name.text === "down")
        ) {
          const sql = extractSqlFromMethod(member, sourceFile);
          if (member.name.text === "up") {
            upStatements = sql;
          } else {
            downStatements = sql;
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);

  return { down: downStatements, up: upStatements };
}

/**
 * Find migration files.
 */
async function findMigrationFiles(
  mode: Mode,
  directory: string,
): Promise<string[]> {
  const entries = await readdir(directory);
  const sorted = entries.filter((f) => MIGRATION_GLOB.test(f)).toSorted();

  if (sorted.length === 0) {
    throw new Error(`No migration files found in ${directory}`);
  }

  if (mode === "latest") {
    const latest = sorted.at(-1);
    if (latest === undefined) {
      throw new Error(`No migration files found in ${directory}`);
    }
    return [path.join(directory, latest)];
  }

  return sorted.map((f) => path.join(directory, f));
}

/**
 * Main.
 */
async function main(): Promise<void> {
  const mode = parseMode();
  const directory = parseDirectory();
  const migrationPaths = await findMigrationFiles(mode, directory);

  console.log(
    `Mode: ${mode} — processing ${migrationPaths.length} migration(s)`,
  );

  const generatedFiles: string[] = [];

  for (const file of migrationPaths) {
    const { downPath, upPath } = await processMigrationFile(file);
    generatedFiles.push(upPath, downPath);
  }

  console.log(`\nSuccessfully extracted SQL:`);
  for (const file of generatedFiles) {
    console.log(`  ${file}`);
  }
}

/**
 * Parse directory.
 */
function parseDirectory(): string {
  const flag = process.argv.find((argument) =>
    argument.startsWith("--directory="),
  );
  const value = flag?.slice("--directory=".length);
  if (value === undefined || value === "") {
    throw new Error("Pass the migrations directory as --directory=<path>.");
  }
  return value;
}

/**
 * Parse mode.
 */
function parseMode(): Mode {
  const flag = process.argv.find((argument) => argument.startsWith("--mode="));
  const value = flag?.split("=")[1];
  if (value === "all") return "all";
  return "latest";
}

/**
 * Process migration file.
 */
async function processMigrationFile(
  file: string,
): Promise<{ downPath: string; upPath: string }> {
  const directory = path.dirname(file);
  const source = await readFile(file, "utf8");

  const { down, up } = extractSqlFromMigration(source, file);

  if (up.length === 0) {
    console.warn(
      `Warning: no SQL statements found in \`up\` method of ${path.basename(file)}`,
    );
  }

  if (down.length === 0) {
    console.warn(
      `Warning: no SQL statements found in \`down\` method of ${path.basename(file)}`,
    );
  }

  const baseName = path.basename(file, ".ts");
  const upPath = path.join(directory, `${baseName}-up.sql`);
  const downPath = path.join(directory, `${baseName}-down.sql`);

  const timeoutConfig =
    "SET lock_timeout = '10s';\nSET statement_timeout = '5m';";

  await writeFile(
    upPath,
    `${timeoutConfig}\n\n${up.join("\n\n")}${up.length > 0 ? "\n" : ""}`,
  );
  await writeFile(
    downPath,
    `${timeoutConfig}\n\n${down.join("\n\n")}${down.length > 0 ? "\n" : ""}`,
  );

  console.log(`Wrote ${up.length} statement(s) to ${baseName}-up.sql`);
  console.log(`Wrote ${down.length} statement(s) to ${baseName}-down.sql`);

  return { downPath, upPath };
}

await main();
