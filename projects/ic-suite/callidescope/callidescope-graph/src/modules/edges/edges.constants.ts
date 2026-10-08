// ♟️ Constants

import type { ResolvedCallSite } from "./edges.types";

/** A call that left the traced code: no edge, and no gap to report either. */
export const EXTERNAL_CALL: ResolvedCallSite = {
  declarations: [],
  reason: undefined,
  resolution: "direct",
};

/** A call whose callee could not be identified at all. */
export const DYNAMIC_CALL: ResolvedCallSite = {
  declarations: [],
  reason: "dynamic-value",
  resolution: "direct",
};

/** A call through a computed member name, which nothing can follow. */
export const COMPUTED_MEMBER_CALL: ResolvedCallSite = {
  declarations: [],
  reason: "computed-member",
  resolution: "direct",
};

/** A call whose callee has no symbol the checker will name. */
export const NO_SYMBOL_CALL: ResolvedCallSite = {
  declarations: [],
  reason: "no-symbol",
  resolution: "direct",
};

/** An interface member nothing in the traced code implements. */
export const NO_IMPLEMENTATION_CALL: ResolvedCallSite = {
  declarations: [],
  reason: "no-implementation",
  resolution: "direct",
};

/** An interface member too many classes implement to be worth following. */
export const TOO_MANY_IMPLEMENTATIONS_CALL: ResolvedCallSite = {
  declarations: [],
  reason: "too-many-implementations",
  resolution: "implementation",
};
