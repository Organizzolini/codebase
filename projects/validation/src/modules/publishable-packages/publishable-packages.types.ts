// 🏷️ Types

/**
 * Specification for a publishable package to be verified.
 */
export interface PublishablePackage {
  /** Optional binary command name for CLI packages. */
  readonly binary?: string;
  /** Scoped npm package name, e.g. `@conformetry/cli`. */
  readonly name: string;
  /** Tarball base filename without extension or version, e.g. `conformetry-cli`. */
  readonly tarball: string;
  /** Manifest version, which `pnpm pack` appends to the tarball filename. */
  readonly version: string;
}

/**
 * Result of running the publishable packages tarball verification.
 */
export interface PublishablePackagesVerificationResult {
  /** Total number of CLI binaries verified. */
  readonly binaryCount: number;
  /** Detail or failure messages logged during verification. */
  readonly messages: readonly string[];
  /** Total number of publishable packages verified. */
  readonly packageCount: number;
  /** Whether all tarballs installed, typechecked, and ran CLI binaries cleanly. */
  readonly succeeded: boolean;
}
