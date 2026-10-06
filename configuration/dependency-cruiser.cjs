/**
 * Dependency Cruiser Configuration
 *
 * Validates architectural boundaries and prevents problematic dependency patterns
 * across the codebase. Rules enforce circular dependency prevention, orphan detection,
 * test isolation, production/dev dependency separation, and module system consistency.
 *
 * Each rule's `comment` field documents its purpose.
 *
 * Usage:
 *   nx run <project>:dependency-cruiser
 *
 * CI: Runs automatically via .github/workflows/lint-codebase.yml
 *     (on PRs affecting source files + weekly scheduled run)
 *
 * @type {import('dependency-cruiser').IConfiguration}
 * @see https://github.com/sverweij/dependency-cruiser
 */
const path = require("node:path");

module.exports = {
  forbidden: [
    {
      comment: "Circular dependencies cause maintenance issues",
      from: {
        // TypeORM bidirectional entity relations (ManyToMany, OneToMany) require
        // value imports of the related entity class for decorator callbacks.
        // These intra-package cycles are intentional and unavoidable.
        pathNot: "^packages/lexico-entities/src/modules/entities/",
      },
      name: "no-circular",
      severity: "error",
      to: {
        circular: true,
      },
    },
    {
      comment: "Orphaned files may indicate dead code",
      from: {
        orphan: true,
        pathNot: [
          String.raw`(^|/)\.[^/]+\.(js|cjs|mjs|ts|cts|mts|json)$`,
          String.raw`(^|/)package\.json$`,
          String.raw`(^|/)tsconfig\.json$`,
          String.raw`\.d\.ts$`,
          String.raw`^applications/.+/project\.json$`,
          String.raw`^applications/.+/vitest\.config\.ts$`,
          String.raw`^applications/lexico/lexico-cli/src/modules/.+\.(types|constants)\.ts$`,
          String.raw`^documentation/.*\.md$`,
          String.raw`^packages/.+/project\.json$`,
          String.raw`^planning/.*\.md$`,
          String.raw`^scripts/.*\.sh$`,
          String.raw`^tools/.+/project\.json$`,
        ],
      },
      name: "no-orphans",
      severity: "warn",
      to: {},
    },
    {
      comment: "Application code should not import test utilities",
      from: {
        pathNot: [String.raw`\.test\.(ts|tsx)$`, "(^|/)testing/"],
      },
      name: "no-test-imports-in-app",
      severity: "error",
      to: {
        path: "(^|/)(testing|__tests__|__mocks__)/",
      },
    },
    {
      comment: "Production code should not depend on devDependencies",
      from: {
        path: "^applications",
        pathNot: [
          String.raw`\.test\.(ts|tsx)$`,
          String.raw`\.spec\.(ts|tsx)$`,
          "(^|/)testing/",
          "(^|/)tests/",
          "(^|/)__tests__/",
          "(^|/)__mocks__/",
          String.raw`(^|/)vitest\.config`,
          String.raw`(^|/)vite\.config`,
        ],
      },
      name: "not-to-dev-dep",
      severity: "error",
      to: {
        dependencyTypes: ["npm-dev"],
        pathNot: ["node_modules/@types/"],
      },
    },
    {
      comment: "Don't import ESM in CommonJS files",
      from: {
        path: String.raw`\.cjs$`,
      },
      name: "no-esm-in-cjs",
      severity: "error",
      to: {
        path: String.raw`\.mjs$`,
      },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    enhancedResolveOptions: {
      conditionNames: ["import", "require", "node", "default"],
      exportsFields: ["exports"],
    },
    exclude: {
      path: [
        // Build outputs should not be analyzed
        "^dist/",
        // Generator template files are not valid TS/JS
        "/files/",
        "/templates/",
        "__[a-zA-Z]+__",
        // Auto-generated files may have circular deps
        String.raw`\.gen\.(ts|tsx|js|jsx)$`,
      ],
    },
    reporterOptions: {
      archi: {
        collapsePattern: "^(applications|packages)/[^/]+",
      },
      dot: {
        collapsePattern: "^node_modules/[^/]+",
      },
    },
    tsConfig: {
      fileName: path.join(__dirname, "tsconfig.json"),
    },
    tsPreCompilationDeps: true,
  },
};
