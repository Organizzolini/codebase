// ♟️ Constants

import type { HclResult } from "./hcl.types";

/** Matches a block header, capturing the kind of block it opens. */
export const HCL_BLOCK_PATTERN = /^([A-Za-z_]\w*)\s+(?:"[^"]*"\s*)*\{/;

/** Matches an attribute assignment. */
export const HCL_ATTRIBUTE_PATTERN = /^[A-Za-z_]\w*\s*=/;

/** Matches an interpolation or template expression. */
export const HCL_INTERPOLATION_PATTERN = /\$\{[^}]*\}/g;

/** Empty metrics used to initialize analyzer state. */
export const EMPTY_HCL_RESULT: HclResult = {
  attributes: 0,
  blocks: 0,
  comments: 0,
  files: 0,
  interpolations: 0,
  lines: 0,
  outputs: 0,
  resources: 0,
  variables: 0,
};
