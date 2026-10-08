// ♟️ Constants

/**
 * Generates the success message logged when all tarballs and CLI binaries pass verification.
 */
export const formatPublishablePackagesSuccessMessage = (
  packageCount: number,
  binaryCount: number,
): string =>
  `✔ Verified all ${String(packageCount)} publishable package tarballs and ${String(binaryCount)} CLI binaries cleanly`;

/**
 * The `-<version>.tgz` suffix `pnpm pack` appends to a tarball name, for any
 * released or prerelease version rather than one fixed version.
 */
export const TARBALL_VERSION_SUFFIX_PATTERN =
  /-\d+\.\d+\.\d+(?:-[\da-z.-]+)?\.tgz$/i;

/**
 * Message logged when tarballs directory is missing.
 */
export const TARBALLS_DIRECTORY_MISSING_MESSAGE =
  "❌ Tarballs directory dist/tarballs does not exist. Run 'nx run-many -t pack' first.";
