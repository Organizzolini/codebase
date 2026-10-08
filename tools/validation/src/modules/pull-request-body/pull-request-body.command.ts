import { readFileSync } from "node:fs";

import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import {
  BODY_GUIDANCE_LINES,
  BODY_MISSING_MESSAGE,
  BODY_VALID_MESSAGE,
  EMPTY_SECTIONS_MESSAGE,
  MALFORMED_SECTIONS_MESSAGE,
  MISSING_HEADINGS_MESSAGE,
  OVERSIZED_SECTIONS_MESSAGE,
  PULL_REQUEST_BODY_VARIABLE,
  PULL_REQUEST_TEMPLATE_PATH,
  UNFILLED_COMMENTS_MESSAGE,
  USAGE_LINES,
} from "./pull-request-body.constants";
import { PullRequestBodyService } from "./pull-request-body.service";

import type { BodyVerdict } from "./pull-request-body.types";

/**
 * CLI command that checks a pull request description against its template.
 *
 * Five things, and a description that fails several is reported against all:
 * every one of the four headings must be present, each section must contain
 * content of the one shape it allows, Summary and Details must stay within
 * their word limits, and no `<!-- … -->` prompt from the template may survive.
 *
 * Two input modes, neither of which needs a token. The description normally
 * arrives as `PULL_REQUEST_BODY`, which is the workflow mode. A path argument
 * reads it from a file instead, which is how the check is run by hand — no
 * `gh`, no network, and the raw template is itself a usable input.
 *
 * Exits 0 when the description conforms and 1 when it does not, or when there
 * is no description to check at all.
 */
@Command({
  description:
    "Check that a pull request description carries every heading, non-empty sections of the right shape and length, and no unfilled template comment",
  name: "pull-request-body",
})
@Injectable()
export class PullRequestBodyCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly pullRequestBodyService: PullRequestBodyService,
  ) {
    super();
    this.logger.setContext(PullRequestBodyCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Reports one line, then how to invoke this check, and exits non-zero. */
  private failWithUsageError(failure: string): never {
    console.error(failure);

    for (const usageLine of USAGE_LINES) {
      console.error(usageLine);
    }

    return process.exit(1);
  }

  /** Prints one introduction and one line per failure, when there are any. */
  private reportList(message: string, failures: readonly string[]): void {
    if (failures.length === 0) {
      return;
    }

    console.error(message);

    for (const failure of failures) {
      console.error(`- ${failure}`);
    }

    console.error("");
  }

  /** Prints the failure lists and the guidance that closes them. */
  private reportVerdict(verdict: BodyVerdict): never {
    if (verdict.missingHeadings.length > 0) {
      console.error(
        `${MISSING_HEADINGS_MESSAGE}${verdict.missingHeadings.map((heading) => ` ${heading.replace("## ", "")}`).join("")}`,
      );
      console.error("");
    }

    if (verdict.emptySections.length > 0) {
      console.error(
        `${EMPTY_SECTIONS_MESSAGE}${verdict.emptySections.map((section) => ` ${section.replace("## ", "")}`).join("")}`,
      );
      console.error("");
    }

    this.reportList(MALFORMED_SECTIONS_MESSAGE, verdict.malformedSections);
    this.reportList(OVERSIZED_SECTIONS_MESSAGE, verdict.oversizedSections);
    this.reportList(UNFILLED_COMMENTS_MESSAGE, verdict.unfilledComments);

    for (const guidanceLine of BODY_GUIDANCE_LINES) {
      console.error(guidanceLine);
    }

    return process.exit(1);
  }

  /** Reads the description from wherever this invocation says it lives. */
  private resolveBody(passedParameters: string[]): string {
    if (passedParameters.length > 1) {
      this.failWithUsageError(
        "❌ Expected at most one argument, a path to the file holding the body",
      );
    }

    const bodyPath = passedParameters[0];

    if (bodyPath === undefined) {
      return process.env[PULL_REQUEST_BODY_VARIABLE] ?? "";
    }

    try {
      return readFileSync(bodyPath, "utf8");
    } catch (error) {
      return this.failWithUsageError(
        `❌ Unable to read the body from ${bodyPath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // 🌎 Public Methods

  /** Checks the description and exits 0 or 1 on the verdict. */
  public async run(passedParameters: string[]): Promise<void> {
    // Nothing here is asynchronous; the base class signature is.
    await Promise.resolve();

    const body = this.resolveBody(passedParameters);

    if (body.trim() === "") {
      console.error(BODY_MISSING_MESSAGE);
      process.exit(1);
    }

    const verdict = this.pullRequestBodyService.checkBody({
      body,
      templateComments: this.pullRequestBodyService.extractTemplateComments(
        PULL_REQUEST_TEMPLATE_PATH,
      ),
    });

    if (
      [
        verdict.missingHeadings,
        verdict.emptySections,
        verdict.malformedSections,
        verdict.oversizedSections,
        verdict.unfilledComments,
      ].every((failures) => failures.length === 0)
    ) {
      console.info(BODY_VALID_MESSAGE);

      return;
    }

    this.reportVerdict(verdict);
  }
}
