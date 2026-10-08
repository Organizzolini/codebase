import { readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import {
  EMPTY_HCL_RESULT,
  HCL_ATTRIBUTE_PATTERN,
  HCL_BLOCK_PATTERN,
  HCL_INTERPOLATION_PATTERN,
} from "./hcl.constants";

import type { HclInput, HclResult } from "./hcl.types";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Counts the blocks and attributes an HCL configuration declares.
 *
 * Blocks are recognized by the header that opens them, which also names what
 * kind they are: a `resource` block and an `output` block are both blocks, and
 * knowing how many of each is what makes the count worth reading.
 */
@Injectable()
/* v8 ignore stop */
export class HclService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(HclService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Records the block a header opens, by the kind it names. */
  private countBlock(blockKind: string, result: HclResult): void {
    result.blocks++;

    if (blockKind === "resource" || blockKind === "data") {
      result.resources++;
      return;
    }

    if (blockKind === "variable") {
      result.variables++;
      return;
    }

    if (blockKind === "output") {
      result.outputs++;
    }
  }

  /** Records what one line of HCL declares. */
  private countLine(line: string, result: HclResult): void {
    const trimmed = line.trim();

    if (trimmed.startsWith("#") || trimmed.startsWith("//")) {
      result.comments++;
      return;
    }

    result.interpolations += (
      trimmed.match(HCL_INTERPOLATION_PATTERN) ?? []
    ).length;

    const blockKind = HCL_BLOCK_PATTERN.exec(trimmed)?.[1];

    if (blockKind !== undefined) {
      this.countBlock(blockKind, result);
      return;
    }

    if (HCL_ATTRIBUTE_PATTERN.test(trimmed)) {
      result.attributes++;
    }
  }

  // 🌎 Public Methods

  /** Analyze the given HCL files, resolved against the directory. */
  analyze({ hclFiles, workingDirectory }: HclInput): HclResult {
    const result: HclResult = { ...EMPTY_HCL_RESULT };

    for (const filePath of hclFiles) {
      try {
        const content = readFileSync(
          path.resolve(workingDirectory, filePath),
          "utf8",
        );
        const lines = content.split("\n");

        result.files++;
        result.lines += lines.length;

        for (const line of lines) {
          this.countLine(line, result);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn("🏗️ Skipped HCL analysis", undefined, {
          filePath,
          reason: message,
        });
        continue;
      }
    }

    return result;
  }
}
