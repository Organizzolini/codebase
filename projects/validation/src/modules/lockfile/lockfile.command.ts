import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import {
  LOCKFILE_IN_SYNC_MESSAGE,
  LOCKFILE_OUT_OF_SYNC_MESSAGES,
  PACKAGE_MANAGER_MISSING_MESSAGE,
} from "./lockfile.constants";
import { LockfileService } from "./lockfile.service";

/**
 * CLI command that checks `pnpm-lock.yaml` against the workspace manifests.
 *
 * It is pnpm's own `--frozen-lockfile` refusal, reported with the command that
 * fixes it. No Nx target models this, because the thing being checked is not a
 * file's contents but whether a resolution still holds.
 *
 * Exits 0 when the lockfile is in sync, and 0 again when pnpm cannot be found
 * at all — see `PACKAGE_MANAGER_MISSING_MESSAGE`. Exits 1 only when pnpm ran
 * and refused.
 */
@Command({
  description:
    "Check that pnpm-lock.yaml is in sync with the workspace manifests",
  name: "lockfile",
})
@Injectable()
export class LockfileCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly lockfileService: LockfileService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(LockfileCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the lockfile and exits 0 or 1 on pnpm's verdict. */
  public async run(): Promise<void> {
    // Nothing here is asynchronous; the base class signature is.
    await Promise.resolve();

    const result = this.lockfileService.checkLockfile();

    if (!result.available) {
      console.warn(PACKAGE_MANAGER_MISSING_MESSAGE);

      return;
    }

    if (result.succeeded) {
      console.info(LOCKFILE_IN_SYNC_MESSAGE);

      return;
    }

    for (const message of LOCKFILE_OUT_OF_SYNC_MESSAGES) {
      console.error(message);
    }

    console.error(result.output);
    process.exit(1);
  }
}
