import * as fs from "node:fs/promises";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { perseusTreeResponseSchema } from "./perseus.constants";

import type { PerseusTreeNode } from "./perseus.types";

/**
 * Downloads and caches Latin XML sources from the Perseus canonical-latinLit repository.
 */
@Command({
  description: "Run the perseus command",
  name: "perseus",
})
@Injectable()
export class PerseusCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    super();
    this.logger.setContext(PerseusCommand.name);

    this.errorLogFilePath =
      this.logger.createTimestampedOutputLogFilePath("perseus");
  }

  // 🔐 Private Fields

  private readonly errorLogFilePath: string;
  private readonly sourceDataDirectory = path.resolve("data", "perseus-source");
  private readonly sourceHost =
    "https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/";

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Append source download error log for Perseus source ingestion.
   */
  private async appendSourceDownloadErrorLog(
    xmlPath: string,
    error: unknown,
  ): Promise<void> {
    const { logLine } = this.logger.buildErrorLogEntry(xmlPath, error);
    this.logger.error("📥 Failed downloading", String(error), { xmlPath });
    await fs.appendFile(this.errorLogFilePath, logLine);
  }

  /**
   * Download source xml file if missing for Perseus source ingestion.
   */
  private async downloadSourceXmlFileIfMissing(xmlPath: string): Promise<void> {
    const targetPath = path.join(this.sourceDataDirectory, xmlPath);
    try {
      await fs.access(targetPath);
      this.logger.info("⏭️ Skipping already downloaded", undefined, {
        xmlPath,
      });
      return;
    } catch {
      // file does not exist
    }
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    this.logger.info("📥 Downloading", undefined, { xmlPath });
    try {
      await this.fetchAndWriteXmlFile(this.sourceHost + xmlPath, targetPath);
    } catch (error: unknown) {
      await this.appendSourceDownloadErrorLog(xmlPath, error);
    }
  }

  /**
   * Fetch and write xml file for Perseus source ingestion.
   */
  private async fetchAndWriteXmlFile(
    fileUrl: string,
    targetPath: string,
  ): Promise<void> {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      this.logger.warn("📥 Failed fetching", undefined, { fileUrl });
      return;
    }
    const xmlContent = await response.text();
    await fs.writeFile(targetPath, xmlContent, "utf8");
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  }

  /**
   * Fetch source xml paths for Perseus source ingestion.
   */
  private async fetchSourceXmlPaths(): Promise<null | string[]> {
    const treeUrl =
      "https://api.github.com/repos/PerseusDL/canonical-latinLit/git/trees/master?recursive=1";
    this.logger.info("🌳 Fetching Perseus tree", undefined, { treeUrl });
    const treeResponse = await fetch(treeUrl);
    if (!treeResponse.ok) {
      this.logger.error(`🌳 Failed fetching the Perseus tree`);
      return null;
    }
    const treeData = await treeResponse.json();
    const parsedTreeResponse = perseusTreeResponseSchema.safeParse(treeData);
    if (!parsedTreeResponse.success) {
      this.logger.error("🌳 Failed parsing the Perseus tree response");
      return null;
    }

    const treeNodes: PerseusTreeNode[] = parsedTreeResponse.data.tree;

    return treeNodes
      .filter(
        (node) =>
          node.type === "blob" &&
          node.path.endsWith(".xml") &&
          node.path.includes("-lat"),
      )
      .map((node) => node.path);
  }

  // 🌎 Public Methods

  /**
   * Discovers eligible Perseus XML files and stores missing files in the local cache.
   */
  async run(): Promise<void> {
    const xmlPaths = await this.fetchSourceXmlPaths();
    if (!xmlPaths) return;

    this.logger.info("🗂️ Found Latin XML files in Perseus repo", undefined, {
      count: xmlPaths.length,
    });
    await fs.mkdir(this.sourceDataDirectory, { recursive: true });

    for (const xmlPath of xmlPaths) {
      await this.downloadSourceXmlFileIfMissing(xmlPath);
    }

    this.logger.info("📥 Downloaded Perseus source files");
  }
}
