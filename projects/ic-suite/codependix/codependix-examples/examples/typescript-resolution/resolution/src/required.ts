declare function require(specifier: string): unknown;

/** A `require` call is not an import declaration either — no edge. */
export const settings = require("./settings.js");
