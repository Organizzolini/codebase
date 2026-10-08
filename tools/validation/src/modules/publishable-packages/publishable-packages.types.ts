// 🏷️ Types

/**
 * One command run inside the consumer, always as an argument vector and never
 * through a shell.
 */
export interface ConsumerCommand {
  /** Arguments passed to the executable, one element each. */
  readonly args: readonly string[];
  /** Absolute path of the executable, or a name resolved from `PATH`. */
  readonly executable: string;
  /** Milliseconds before the command is killed and reported as failed. */
  readonly timeout: number;
}

/**
 * What a consumer command printed and how it ended.
 */
export interface ConsumerCommandResult {
  /** Standard output then standard error, with terminal escape codes removed. */
  readonly output: string;
  /** Exit code, or `null` when the command was killed or never started. */
  readonly status: null | number;
}

/**
 * Where a consumer lives, and the workspace it must not borrow from.
 */
export interface ConsumerContext {
  /** Absolute, symlink-resolved directory the consumer is installed into. */
  readonly directory: string;
  /** Absolute path of the workspace the tarballs were packed from. */
  readonly workspaceRoot: string;
}

/**
 * Everything needed to write a consumer of the packed packages.
 */
export interface ConsumerOptions {
  /** Packages installed into the consumer, each from its own tarball. */
  readonly publishablePackages: readonly PublishablePackage[];
  /** Directory `pnpm pack` wrote the tarballs into. */
  readonly tarballsDirectory: string;
  /** Workspace whose installed tool versions the consumer pins. */
  readonly workspaceRoot: string;
}

/**
 * One inferred Nx target, and the text its failing fixture must print.
 */
export interface PluginTargetExpectation {
  /**
   * Printed by the `broken` fixture's run, so a plugin that never loaded is
   * not mistaken for a gate that ran and failed.
   */
  readonly failure: string;
  /** Package that registers the plugin. */
  readonly plugin: string;
  /** Target name the consumer's `nx.json` gives the inferred target. */
  readonly target: string;
}

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
  /** Whether every check against the installed consumer passed. */
  readonly succeeded: boolean;
}
