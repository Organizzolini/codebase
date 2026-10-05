import * as fs from "node:fs/promises";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import _ from "lodash";

import { LoggerService } from "@codebase/logging";

import type { LibraryEntry } from "./literature.types";

/**
 * Scans provider markdown directories and returns discovered literature files.
 */
@Injectable()
export class LiteratureLibraryScanService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(LiteratureLibraryScanService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Returns whether an unknown error is Node's "file or directory not found" error.
   */
  private isMissingDirectoryError(error: unknown): boolean {
    return (
      error instanceof Error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    );
  }

  /**
   * Recursively walks one provider directory and collects markdown entries.
   */
  private async walkLibraryDirectory(args: {
    authorSlug: string;
    currentPathParts: string[];
    directory: string;
    providerName: string;
    texts: LibraryEntry[];
  }): Promise<void> {
    const { authorSlug, currentPathParts, directory, providerName, texts } =
      args;
    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        await this.walkLibraryDirectory({
          authorSlug,
          currentPathParts: [...currentPathParts, entry.name],
          directory: path.join(directory, entry.name),
          providerName,
          texts,
        });
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith(".md")) {
        continue;
      }

      texts.push({
        authorSlug,
        fullPath: path.join(directory, entry.name),
        pathParts: currentPathParts,
        provider: providerName,
        textSlug: path.basename(entry.name, ".md"),
        title: _.startCase(path.basename(entry.name, ".md")),
      });
    }
  }

  // 🌎 Public Methods

  /**
   * Walks the library data directory and collects text file metadata.
   */
  public async scanLibrary(): Promise<LibraryEntry[]> {
    const dataDirectory = path.resolve("data", "library");
    const texts: LibraryEntry[] = [];

    try {
      const providers = await fs.readdir(dataDirectory, {
        withFileTypes: true,
      });

      for (const provider of providers) {
        if (!provider.isDirectory()) {
          continue;
        }

        const providerName = provider.name;
        const authors = await fs.readdir(
          path.join(dataDirectory, providerName),
          {
            withFileTypes: true,
          },
        );

        for (const author of authors) {
          if (!author.isDirectory()) {
            continue;
          }

          await this.walkLibraryDirectory({
            authorSlug: author.name,
            currentPathParts: [],
            directory: path.join(dataDirectory, providerName, author.name),
            providerName,
            texts,
          });
        }
      }
    } catch (error) {
      if (!this.isMissingDirectoryError(error)) {
        this.logger.warn("⚠️ Failed reading the library directory", undefined, {
          dataDirectory,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return texts;
  }
}
