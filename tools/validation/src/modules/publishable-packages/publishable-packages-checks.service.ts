import { existsSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import {
  BROKEN_PROJECT,
  COMMAND_TIMEOUT,
  CONSUMER_GENERATOR,
  formatCommandFailure,
  GENERATED_INSTANCE,
  HEALTHY_PROJECT,
  PLUGIN_TARGET_EXPECTATIONS,
  TYPECHECK_CONFIGURATION,
} from "./publishable-packages-consumer.constants";
import { PublishablePackagesProcessService } from "./publishable-packages-process.service";

import type {
  ConsumerCommandResult,
  ConsumerContext,
  PluginTargetExpectation,
  PublishablePackage,
} from "./publishable-packages.types";

/**
 * Exercises an installed consumer the way a user of the packages would: its
 * imports, its command lines, its project graph, and one target per plugin.
 */
@Injectable()
export class PublishablePackagesChecksService {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly processService: PublishablePackagesProcessService,
  ) {
    this.logger.setContext(PublishablePackagesChecksService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Runs one of the consumer's installed executables. */
  private runBinary(
    context: ConsumerContext,
    binary: string,
    args: readonly string[],
  ): ConsumerCommandResult {
    return this.processService.run(context, {
      args,
      executable: path.join(context.directory, "node_modules", ".bin", binary),
      timeout: COMMAND_TIMEOUT,
    });
  }

  /** Runs each command line's `--help`, which loads its whole command tree. */
  private verifyBinaries(
    context: ConsumerContext,
    publishablePackages: readonly PublishablePackage[],
  ): string[] {
    const binaries = publishablePackages.flatMap((item) =>
      item.binary === undefined ? [] : [item.binary],
    );

    return binaries.flatMap((binary) => {
      const result = this.runBinary(context, binary, ["--help"]);
      const succeeded = result.status === 0 && result.output.includes("Usage:");

      return succeeded
        ? []
        : [formatCommandFailure(`Failed to run ${binary} --help`, result)];
    });
  }

  /**
   * Emits the consumer's conformetry generator plugin, as the documented
   * postinstall would, and generates one instance into the healthy fixture,
   * which the conformetry target then validates alongside the rest.
   */
  private verifyGenerator(context: ConsumerContext): string[] {
    const bootstrap = this.runBinary(
      context,
      "conformetry-nx-bootstrap-generators",
      [],
    );
    if (bootstrap.status !== 0) {
      return [
        formatCommandFailure(
          "Failed to emit the conformetry generator plugin",
          bootstrap,
        ),
      ];
    }

    const generation = this.runBinary(context, "nx", [
      "generate",
      `conformetry:${CONSUMER_GENERATOR}`,
      `--name=${GENERATED_INSTANCE}`,
      `--project=${HEALTHY_PROJECT}`,
      "--no-interactive",
    ]);
    const instance = path.join(
      context.directory,
      "projects",
      HEALTHY_PROJECT,
      "src",
      "greetings",
      GENERATED_INSTANCE,
      `${GENERATED_INSTANCE}.md`,
    );

    return generation.status === 0 && existsSync(instance)
      ? []
      : [
          formatCommandFailure(
            `Failed to generate conformetry:${CONSUMER_GENERATOR}`,
            generation,
          ),
        ];
  }

  /**
   * Runs one inferred target against both fixtures: the healthy one must
   * pass, and the broken one must fail with the text only a gate that ran
   * would print.
   */
  private verifyPluginTarget(
    context: ConsumerContext,
    expectation: PluginTargetExpectation,
  ): string[] {
    const flags = ["--skip-nx-cache", "--output-style=static"];
    const healthy = this.runBinary(context, "nx", [
      "run",
      `${HEALTHY_PROJECT}:${expectation.target}`,
      ...flags,
    ]);
    const broken = this.runBinary(context, "nx", [
      "run",
      `${BROKEN_PROJECT}:${expectation.target}`,
      ...flags,
    ]);
    const messages: string[] = [];

    if (healthy.status !== 0) {
      messages.push(
        formatCommandFailure(
          `${expectation.plugin} failed ${HEALTHY_PROJECT}:${expectation.target}, which should pass`,
          healthy,
        ),
      );
    }
    if (broken.status === 0 || !broken.output.includes(expectation.failure)) {
      messages.push(
        formatCommandFailure(
          `${expectation.plugin} did not fail ${BROKEN_PROJECT}:${expectation.target} with "${expectation.failure}"`,
          broken,
        ),
      );
    }

    return messages;
  }

  /**
   * Builds the consumer's project graph, which loads every registered plugin
   * before a single target can run.
   */
  private verifyProjectGraph(context: ConsumerContext): string[] {
    const result = this.runBinary(context, "nx", [
      "show",
      "projects",
      "--json",
    ]);
    const succeeded =
      result.status === 0 &&
      [HEALTHY_PROJECT, BROKEN_PROJECT].every((project) =>
        result.output.includes(`"${project}"`),
      );

    return succeeded
      ? []
      : [
          formatCommandFailure(
            "Failed to build the consumer's project graph with the plugins registered",
            result,
          ),
        ];
  }

  /**
   * Typechecks one import of every package together, under the TypeScript
   * the consumer installed rather than this workspace's.
   */
  private verifyTypecheck(context: ConsumerContext): string[] {
    const compiler = path.join(
      context.directory,
      "node_modules",
      "typescript",
      "bin",
      "tsc",
    );
    const result = this.processService.run(context, {
      args: [compiler, "--project", TYPECHECK_CONFIGURATION],
      executable: process.execPath,
      timeout: COMMAND_TIMEOUT,
    });

    return result.status === 0
      ? []
      : [
          formatCommandFailure(
            "Failed to typecheck the packages' imports from the consumer",
            result,
          ),
        ];
  }

  // 🌎 Public Methods

  /**
   * Runs every check against an installed consumer.
   *
   * @param context - The installed consumer.
   * @param publishablePackages - The packages it installed.
   * @returns One message per failed check, or none when all of them passed.
   */
  public verifyConsumer(
    context: ConsumerContext,
    publishablePackages: readonly PublishablePackage[],
  ): string[] {
    this.logger.log("🔎 Checking the consumer's imports and command lines");
    const messages = [
      ...this.verifyTypecheck(context),
      ...this.verifyBinaries(context, publishablePackages),
    ];

    this.logger.log("🔌 Checking the consumer's Nx plugins");
    messages.push(
      ...this.verifyProjectGraph(context),
      ...this.verifyGenerator(context),
    );
    for (const expectation of PLUGIN_TARGET_EXPECTATIONS) {
      messages.push(...this.verifyPluginTarget(context, expectation));
    }

    return messages;
  }
}
