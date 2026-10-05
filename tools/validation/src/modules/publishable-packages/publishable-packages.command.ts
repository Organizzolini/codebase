import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { formatPublishablePackagesSuccessMessage } from "./publishable-packages.constants";
import { PublishablePackagesService } from "./publishable-packages.service";

/**
 * CLI command that verifies publishable package tarballs and CLI binaries.
 */
@Command({
  description:
    "Verify that publishable package tarballs install, typecheck, and execute CLI binaries cleanly",
  name: "publishable-packages",
})
@Injectable()
export class PublishablePackagesCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly publishablePackagesService: PublishablePackagesService,
  ) {
    super();
    this.logger.setContext(PublishablePackagesCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Executes the publishable package tarball verification and exits 0 on success, 1 on failure.
   */
  public async run(): Promise<void> {
    await Promise.resolve();

    const result = this.publishablePackagesService.verifyPublishablePackages(
      process.cwd(),
    );

    if (result.succeeded) {
      console.info(
        formatPublishablePackagesSuccessMessage(
          result.packageCount,
          result.binaryCount,
        ),
      );

      return;
    }

    for (const message of result.messages) {
      console.error(message);
    }

    process.exit(1);
  }
}
