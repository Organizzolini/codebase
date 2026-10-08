import { Injectable } from "@nestjs/common";

import type {
  SynchronizationMode,
  SynchronizationModeResolutionOptions,
  SynchronizationModeResolutionResult,
} from "./synchronization.types";
import type { LoggerService } from "@codebase/logging";

/** Shared service for resolving and validating synchronization command modes. */
@Injectable()
export class SynchronizationService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Logs invalid mode details and exits with status code 1. */
  private exitInvalidMode(options: {
    invalidModeLabel: string;
    loggerService: LoggerService;
    modeValue: string;
    usageMessage: string;
  }): never {
    const { invalidModeLabel, loggerService, modeValue, usageMessage } =
      options;

    loggerService.error(`🚦 Rejected an unusable mode`, undefined, {
      mode: modeValue,
      reason: invalidModeLabel,
      usage: usageMessage,
    });
    process.exit(1);
  }

  /** Resolves mode value and indicates whether it is valid without side effects. */
  private resolveModeValue(
    options: SynchronizationModeResolutionOptions,
  ): SynchronizationModeResolutionResult {
    const { defaultMode = "check", passedParameters } = options;
    const modeValue = passedParameters[0] ?? defaultMode;

    if (this.isSynchronizationMode(modeValue)) {
      return { modeValue, valid: true };
    }

    return { modeValue, valid: false };
  }

  /** Returns true when the provided value is a supported synchronization mode. */
  isSynchronizationMode(modeValue: string): modeValue is SynchronizationMode {
    return modeValue === "check" || modeValue === "write";
  }

  /** Resolves synchronization mode or exits the process when the mode is invalid. */
  resolveSynchronizationModeOrExit(
    options: SynchronizationModeResolutionOptions,
  ): SynchronizationMode {
    const modeResolution = this.resolveModeValue(options);

    if (modeResolution.valid) {
      return modeResolution.modeValue;
    }

    return this.exitInvalidMode({
      invalidModeLabel: options.invalidModeLabel,
      loggerService: options.loggerService,
      modeValue: modeResolution.modeValue,
      usageMessage: options.usageMessage,
    });
  }

  // 🔏 Private Methods

  // 🌎 Public Methods
}
