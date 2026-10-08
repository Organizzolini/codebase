// ♟️ Constants

import type { CssResult } from "./css.types";

/** The at-rule name a media query uses. */
export const CSS_MEDIA_AT_RULE = "media";

/** Empty metrics used to initialize analyzer state. */
export const EMPTY_CSS_RESULT: CssResult = {
  atRules: 0,
  comments: 0,
  customProperties: 0,
  declarations: 0,
  files: 0,
  lines: 0,
  mediaQueries: 0,
  rules: 0,
  selectors: 0,
};
