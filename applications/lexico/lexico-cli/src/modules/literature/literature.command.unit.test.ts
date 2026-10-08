import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import {
  resetCommandTestHarness,
  runCommandLine,
} from "../../../testing/command-harness";
import {
  mockStandardInputTerminal,
  setPromptsMockResponse,
} from "../../../testing/mocks";

import { LiteratureCommand } from "./literature.command";
import { LiteratureService } from "./literature.service";

import type { LibraryEntry } from "./literature.types";

const { promptsMock } = vi.hoisted(() => ({
  promptsMock: vi.fn<() => Promise<Record<string, unknown>>>(),
}));

vi.mock("prompts", () => ({
  default: promptsMock,
}));

describe(LiteratureCommand, () => {
  let command: LiteratureCommand;
  let logger: DeepMocked<LoggerService>;

  const library: LibraryEntry[] = [
    {
      authorSlug: "ovid",
      fullPath: "/tmp/ovid/metamorphoses.md",
      pathParts: ["ovid"],
      provider: "perseus",
      textSlug: "metamorphoses",
      title: "Metamorphoses",
    },
    {
      authorSlug: "vergil",
      fullPath: "/tmp/vergil/aeneid.md",
      pathParts: ["vergil"],
      provider: "thelatinlibrary",
      textSlug: "aeneid",
      title: "Aeneid",
    },
    {
      authorSlug: "vergil",
      fullPath: "/tmp/vergil/aeneid-alt.md",
      pathParts: ["vergil"],
      provider: "perseus",
      textSlug: "aeneid",
      title: "Aeneid",
    },
  ];

  const literatureService = {
    ingestAllAuthors: vi.fn<(texts: LibraryEntry[]) => Promise<void>>(),
    scanLibrary: vi.fn<() => Promise<LibraryEntry[]>>(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LiteratureCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: LiteratureService,
          useValue: literatureService,
        },
      ],
    }).compile();

    command = await module.resolve(LiteratureCommand);
    logger = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    resetCommandTestHarness({ unstubGlobals: false });
    setPromptsMockResponse(promptsMock, { provider: "ALL" });
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        LiteratureCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: LiteratureService,
          useValue: createMock<LiteratureService>(),
        },
      ],
    }).compile();

    await module.resolve(LiteratureCommand);
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("LiteratureCommand");
  });

  it("should get text choices filtered by provider only", async () => {
    literatureService.scanLibrary.mockResolvedValue(library);

    const getTextChoices = (
      command as unknown as {
        getTextChoices: (
          provider?: string,
          authorSlug?: string,
        ) => Promise<{ title: string; value: string }[]>;
      }
    ).getTextChoices.bind(command);

    const choices = await getTextChoices("thelatinlibrary", undefined);

    expect(choices).toStrictEqual([
      { title: "vergil/vergil/aeneid", value: "vergil/vergil/aeneid" },
    ]);
  });

  it("should get text choices filtered by author only", async () => {
    literatureService.scanLibrary.mockResolvedValue(library);

    const getTextChoices = (
      command as unknown as {
        getTextChoices: (
          provider?: string,
          authorSlug?: string,
        ) => Promise<{ title: string; value: string }[]>;
      }
    ).getTextChoices.bind(command);

    const choices = await getTextChoices(undefined, "ovid");

    expect(choices).toStrictEqual([
      { title: "ovid/ovid/metamorphoses", value: "ovid/ovid/metamorphoses" },
    ]);
  });

  it("should select texts with only text filter", () => {
    const selectTextsToIngest = (
      command as unknown as {
        selectTextsToIngest: (args: {
          author: string | undefined;
          library: LibraryEntry[];
          provider: string | undefined;
          text: string | undefined;
        }) => LibraryEntry[];
      }
    ).selectTextsToIngest.bind(command);

    const selected = selectTextsToIngest({
      author: undefined,
      library,
      provider: undefined,
      text: "vergil/vergil/aeneid",
    });

    expect(selected).toHaveLength(1);
    expect(selected[0]?.textSlug).toBe("aeneid");
  });

  it("should prioritize known providers when deduplicating texts", () => {
    const deduplicateByProvider = (
      command as unknown as {
        deduplicateByProvider: (texts: LibraryEntry[]) => LibraryEntry[];
      }
    ).deduplicateByProvider.bind(command);

    const result = deduplicateByProvider([
      {
        authorSlug: "vergil",
        fullPath: "/tmp/vergil/aeneid-unknown.md",
        pathParts: ["vergil"],
        provider: "unknown-provider",
        textSlug: "aeneid",
        title: "Aeneid",
      },
      {
        authorSlug: "vergil",
        fullPath: "/tmp/vergil/aeneid-perseus.md",
        pathParts: ["vergil"],
        provider: "perseus",
        textSlug: "aeneid",
        title: "Aeneid",
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.provider).toBe("perseus");
  });

  it("should keep existing known provider when new provider has lower priority", () => {
    const deduplicateByProvider = (
      command as unknown as {
        deduplicateByProvider: (texts: LibraryEntry[]) => LibraryEntry[];
      }
    ).deduplicateByProvider.bind(command);

    const result = deduplicateByProvider([
      {
        authorSlug: "vergil",
        fullPath: "/tmp/vergil/aeneid-perseus.md",
        pathParts: ["vergil"],
        provider: "perseus",
        textSlug: "aeneid",
        title: "Aeneid",
      },
      {
        authorSlug: "vergil",
        fullPath: "/tmp/vergil/aeneid-ttl.md",
        pathParts: ["vergil"],
        provider: "thelatinlibrary",
        textSlug: "aeneid",
        title: "Aeneid",
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.provider).toBe("perseus");
  });

  it("should stop early when library is empty", async () => {
    literatureService.scanLibrary.mockResolvedValue([]);

    await command.run([], {});

    expect(logger.warn).toHaveBeenCalledWith(
      "📚 Missing texts in the data/library directory",
    );
    expect(literatureService.ingestAllAuthors).not.toHaveBeenCalled();
  });

  describe("command line", () => {
    const setStandardInputTerminal = mockStandardInputTerminal();

    beforeEach(() => {
      promptsMock.mockReset();
      literatureService.scanLibrary.mockResolvedValue(library);
      literatureService.ingestAllAuthors.mockResolvedValue(undefined);
      setStandardInputTerminal(false);
    });

    /** Runs `literature` with `flags` exactly as the CLI would. */
    async function runLiterature(...flags: string[]): Promise<void> {
      await runCommandLine({
        argv: ["literature", ...flags],
        providers: [
          LiteratureCommand,
          { provide: LoggerService, useValue: createMock<LoggerService>() },
          { provide: LiteratureService, useValue: literatureService },
        ],
      });
    }

    /** The markdown files of every text handed to ingestion. */
    function ingestedPaths(): string[] {
      return literatureService.ingestAllAuthors.mock.calls.flatMap(([texts]) =>
        texts.map((text) => text.fullPath),
      );
    }

    it("ingests only the text named by --provider, --author and --text without prompting", async () => {
      await runLiterature(
        "--provider=perseus",
        "--author=vergil",
        "--text=vergil/vergil/aeneid",
      );

      expect(ingestedPaths()).toStrictEqual(["/tmp/vergil/aeneid-alt.md"]);
      expect(promptsMock).not.toHaveBeenCalled();
    });

    it("ingests every text without prompting when standard input is not a terminal", async () => {
      await runLiterature();

      expect(ingestedPaths()).toStrictEqual([
        "/tmp/ovid/metamorphoses.md",
        "/tmp/vergil/aeneid-alt.md",
      ]);
      expect(promptsMock).not.toHaveBeenCalled();
    });

    it("prompts for the provider, author and text a terminal run leaves out", async () => {
      setStandardInputTerminal(true);
      promptsMock
        .mockResolvedValueOnce({ choice: "perseus" })
        .mockResolvedValueOnce({ choice: "ovid" })
        .mockResolvedValueOnce({ choice: "ovid/ovid/metamorphoses" });

      await runLiterature();

      expect(promptsMock).toHaveBeenCalledTimes(3);
      expect(ingestedPaths()).toStrictEqual(["/tmp/ovid/metamorphoses.md"]);
    });

    it("rejects an --author missing from the given provider", async () => {
      await expect(
        runLiterature("--provider=thelatinlibrary", "--author=ovid"),
      ).rejects.toThrow('Author "ovid" not found in the dataset.');

      expect(ingestedPaths()).toStrictEqual([]);
    });

    it("rejects a --text missing from the dataset", async () => {
      await expect(runLiterature("--text=missing/text")).rejects.toThrow(
        'Text "missing/text" not found in the dataset.',
      );

      expect(ingestedPaths()).toStrictEqual([]);
    });

    it("fails instead of ingesting when a prompt is cancelled", async () => {
      setStandardInputTerminal(true);
      promptsMock.mockResolvedValueOnce({});

      await expect(runLiterature()).rejects.toThrow(
        "Prompt cancelled: Select the provider",
      );

      expect(ingestedPaths()).toStrictEqual([]);
    });
  });
});
