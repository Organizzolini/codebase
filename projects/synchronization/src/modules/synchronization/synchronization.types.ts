import type { LoggerService } from "@codebase/logging";

// 🏷️ Types

/**
 * A synchronization command, runnable on its own through its own Nx target.
 *
 * `synchronize` reports success rather than exiting so a caller running
 * several of these can decide what to do with the whole set. Exiting stays in
 * each command's own `run`, where it belongs.
 */
export interface SynchronizableCommand {
  readonly synchronizationLabel: string;
  synchronize(mode: SynchronizationMode): Promise<boolean>;
}

/** Supported synchronization execution modes. */
export type SynchronizationMode = "check" | "write";

/** Shared options for resolving and validating synchronization command mode arguments. */
export interface SynchronizationModeResolutionOptions {
  readonly defaultMode?: SynchronizationMode;
  readonly invalidModeLabel: string;
  readonly loggerService: LoggerService;
  readonly passedParameters: string[];
  readonly usageMessage: string;
}

/** Result of mode parsing before command-specific error handling is applied. */
export type SynchronizationModeResolutionResult =
  | {
      modeValue: string;
      valid: false;
    }
  | {
      modeValue: SynchronizationMode;
      valid: true;
    };

/** Outcome of one command within a run of every synchronization. */
export interface SynchronizationResult {
  readonly label: string;
  readonly succeeded: boolean;
}
