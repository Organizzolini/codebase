// ♟️ Constants

import ts from "typescript";

/**
 * How TypeScript renders the types in a signature.
 *
 * Aliases defined elsewhere are kept by name rather than expanded, because
 * `MeasureArguments` tells a reader more in one word than the object it stands
 * for does in forty.
 */
export const SIGNATURE_FORMAT_FLAGS =
  ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;
