import { Dirent, existsSync, mkdirSync } from "node:fs";
import * as fs from "node:fs/promises";
import path from "node:path";

import { Inject, Injectable } from "@nestjs/common";
import _ from "lodash";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import {
  getOptionText,
  requireChoice,
  selectChoice,
} from "../lexico-ingestion/lexico-ingestion.utilities";

import { LIBRARY_PROVIDERS_TOKEN } from "./library.constants";

import type { CommandOptionChoice } from "../lexico-ingestion/lexico-ingestion.types";
import type {
  LibraryCommandOptions,
  LibrarySourceProvider,
} from "./library.types";

/**
 * Runs configured library source providers and writes normalized markdown files
 * into the local `data/library` tree.
 */
@Command({
  description: "Run the library command",
  name: "library",
})
@Injectable()
export class LibraryCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    @Inject(LIBRARY_PROVIDERS_TOKEN)
    private readonly providers: LibrarySourceProvider[],
  ) {
    super();
    this.logger.setContext(LibraryCommand.name);

    const outputDirectory = path.join(process.cwd(), "output");
    if (!existsSync(outputDirectory))
      mkdirSync(outputDirectory, { recursive: true });
    this.logFilePath = path.join(
      outputDirectory,
      `library-${new Date().toISOString().replaceAll(/[:.]/g, "-")}.log`,
    );
  }

  // 🔐 Private Fields

  private readonly logFilePath: string;

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Builds structured data used during library provider orchestration.
   */
  private buildIngestParameters(
    author: string | undefined,
    providerName: string | undefined,
    text: string | undefined,
  ): {
    filteredProviders: LibrarySourceProvider[];
    ingestOptions: { author?: string; text?: string };
  } {
    const filteredProviders = providerName
      ? this.providers.filter((p) => p.name === providerName)
      : this.providers;
    const ingestOptions: { author?: string; text?: string } = {};
    if (author) ingestOptions.author = author;
    if (text) ingestOptions.text = text;
    return { filteredProviders, ingestOptions };
  }

  /**
   * Resolves derived values needed by library provider orchestration.
   */
  private async getAuthorChoices(
    provider?: string,
  ): Promise<CommandOptionChoice[]> {
    const library = await this.scanLibrary();
    const filtered = provider
      ? library.filter((t) => t.provider === provider)
      : library;
    const authors = [...new Set(filtered.map((t) => t.authorSlug))].toSorted();
    return authors.map((a) => ({ title: a, value: a }));
  }

  /**
   * Resolves derived values needed by library provider orchestration.
   */
  private getProviderChoices(): CommandOptionChoice[] {
    const providers = this.providers.map((p) => p.name).toSorted();
    return providers.map((p) => ({ title: p, value: p }));
  }

  /**
   * Resolves derived values needed by library provider orchestration.
   */
  private async getTextChoices(
    provider?: string,
    authorSlug?: string,
  ): Promise<CommandOptionChoice[]> {
    const library = await this.scanLibrary();
    let filtered = library;
    if (provider) filtered = filtered.filter((t) => t.provider === provider);
    if (authorSlug)
      filtered = filtered.filter((t) => t.authorSlug === authorSlug);

    const textSlugs = [
      ...new Set(
        filtered.map((t) =>
          [t.authorSlug, ...t.pathParts, t.textSlug].join("/"),
        ),
      ),
    ].toSorted();
    return textSlugs.map((t) => ({ title: t, value: t }));
  }

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
   * Resolves the provider, author and text filters. A given provider must be
   * configured; a given author or text is taken as-is, since it may not be
   * downloaded yet. A missing value is asked for on a terminal and otherwise
   * means "All".
   */
  private async parseIngestOptions(options: LibraryCommandOptions): Promise<{
    author: string | undefined;
    providerName: string | undefined;
    text: string | undefined;
  }> {
    const providerChoices = this.getProviderChoices();
    const providerText = getOptionText(options.provider);
    const providerName = providerText
      ? requireChoice(
          providerText,
          providerChoices,
          `Provider "${providerText}" not found.`,
        )
      : await selectChoice({
          choices: providerChoices,
          message: "Select the provider",
          noSelectionTitle: "All",
        });
    const author =
      getOptionText(options.author) ??
      (await selectChoice({
        choices: await this.getAuthorChoices(providerName),
        message: "Select the author",
        noSelectionTitle: "All",
      }));
    const text =
      getOptionText(options.text) ??
      (await selectChoice({
        choices: await this.getTextChoices(providerName, author),
        message: "Select the text",
        noSelectionTitle: "All",
      }));
    return { author, providerName, text };
  }

  /**
   * Processes one workflow step for library provider orchestration.
   */
  private async processProvider(args: {
    current: number;
    ingestOptions: { author?: string; text?: string };
    provider: LibrarySourceProvider;
    total: number;
  }): Promise<void> {
    const { current, ingestOptions, provider, total } = args;
    const providerName = provider.name;
    this.logger.info("🏛️ Starting ingestion for provider", undefined, {
      providerName,
    });
    try {
      await provider.ingest(ingestOptions);

      this.logger.info("🏛️ Completed ingestion for provider", undefined, {
        current,
        percent: Number(((current / total) * 100).toFixed(2)),
        providerName,
        total,
      });
    } catch (error: unknown) {
      const { logLine } = this.logger.buildErrorLogEntry(provider.name, error);
      this.logger.error(
        "🔌 Failed running provider",
        error instanceof Error ? error.stack : undefined,
        { providerName },
      );
      await fs.appendFile(this.logFilePath, logLine);
    }
  }

  /**
   * Handles an internal workflow step for library provider orchestration.
   */
  private pushTextEntry(args: {
    authorSlug: string;
    currentPathParts: string[];
    directory: string;
    entry: Dirent;
    providerName: string;
    texts: {
      authorSlug: string;
      fullPath: string;
      pathParts: string[];
      provider: string;
      textSlug: string;
      title: string;
    }[];
  }): void {
    const {
      authorSlug,
      currentPathParts,
      directory,
      entry,
      providerName,
      texts,
    } = args;
    texts.push({
      authorSlug,
      fullPath: path.join(directory, entry.name),
      pathParts: currentPathParts,
      provider: providerName,
      textSlug: path.basename(entry.name, ".md"),
      title: _.startCase(path.basename(entry.name, ".md")),
    });
  }

  /**
   * Handles an internal workflow step for library provider orchestration.
   */
  private async scanLibrary(): Promise<
    {
      authorSlug: string;
      fullPath: string;
      pathParts: string[];
      provider: string;
      textSlug: string;
      title: string;
    }[]
  > {
    const dataDirectory = path.resolve("data", "library");
    const texts: {
      authorSlug: string;
      fullPath: string;
      pathParts: string[];
      provider: string;
      textSlug: string;
      title: string;
    }[] = [];

    try {
      const providers = await fs.readdir(dataDirectory, {
        withFileTypes: true,
      });
      for (const provider of providers) {
        if (!provider.isDirectory()) continue;
        await this.scanLibraryProvider(dataDirectory, provider.name, texts);
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

  // 🌎 Public Methods

  /**
   * Handles an internal workflow step for library provider orchestration.
   */
  private async scanLibraryAuthor(args: {
    authorSlug: string;
    dataDirectory: string;
    providerName: string;
    texts: {
      authorSlug: string;
      fullPath: string;
      pathParts: string[];
      provider: string;
      textSlug: string;
      title: string;
    }[];
  }): Promise<void> {
    const { authorSlug, dataDirectory, providerName, texts } = args;
    await this.walkLibraryDirectory({
      authorSlug,
      currentPathParts: [],
      directory: path.join(dataDirectory, providerName, authorSlug),
      providerName,
      texts,
    });
  }

  /**
   * Handles an internal workflow step for library provider orchestration.
   */
  private async scanLibraryProvider(
    dataDirectory: string,
    providerName: string,
    texts: {
      authorSlug: string;
      fullPath: string;
      pathParts: string[];
      provider: string;
      textSlug: string;
      title: string;
    }[],
  ): Promise<void> {
    const authors = await fs.readdir(path.join(dataDirectory, providerName), {
      withFileTypes: true,
    });
    for (const author of authors) {
      if (!author.isDirectory()) continue;
      await this.scanLibraryAuthor({
        authorSlug: author.name,
        dataDirectory,
        providerName,
        texts,
      });
    }
  }

  /**
   * Processes one workflow step for library provider orchestration.
   */
  private async walkLibraryDirectory(args: {
    authorSlug: string;
    currentPathParts: string[];
    directory: string;
    providerName: string;
    texts: {
      authorSlug: string;
      fullPath: string;
      pathParts: string[];
      provider: string;
      textSlug: string;
      title: string;
    }[];
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
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        this.pushTextEntry({
          authorSlug,
          currentPathParts,
          directory,
          entry,
          providerName,
          texts,
        });
      }
    }
  }

  /**
   * Passes the `--author` text through to `run`, which takes it as-is since
   * the author may not be downloaded yet.
   */
  @Option({
    description: "The author to ingest (omit to pick one, or all)",
    flags: "-a, --author [author]",
  })
  parseAuthor(author: string): string {
    return author;
  }

  /**
   * Passes the `--provider` text through to `run`, which validates it against
   * the configured providers.
   */
  @Option({
    description: "The provider to ingest from (omit to pick one, or all)",
    flags: "-p, --provider [provider]",
  })
  parseProvider(provider: string): string {
    return provider;
  }

  /**
   * Passes the `--text` text through to `run`, which takes it as-is since the
   * text may not be downloaded yet.
   */
  @Option({
    description: "The specific text to ingest (omit to pick one, or all)",
    flags: "-t, --text [text]",
  })
  parseText(text: string): string {
    return text;
  }

  /**
   * Orchestrates provider execution with optional author/text scoping and progress logging.
   */
  async run(
    _arguments: string[],
    options: LibraryCommandOptions,
  ): Promise<void> {
    this.logger.info("📚 Starting library ingestion");
    this.logger.info("⚙️ Parsed command options", undefined, { options });
    const startTime = performance.now();

    const dataPath = path.resolve("data", "library");
    await fs.mkdir(dataPath, { recursive: true });

    const { author, providerName, text } =
      await this.parseIngestOptions(options);

    const { filteredProviders, ingestOptions } = this.buildIngestParameters(
      author,
      providerName,
      text,
    );
    const total = filteredProviders.length;

    for (let current = 0; current < total; current++) {
      const provider = filteredProviders[current];
      if (provider) {
        await this.processProvider({
          current: current + 1,
          ingestOptions,
          provider,
          total,
        });
      }
    }

    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    this.logger.info("📚 Ingested library", undefined, {
      durationSeconds: duration,
    });
  }
}
