import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { SynchronizationService } from "../synchronization/synchronization.service";

import {
  BLOCK_END_LABEL,
  BLOCK_START_LABEL,
  SKILL_EXCLUSION_FILES,
} from "./skill-exclusions.constants";

import type {
  SynchronizableCommand,
  SynchronizationMode,
} from "../synchronization/synchronization.types";
import type { SkillExclusionFile } from "./skill-exclusions.types";

/**
 * CLI command that syncs the installed-skill exclusion lists from
 * `skills-lock.json`.
 *
 * Installed skills are committed so a fresh worktree holds them, but they are
 * owned upstream, so anything that reaches `.agents/` has to skip them:
 * prettier scans `.`, codometer scans `--directory .`, GitHub Linguist reads
 * every committed file, and cspell and markdownlint both reach `.agents/`
 * because this repository's own skills there are documentation. Each of the
 * five lists one skill per line rather than excluding `.agents/skills/`
 * wholesale, so this repository's own skills in the same directory keep being
 * formatted, measured, attributed, spell-checked, and markdown-linted.
 *
 * Generating them is what keeps the five in step with the lockfile. A skill
 * `skills update` adds is committed but invisible to all five until someone
 * adds it, and nothing else would notice — the symptom is a silently reformatted
 * upstream file, a badge counting somebody else's code, a language bar dominated
 * by a vendored bundle, or a spelling and markdown gate failing on prose this
 * repository has no right to correct.
 */
@Command({
  description: "Run the skill-exclusions command",
  name: "skill-exclusions",
})
@Injectable()
export class SkillExclusionsCommand
  extends CommandRunner
  implements SynchronizableCommand
{
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly synchronizationModeService: SynchronizationService,
  ) {
    super();
    this.logger.setContext(SkillExclusionsCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  readonly synchronizationLabel = "skill-exclusions";

  // 🔏 Private Methods

  /** Every file whose generated block differs from what the lockfile implies. */
  private findStaleFiles(skillNames: string[]): string[] {
    return SKILL_EXCLUSION_FILES.filter((file) => {
      const { generatedContent } = this.readExclusionFile(file);

      return (
        generatedContent.trim() !== this.renderBlock(file, skillNames).trim()
      );
    }).map((file) => file.filePath);
  }

  /** Splits one exclusion file around its generated block. */
  private readExclusionFile(file: SkillExclusionFile): {
    afterMarker: string;
    beforeMarker: string;
    generatedContent: string;
  } {
    const content = readFileSync(
      path.join(process.cwd(), file.filePath),
      "utf8",
    );
    const startMarker = this.renderStartMarker(file);
    const endMarker = this.renderEndMarker(file);
    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
      throw new Error(
        `Markers not found in ${file.filePath}. Expected to find "${startMarker}" and "${endMarker}"`,
      );
    }

    const contentStart = startIndex + startMarker.length;
    // The closing marker keeps whatever indentation its line carries, which is
    // what lets a block sit inside an indented YAML sequence or JSONC array.
    const endLineStart = content.lastIndexOf("\n", endIndex) + 1;

    return {
      afterMarker: content.slice(endLineStart),
      beforeMarker: content.slice(0, contentStart),
      generatedContent: content.slice(contentStart, endLineStart),
    };
  }

  /** Reads the skill names the lockfile declares, sorted for a stable block. */
  private readSkillNames(): string[] {
    const lockfilePath = path.join(process.cwd(), "skills-lock.json");
    const { skills = {} } = JSON.parse(
      readFileSync(lockfilePath, "utf8"),
    ) as Record<"skills", Record<string, unknown> | undefined>;

    return Object.keys(skills).toSorted((left, right) =>
      left.localeCompare(right),
    );
  }

  /** Renders one file's entries, one skill per line in that file's syntax. */
  private renderBlock(file: SkillExclusionFile, skillNames: string[]): string {
    return skillNames
      .map((skillName) => file.renderEntry(skillName))
      .join("\n");
  }

  /** The comment closing this file's generated block, in its own syntax. */
  private renderEndMarker(file: SkillExclusionFile): string {
    return `${file.commentPrefix} ${BLOCK_END_LABEL}`;
  }

  /** The comment opening this file's generated block, in its own syntax. */
  private renderStartMarker(file: SkillExclusionFile): string {
    return `${file.commentPrefix} ${BLOCK_START_LABEL}`;
  }

  /** Rewrites every file's generated block. */
  private writeSync(skillNames: string[]): void {
    for (const file of SKILL_EXCLUSION_FILES) {
      const { afterMarker, beforeMarker } = this.readExclusionFile(file);
      const block = this.renderBlock(file, skillNames);

      writeFileSync(
        path.join(process.cwd(), file.filePath),
        `${beforeMarker}\n${block}\n${afterMarker}`,
        "utf8",
      );
    }

    this.logger.log("🧩 Updated the skill exclusion lists", undefined, {
      files: SKILL_EXCLUSION_FILES.map((file) => file.filePath),
      skills: skillNames.length,
    });
  }

  // 🌎 Public Methods

  /** Runs the skill-exclusions sync command in check or write mode. */
  public async run(passedParameters: string[]): Promise<void> {
    const mode =
      this.synchronizationModeService.resolveSynchronizationModeOrExit({
        invalidModeLabel: "Unknown mode",
        loggerService: this.logger,
        passedParameters,
        usageMessage: "Expected 'check' or 'write'",
      });

    if (!(await this.synchronize(mode))) {
      process.exit(1);
    }
  }

  /** Synchronizes the exclusion lists and reports success without exiting. */
  public async synchronize(mode: SynchronizationMode): Promise<boolean> {
    // Nothing here is asynchronous; the interface is, because other
    // synchronizers load configuration.
    await Promise.resolve();

    try {
      const skillNames = this.readSkillNames();

      if (mode === "write") {
        this.writeSync(skillNames);
        return true;
      }

      const staleFiles = this.findStaleFiles(skillNames);

      if (staleFiles.length > 0) {
        this.logger.log(
          "🧩 Detected out-of-sync skill exclusion lists",
          undefined,
          {
            files: staleFiles,
            hint: "Run 'nx run synchronization:skill-exclusions:write' to sync",
            skills: skillNames.length,
          },
        );
        return false;
      }

      this.logger.log("🧩 Verified the skill exclusion lists", undefined, {
        skills: skillNames.length,
      });
      return true;
    } catch (error) {
      this.logger.error(
        "💥 Failed synchronizing the skill exclusion lists",
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }
}
