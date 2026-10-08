// 🏷️ Types

import type { LocateOutcome } from "../callidescope/callidescope.types";
import type {
  CallidescopeOutputFormat,
  ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";

/**
 * A traced workspace, before any address has been matched against it.
 *
 * Held apart from the match so one trace can serve both the list a prompt
 * completes against and the lookup that follows it. Tracing twice to offer a
 * choice and then act on it would double the slowest thing either command
 * does.
 */
export interface LocatedWorkspace {
  readonly configuration: ResolvedCallidescopeConfiguration;
  /** What the lookup prints, resolved from the command line and refused if unknown. */
  readonly format: CallidescopeOutputFormat;
  readonly located: LocateOutcome;
  readonly workspaceRoot: string;
}

/** Arguments for matching an address against an already-traced workspace. */
export interface ResolveAddressArguments {
  readonly address: string;
  readonly workspace: LocatedWorkspace;
}
