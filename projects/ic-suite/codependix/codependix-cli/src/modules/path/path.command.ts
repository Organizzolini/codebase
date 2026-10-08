import path from "node:path";

import { RunContextService } from "@codependix/boundaries";
import { ConfigurationService } from "@codependix/configuration";
import {
  FORMAT_MARKDOWN,
  PATH_FORMAT_NAMES,
  PathQueryService,
  ReportingService,
} from "@codependix/output";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { PATH_MISSING_ARGUMENTS_ERROR } from "./path.constants";

import type { PathCommandOptions } from "./path.types";

/**
 * CLI entry point for finding connecting paths in codependix dependency graphs.
 *
 * Sibling of `map`: answers a question across graph levels and writes nothing.
 */
@Command({
  arguments: "<from> <to>",
  description:
    "Find the shortest connecting path between two nodes in codependix graphs",
  name: "path",
})
@Injectable()
export class PathCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly logger: LoggerService,
    private readonly pathQueryService: PathQueryService,
    private readonly reportingService: ReportingService,
    private readonly runContextService: RunContextService,
  ) {
    super();
    this.logger.setContext(PathCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Validates the required positional arguments and format option. */
  private validateInputs(
    passedParameters: string[],
    options: PathCommandOptions,
  ): null | {
    format: "json" | "markdown" | "mermaid";
    from: string;
    to: string;
  } {
    const from = passedParameters[0];
    const to = passedParameters[1];

    if (!from || !to) {
      this.logger.error("🕸️ Rejected the command line", undefined, {
        reasons: [PATH_MISSING_ARGUMENTS_ERROR],
      });
      process.exitCode = 1;
      return null;
    }

    const { errors: formatErrors, format } =
      this.pathQueryService.resolveFormat(options.format);

    if (formatErrors.length > 0) {
      this.logger.error("🕸️ Rejected the command line", undefined, {
        reasons: formatErrors,
      });
      process.exitCode = 1;
      return null;
    }

    return { format, from, to };
  }

  // 🌎 Public Methods

  /** Parses the optional configuration path from command-line input. */
  @Option({
    description: "Path to the codependix configuration file",
    flags: "--config [config]",
  })
  public parseConfig(value: string | undefined): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /** Parses the directory whose Nx workspace this run reads. */
  @Option({
    description: "Directory whose Nx workspace this run reads",
    flags: "-d, --directory [directory]",
  })
  public parseDirectory(value: string | undefined): string {
    return this.configurationService.parsePathOption(value);
  }

  /** Parses `--exclude`, a comma-separated list of globs overriding the configured `exclude`. */
  @Option({
    description:
      "Comma-separated globs overriding the configured exclude. Refused when exclude was never configured",
    flags: "--exclude [exclude]",
  })
  public parseExclude(value: string | undefined): string[] {
    return this.configurationService.parseCommaDelimitedOption(value);
  }

  /** Enables the `fileImports` graph type for this query. */
  @Option({
    description: "Query the fileImports graph type",
    flags: "--file-imports",
  })
  public parseFileImports(): true {
    return true;
  }

  /**
   * Parses what `--format` prints to standard output.
   *
   * Defaults to Markdown when the flag was left off entirely.
   */
  @Option({
    description: `What to print to standard output, one of ${PATH_FORMAT_NAMES.join(", ")} (default: ${FORMAT_MARKDOWN})`,
    flags: "-f, --format [format]",
  })
  public parseFormat(value: string | undefined): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /** Parses `--include`, a comma-separated list of globs overriding the configured `include`. */
  @Option({
    description:
      "Comma-separated globs overriding the configured include. Refused when include was never configured",
    flags: "--include [include]",
  })
  public parseInclude(value: string | undefined): string[] {
    return this.configurationService.parseCommaDelimitedOption(value);
  }

  /** Enables the `nestjsModules` graph type for this query. */
  @Option({
    description: "Query the nestjsModules graph type",
    flags: "--nestjs-modules",
  })
  public parseNestjsModules(): true {
    return true;
  }

  /** Disables the `fileImports` graph type for this query. */
  @Option({
    description: "Skip the fileImports graph type for this query",
    flags: "--no-file-imports",
  })
  public parseNoFileImports(): false {
    return false;
  }

  /** Disables the `nestjsModules` graph type for this query. */
  @Option({
    description: "Skip the nestjsModules graph type for this query",
    flags: "--no-nestjs-modules",
  })
  public parseNoNestjsModules(): false {
    return false;
  }

  /** Disables the `nxProjects` graph type for this query. */
  @Option({
    description: "Skip the nxProjects graph type for this query",
    flags: "--no-nx-projects",
  })
  public parseNoNxProjects(): false {
    return false;
  }

  /** Enables the `nxProjects` graph type for this query. */
  @Option({
    description: "Query the nxProjects graph type",
    flags: "--nx-projects",
  })
  public parseNxProjects(): true {
    return true;
  }

  /** Parses the projects a query searches across beyond `include`. */
  @Option({
    description:
      "Comma-separated project names or roots to search across, as globs, beyond those include already selects",
    flags: "--projects [projects]",
  })
  public parseProjects(value: string | undefined): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /** Parses the Nx tags a query searches across, matched exactly against project tags. */
  @Option({
    description:
      "Comma-separated Nx tags to search across, beyond what include already selects",
    flags: "--tags [tags]",
  })
  public parseTags(value: string | undefined): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /** Runs the path query between two nodes across active graph levels. */
  async run(
    passedParameters: string[],
    options: PathCommandOptions = {},
  ): Promise<void> {
    try {
      const inputs = this.validateInputs(passedParameters, options);
      if (!inputs) {
        return;
      }

      const context = await this.runContextService.build({
        mode: "check",
        options,
        workingDirectory: path.resolve(options.directory ?? process.cwd()),
      });

      const results = await this.pathQueryService.query({
        context,
        from: inputs.from,
        to: inputs.to,
      });

      const content = this.pathQueryService.render({
        format: inputs.format,
        results,
      });
      process.stdout.write(`${content}\n`);
    } catch (error) {
      this.reportingService.reportFailure(error);
    }
  }
}
