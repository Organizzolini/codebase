import { spawnSync } from "node:child_process";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  FROZEN_INSTALL_ARGUMENTS,
  PACKAGE_MANAGER_BINARY,
} from "./lockfile.constants";

import type { FrozenInstallResult } from "./lockfile.types";

/**
 * Asks pnpm whether the lockfile still agrees with the manifests.
 *
 * pnpm rather than a rule written out again here: what "in sync" means is a
 * property of the resolver, and a second opinion would be a second definition
 * to keep in step with the first.
 */
@Injectable()
export class LockfileService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Runs one candidate pnpm, merging both of its streams. */
  private runFrozenInstall(packageManagerPath: string): FrozenInstallResult {
    const completion = spawnSync(packageManagerPath, FROZEN_INSTALL_ARGUMENTS, {
      encoding: "utf8",
    });

    if (completion.error !== undefined) {
      return { available: false, output: "", succeeded: false };
    }

    return {
      available: true,
      output: `${completion.stdout}${completion.stderr}`.trim(),
      succeeded: completion.status === 0,
    };
  }

  // 🌎 Public Methods

  /**
   * Runs `pnpm install --frozen-lockfile --lockfile-only`, wherever pnpm is.
   *
   * The bare name first, then the directory holding the Node that is running
   * this. A git hook runs without a login shell, so the terminal's pnpm may
   * not be on its path — but the Node executing this check is the one a
   * version manager installed pnpm alongside, which is what makes the second
   * candidate the right one rather than a guess.
   */
  public checkLockfile(): FrozenInstallResult {
    const onPath = this.runFrozenInstall(PACKAGE_MANAGER_BINARY);

    if (onPath.available) {
      return onPath;
    }

    return this.runFrozenInstall(
      path.join(path.dirname(process.execPath), PACKAGE_MANAGER_BINARY),
    );
  }
}
