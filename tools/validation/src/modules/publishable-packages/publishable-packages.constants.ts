// ♟️ Constants

/**
 * Generates the success message logged when all tarballs and CLI binaries pass verification.
 */
export const formatPublishablePackagesSuccessMessage = (
  packageCount: number,
  binaryCount: number,
): string =>
  `✔ Verified all ${String(packageCount)} publishable package tarballs and ${String(binaryCount)} CLI binaries from a consumer install`;

/**
 * Names the tarballs a verification needs and `dist/tarballs` lacks.
 */
export const formatMissingTarballsMessage = (
  files: readonly string[],
): string =>
  `❌ dist/tarballs is missing ${files.join(", ")}. Run 'nx run validation:verify-publishable-packages', which packs every publishable package first.`;

/**
 * Message logged when tarballs directory is missing.
 */
export const TARBALLS_DIRECTORY_MISSING_MESSAGE =
  "❌ Tarballs directory dist/tarballs does not exist. Run 'nx run validation:verify-publishable-packages', which packs every publishable package first.";
