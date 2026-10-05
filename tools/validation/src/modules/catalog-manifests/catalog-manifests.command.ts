import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { CatalogManifestsService } from "./catalog-manifests.service";

/**
 * CLI command that enforces the workspace catalog policy.
 *
 * Every external dependency in every workspace manifest must be pinned
 * `catalog:`, and every internal one `workspace:*`. Both directions are
 * checked, in all four dependency sections, and every violation is reported
 * together rather than one run at a time.
 *
 * Exits 0 when every manifest conforms and 1 when any of them does not.
 */
@Command({
  description:
    "Check that workspace manifests pin externals as catalog: and internals as workspace:*",
  name: "catalog-manifests",
})
@Injectable()
export class CatalogManifestsCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly catalogManifestsService: CatalogManifestsService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(CatalogManifestsCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks every workspace manifest and exits 0 or 1 on the verdict. */
  public async run(): Promise<void> {
    // Nothing here is asynchronous; the base class signature is.
    await Promise.resolve();

    const manifestPaths =
      this.catalogManifestsService.resolveWorkspaceManifestPaths(process.cwd());
    const violations = manifestPaths.flatMap((manifestPath) =>
      this.catalogManifestsService.validateManifestDependencies(
        manifestPath,
        this.catalogManifestsService.readManifest(manifestPath),
      ),
    );

    if (violations.length === 0) {
      console.info(
        `Catalog policy passed for ${String(manifestPaths.length)} workspace manifests.`,
      );

      return;
    }

    console.error("Catalog policy violations found:");

    for (const violation of violations) {
      console.error(`- ${violation}`);
    }

    process.exit(1);
  }
}
