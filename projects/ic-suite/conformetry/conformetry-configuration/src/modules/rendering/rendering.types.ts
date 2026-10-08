// 🏷️ Types

/**
 * Placeholder values applied when rendering a template.
 *
 * Built from the generator name by `RenderingService.buildNameSubstitutions`
 * and then merged with the caller's own inputs, so an explicit input always
 * wins over a derived name variant.
 */
export type Substitutions = Record<string, string>;
