import * as fs from "node:fs/promises";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { epigraphikDatenbankChunkResponseSchema } from "./epigraphik-datenbank-clauss-slaby.constants";

import type { EpigraphikDatenbankChunkResponse } from "./epigraphik-datenbank-clauss-slaby.types";

/**
 * Download raw JSON chunks from the Epigraphik-Datenbank Clauss-Slaby API.
 */
@Command({
  description: "Run the epigraphik-datenbank-clauss-slaby command",
  name: "epigraphik-datenbank-clauss-slaby",
})
@Injectable()
export class EpigraphikDatenbankClaussSlabyCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    super();
    this.logger.setContext(EpigraphikDatenbankClaussSlabyCommand.name);

    this.errorLogFilePath =
      this.logger.createTimestampedOutputLogFilePath("edcs");
  }

  // 🔐 Private Fields

  private readonly batchSize = 1000;
  private readonly errorLogFilePath: string;
  private readonly limit = 1_000_000;
  private readonly sourceDataDirectory = path.resolve(
    "data",
    "epigraphik-datenbank-clauss-slaby-source",
  );
  private readonly sourceHost = "https://edcs.hist.uzh.ch/api/query";

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Handles an internal workflow step for EDCS chunk ingestion.
   */
  private async downloadChunkData(
    start: number,
    chunkFile: string,
  ): Promise<boolean> {
    this.logger.info("📥 Fetching records", undefined, {
      end: start + this.batchSize,
      start,
    });

    try {
      return await this.saveChunkData(start, chunkFile);
    } catch (error: unknown) {
      const { logLine } = this.logger.buildErrorLogEntry(
        `chunk-${start}`,
        error,
      );
      this.logger.error("🌐 Failed fetching chunk", String(error), { start });
      await fs.appendFile(this.errorLogFilePath, logLine);
      return true;
    }
  }

  /**
   * Handles an internal workflow step for EDCS chunk ingestion.
   */
  private async downloadChunkIfMissing(start: number): Promise<boolean> {
    const chunkFile = path.join(
      this.sourceDataDirectory,
      `chunk-${start}.json`,
    );

    try {
      await fs.access(chunkFile);
      this.logger.info("⏭️ Skipping chunk that already exists", undefined, {
        start,
      });
      return true; // continue to next chunk
    } catch {
      // File doesn't exist, proceed with download
    }

    return this.downloadChunkData(start, chunkFile);
  }

  /**
   * Persists generated output for EDCS chunk ingestion.
   */
  private async saveChunkData(
    start: number,
    chunkFile: string,
  ): Promise<boolean> {
    const response = await fetch(
      `${this.sourceHost}?start=${start}&length=${this.batchSize}`,
    );
    if (!response.ok) {
      this.logger.warn(`🌐 Failed fetching records`);
      return true;
    }

    const payload = await response.json();
    const parsedChunkResponse =
      epigraphikDatenbankChunkResponseSchema.safeParse(payload);
    if (!parsedChunkResponse.success) {
      this.logger.warn("🌐 Received an unexpected EDCS payload shape");
      return true;
    }

    const data: EpigraphikDatenbankChunkResponse = parsedChunkResponse.data;

    if (Array.isArray(data.data) && data.data.length === 0) {
      this.logger.info("🛑 Stopping after the last record", undefined, {
        start,
      });
      return false;
    }

    await fs.writeFile(chunkFile, JSON.stringify(data, null, 2), "utf8");

    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
    return true;
  }

  // 🌎 Public Methods

  /** Runs the ingestion of epigraphs by downloading chunks to the filesystem */
  async run(): Promise<void> {
    this.logger.info("📁 Ensuring data directory exists", undefined, {
      sourceDataDirectory: this.sourceDataDirectory,
    });
    await fs.mkdir(this.sourceDataDirectory, { recursive: true });

    this.logger.info(
      "🕷️ Starting Epigraphik-Datenbank Clauss-Slaby JSON ingestion",
    );

    for (let start = 0; start < this.limit; start += this.batchSize) {
      const shouldContinue = await this.downloadChunkIfMissing(start);
      if (!shouldContinue) {
        break;
      }
    }

    this.logger.info("📥 Downloaded chunks");
  }
}
