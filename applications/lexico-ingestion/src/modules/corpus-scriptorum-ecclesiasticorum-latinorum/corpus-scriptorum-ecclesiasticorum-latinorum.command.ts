import * as fs from "node:fs/promises";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { corpusScriptorumTreeResponseSchema } from "./corpus-scriptorum-ecclesiasticorum-latinorum.constants";

import type { CorpusScriptorumTreeNode } from "./corpus-scriptorum-ecclesiasticorum-latinorum.types";

/**
 * Downloads and caches Latin XML sources from the OpenGreekAndLatin CSEL repository.
 */
@Command({
  description: "Run the corpus-scriptorum-ecclesiasticorum-latinorum command",
  name: "corpus-scriptorum-ecclesiasticorum-latinorum",
})
@Injectable()
export class CorpusScriptorumEcclesiasticorumLatinorumCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    super();
    this.logger.setContext(
      CorpusScriptorumEcclesiasticorumLatinorumCommand.name,
    );

    this.errorLogFilePath =
      this.logger.createTimestampedOutputLogFilePath("csel");
  }

  // 🔐 Private Fields

  private readonly errorLogFilePath: string;
  private readonly sourceDataDirectory = path.resolve(
    "data",
    "corpus-scriptorum-ecclesiasticorum-latinorum-source",
  );
  private readonly sourceHost =
    "https://raw.githubusercontent.com/OpenGreekAndLatin/csel-dev/master/";

  /**
   * Downloads one XML file unless it is already present in the local source cache.
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
      const fileUrl = this.sourceHost + xmlPath;
      await this.fetchAndWriteXmlFile(fileUrl, targetPath);
    } catch (error: unknown) {
      const { logLine } = this.logger.buildErrorLogEntry(xmlPath, error);
      this.logger.error("📥 Failed downloading", String(error), { xmlPath });
      await fs.appendFile(this.errorLogFilePath, logLine);
    }
  }

  /**
   * Loads source data required by CSEL source ingestion.
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
    }); // polite delay
  }

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Loads the Git tree payload used to discover downloadable XML blobs.
   */
  private async fetchTree(
    treeUrl: string,
  ): Promise<CorpusScriptorumTreeNode[] | null> {
    this.logger.info("🌳 Fetching CSEL tree", undefined, { treeUrl });
    const treeResponse = await fetch(treeUrl);

    if (!treeResponse.ok) {
      this.logger.error(`🌳 Failed fetching the CSEL tree`);
      return null;
    }

    const treeData = await treeResponse.json();
    const parsedTreeResponse =
      corpusScriptorumTreeResponseSchema.safeParse(treeData);
    if (!parsedTreeResponse.success) {
      this.logger.error("🌳 Failed parsing the CSEL tree response");
      return null;
    }

    return parsedTreeResponse.data.tree;
  }

  // 🌎 Public Methods

  /**
   * Downloads all eligible CSEL Latin XML source files into the local cache.
   */
  async run(): Promise<void> {
    const treeUrl =
      "https://api.github.com/repos/OpenGreekAndLatin/csel-dev/git/trees/master?recursive=1";
    const tree = await this.fetchTree(treeUrl);

    if (!tree) {
      return;
    }

    const xmlPaths = tree
      .filter(
        (node) =>
          node.type === "blob" &&
          node.path.startsWith("data/") &&
          node.path.endsWith(".xml") &&
          !node.path.endsWith("__cts__.xml"),
      )
      .map((node) => node.path);

    this.logger.info("🗂️ Found Latin XML files in CSEL repo", undefined, {
      count: xmlPaths.length,
    });
    await fs.mkdir(this.sourceDataDirectory, { recursive: true });

    for (const xmlPath of xmlPaths) {
      await this.downloadSourceXmlFileIfMissing(xmlPath);
    }

    this.logger.info("📥 Downloaded CSEL source files");
  }
}
