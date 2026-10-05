import { ConfigurationService } from "@codometer/configuration";
import {
  ChangesService,
  CODOMETER_MARKERS,
  DocumentsService,
  RenderService,
} from "@codometer/output";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import type { ChangesCommandOptions } from "./changes.types";

/**
 * CLI entry point for the pull request change report.
 *
 * Diffs every project's codometer report against a baseline snapshot and
 * puts the result wherever it was asked for. Only ever reads and writes a
 * local markdown file — handing that file to a pull request, an issue, or a
 * wiki is the caller's job, which keeps this command independent of any one
 * forge's API.
 */
@Command({
  description: "Report codometer's changes against a baseline",
  name: "changes",
})
@Injectable()
export class ChangesCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly changesService: ChangesService,
    private readonly documentsService: DocumentsService,
    private readonly renderService: RenderService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(ChangesCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Parse the baseline directory holding a snapshot of the reports. */
  @Option({
    description: "Directory holding a baseline snapshot of the reports",
    flags: "--baseline [baseline]",
  })
  public parseBaseline(value: unknown): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /** Parse the run URL the baseline came from, linked from the summary. */
  @Option({
    description: "Run URL the baseline came from",
    flags: "--baseline-url [baselineUrl]",
  })
  public parseBaselineUrl(value: unknown): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /** Parse the directory to look for codometer reports in. */
  @Option({
    description: "Directory to look for codometer reports in",
    flags: "-d, --directory [directory]",
  })
  public parseDirectory(value: unknown): string {
    return this.configurationService.parseDirectoryOption(value);
  }

  /** Parse the markdown document the report is spliced into. */
  @Option({
    description: "Markdown document to splice the report into",
    flags: "--markdown [markdown]",
  })
  public parseMarkdown(value: unknown): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /** Parse the file the report is written to on its own. */
  @Option({
    description: "File to write the report to",
    flags: "--output [output]",
  })
  public parseOutput(value: unknown): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /** Diffs every project's report against the baseline, and emits the result. */
  async run(
    _passedParameters: string[],
    options: ChangesCommandOptions,
  ): Promise<void> {
    const baseline = this.configurationService.parseOptionalOption(
      options.baseline,
    );
    const workingDirectory = this.configurationService.parseDirectoryOption(
      options.directory,
    );

    const collection = this.changesService.collect({
      baselineDirectory: baseline,
      workingDirectory,
    });

    this.logger.info("⏲️ Collected the codometer change report", undefined, {
      failures: collection.failures.length,
      rows: collection.rows.length,
    });

    const body = this.renderService.renderSection({
      baselineUrl: this.configurationService.parseOptionalOption(
        options.baselineUrl,
      ),
      failures: collection.failures,
      rows: collection.rows,
    });

    await this.documentsService.emit({
      body,
      destination: {
        markdown: this.configurationService.parseOptionalOption(
          options.markdown,
        ),
        output: this.configurationService.parseOptionalOption(options.output),
      },
      label: "codometer changes",
      markers: CODOMETER_MARKERS,
    });
  }
}
