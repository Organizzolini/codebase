import * as fs from "node:fs/promises";

import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import type { IngestTextArguments, LibraryEntry } from "./literature.types";
import type { Text } from "@codebase/lexico-entities";

/** Ingest a single text entry and emit consistent progress/error logs. */
@Injectable()
export class LiteratureTextIngestionService {
  // 🏗 Dependency Injection

  public constructor(private readonly logger: LoggerService) {
    this.logger.setContext(LiteratureTextIngestionService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Builds hierarchy prefix for literature ingestion.
   */
  private buildHierarchyPrefix(
    authorSlug: string,
    parentText: Text | undefined,
  ): string {
    if (!parentText) {
      return "";
    }

    return `${parentText.slug.replace(`${authorSlug}/`, "")} / `;
  }

  /** Resolves the parent text for the current entry path, if present. */
  private resolveParentText(args: {
    authorSlug: string;
    parentTexts: Map<string, Text>;
    textEntry: LibraryEntry;
  }): Text | undefined {
    const { authorSlug, parentTexts, textEntry } = args;
    if (textEntry.pathParts.length === 0) {
      return undefined;
    }

    const currentPath = [authorSlug, ...textEntry.pathParts].join("/");
    return parentTexts.get(currentPath);
  }

  // 🌎 Public Methods

  /** Runs ingestion for one text entry with standardized start, error, and completion logs. */
  public async ingestTextWithLogging(
    dependencies: {
      ingestText: (args: IngestTextArguments) => Promise<void>;
    },
    argumentsObject: {
      authorEntity: IngestTextArguments["author"];
      authorSlug: string;
      currentText: number;
      logFilePath: string;
      parentTexts: Map<string, Text>;
      textEntry: LibraryEntry;
      totalTexts: number;
    },
  ): Promise<void> {
    const {
      authorEntity,
      authorSlug,
      currentText,
      logFilePath,
      parentTexts,
      textEntry,
      totalTexts,
    } = argumentsObject;

    const parentText = this.resolveParentText({
      authorSlug,
      parentTexts,
      textEntry,
    });
    const hierarchy = this.buildHierarchyPrefix(authorSlug, parentText);

    this.logger.info("📜 Ingesting text", undefined, {
      hierarchy,
      provider: textEntry.provider,
      title: textEntry.title,
    });

    try {
      await dependencies.ingestText({
        author: authorEntity,
        parentText,
        textPath: textEntry.fullPath,
        textSlugName: textEntry.textSlug,
        title: textEntry.title,
      });
    } catch (error: unknown) {
      const { logLine } = this.logger.buildErrorLogEntry(
        textEntry.fullPath,
        error,
      );
      this.logger.error("📜 Failed processing text", String(error), {
        hierarchy,
        provider: textEntry.provider,
        title: textEntry.title,
      });
      await fs.appendFile(logFilePath, logLine);
    }

    this.logger.info("📜 Ingested text", undefined, {
      count: currentText,
      hierarchy,
      percent: Number(((currentText / totalTexts) * 100).toFixed(2)),
      provider: textEntry.provider,
      title: textEntry.title,
      total: totalTexts,
    });
  }
}
