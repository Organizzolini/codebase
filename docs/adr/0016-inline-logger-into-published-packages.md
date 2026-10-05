# Inline the shared logger into published packages

The shared `@codebase/logging` utility is bundled and inlined directly into each
published package's build output rather than published to npm as a standalone
package. The Vite library build configuration automatically includes logger
sources in emitted bundles and rolls up logger declarations into bundled `.d.ts`
files.

This keeps `@codebase/logging` private to this repository and avoids claiming
a public package name on the registry for an internal cross-cutting utility.

## Considered options

- **Publish `@codebase/logging` as a public package on npm.** Rejected:
  publishing the logger would require registering and maintaining a public
  package name, committing to public API stability and semver guarantees, and
  managing standalone releases for an internal utility tailored to this
  repository's NestJS and Pino conventions.
- **Tree-shake and eliminate logging from published packages.** Rejected:
  structured logging is essential for CLI observability and diagnostic output
  across all four IC-suite toolchains. Removing logging would degrade the
  developer experience for consumers running commands.
- **Inline `@codebase/logging` into published packages via Vite library build.**
  Chosen: Vite bundles `@codebase/logging` implementation into each package's
  ESM output, and declaration bundling embeds its types into the single `.d.ts`
  bundle.

## Consequences

- **Duplicate-identity cost:** A consumer who installs multiple suites (such as
  `@conformetry/cli` and `@codometer/cli`) receives separate bundled copies of
  the logger code and therefore separate logger root instances. This cost is
  explicitly accepted because the logger has no cross-suite shared state or
  global singleton requirements.
- **Monorepo internal resolution is unchanged:** Applications and packages
  within this repository continue resolving `@codebase/logging` as a workspace
  dependency pointing directly to TypeScript source, maintaining unified local
  development without intermediate build steps.
- **Shared build configuration bundles the logger by default:**
  `configuration/vite.library.config.ts` treats `@codebase/logging` as bundled
  instead of external, ensuring consistent bundling across all publishable
  packages.
