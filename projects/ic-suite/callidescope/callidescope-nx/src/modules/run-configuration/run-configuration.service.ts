import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { ConfigurationService } from "@callidescope/configuration";
import { Injectable } from "@nestjs/common";

import { OptionsService } from "../options/options.service";

import { NX_CONFIGURATION_FILENAME } from "./run-configuration.constants";

import type {
  LoadedRunConfiguration,
  LoadRunConfigurationArguments,
} from "./run-configuration.types";

/**
 * Finds and reads the callidescope configuration one run is judged by.
 *
 * Its own service rather than more of `PluginService`, because every target
 * here starts by answering the same question — which configuration file is
 * this run's — and none of them can be written until it is answered. Keeping
 * it apart also keeps the verdict and the inference in `PluginService` beside
 * each other, which is where the rules a reader comes looking for are.
 */
@Injectable()
export class RunConfigurationService {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly optionsService: OptionsService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Reads the workspace's `nx.json`, so this plugin's own registration can be
   * consulted for a configuration path an executor was not given.
   *
   * Unreadable or malformed is not an error: the caller falls back to the
   * conventional filenames, which a workspace with no registration gets anyway.
   */
  private readNxConfiguration(workspaceRoot: string): unknown {
    try {
      return JSON.parse(
        readFileSync(
          path.join(workspaceRoot, NX_CONFIGURATION_FILENAME),
          "utf8",
        ),
      ) as unknown;
    } catch {
      return undefined;
    }
  }

  // 🌎 Public Methods

  /**
   * Resolves and loads the configuration one run is judged by.
   *
   * The file-aware load rather than the plain one: a run resolves a
   * configuration beside every project it reaches, and skips whichever file is
   * already serving as this run's own.
   */
  public async load(
    args: LoadRunConfigurationArguments,
  ): Promise<LoadedRunConfiguration> {
    const configurationPath =
      args.configurationPath ??
      this.optionsService.resolveConfigurationPath({
        exists: (candidatePath) =>
          existsSync(path.join(args.workspaceRoot, candidatePath)),
        nxConfiguration: this.readNxConfiguration(args.workspaceRoot),
      });
    const loaded = await this.configurationService.loadConfigurationFile({
      configurationPath,
      searchDirectory: args.workspaceRoot,
    });

    return { configuration: loaded.configuration, path: loaded.path };
  }
}
