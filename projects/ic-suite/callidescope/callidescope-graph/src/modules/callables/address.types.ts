// 🏷️ Types

import type { DiscoveredCallable } from "./callables.types";
import type { CallableId, SourceLocation } from "@callidescope/core";

/** One declaration an ambiguous address could have meant. */
export interface CallableAddressCandidate {
  readonly id: CallableId;
  readonly location: SourceLocation;
}

/**
 * What resolving a callable address produced.
 *
 * A union rather than an optional id: the four outcomes are told apart by
 * what a caller does next — proceed, or print exactly one of four different
 * messages — and a single `id: CallableId | undefined` cannot carry which of
 * the three failures happened.
 */
export type CallableAddressResolution =
  | {
      readonly candidates: readonly CallableAddressCandidate[];
      readonly kind: "ambiguous";
    }
  | { readonly id: CallableId; readonly kind: "resolved" }
  | { readonly kind: "invalid"; readonly reason: string }
  | { readonly kind: "not-found" };

/** Parts a callable address splits into before it is matched. */
export interface ParsedAddress {
  readonly displayName: string;
  readonly line: number | undefined;
  readonly workspaceRelativePath: string;
}

/** Arguments for resolving one callable address string. */
export interface ResolveAddressArguments {
  readonly address: string;
  readonly callablesById: ReadonlyMap<CallableId, DiscoveredCallable>;
  readonly workspaceRoot: string;
}

/**
 * A resolution that did not name exactly one callable.
 *
 * Derived from `CallableAddressResolution` rather than restated, so anything
 * acting on a failure keeps covering every way one can happen.
 */
export type UnresolvedCallableAddress = Exclude<
  CallableAddressResolution,
  { readonly kind: "resolved" }
>;
