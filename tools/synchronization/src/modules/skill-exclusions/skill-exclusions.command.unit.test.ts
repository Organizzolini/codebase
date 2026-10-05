import { writeFileSync } from "node:fs";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { expectProcessExitOne, mockProcessExit } from "../../../testing/mocks";
import { SynchronizationService } from "../synchronization/synchronization.service";

import { SkillExclusionsCommand } from "./skill-exclusions.command";
import {
  BLOCK_END_LABEL,
  BLOCK_START_LABEL,
  SKILL_EXCLUSION_FILES,
} from "./skill-exclusions.constants";

import type { SkillExclusionFile } from "./skill-exclusions.types";

const fileContents = new Map<string, string>();

vi.mock("node:fs", () => {
  return {
    readFileSync: vi.fn<(filePath: string) => string>((filePath: string) => {
      const value = fileContents.get(filePath);
      if (value === undefined) {
        throw new Error(`File not found: ${filePath}`);
      }
      return value;
    }),
    writeFileSync: vi.fn<(filePath: string, content: string) => void>(
      (filePath: string, content: string) => {
        fileContents.set(filePath, content);
      },
    ),
  };
});

describe(SkillExclusionsCommand, () => {
  let command: SkillExclusionsCommand;
  let logger: LoggerService;

  const workspaceRoot = process.cwd();
  const lockfile = path.join(workspaceRoot, "skills-lock.json");

  /** Absolute path of one exclusion file, by its repository-relative path. */
  const resolve = (filePath: string): string =>
    path.join(workspaceRoot, filePath);

  /** The markers delimiting one file's block, in that file's comment syntax. */
  const markers = (file: SkillExclusionFile): [string, string] => [
    `${file.commentPrefix} ${BLOCK_START_LABEL}`,
    `${file.commentPrefix} ${BLOCK_END_LABEL}`,
  ];

  /** One exclusion file by path, so a test can name the file it cares about. */
  const fileNamed = (filePath: string): SkillExclusionFile => {
    const file = SKILL_EXCLUSION_FILES.find(
      (candidate) => candidate.filePath === filePath,
    );

    if (file === undefined) {
      throw new Error(`No exclusion file is configured for ${filePath}`);
    }

    return file;
  };

  /** Writes a lockfile declaring exactly these skills. */
  const setLockedSkills = (skillNames: string[]): void => {
    fileContents.set(
      lockfile,
      JSON.stringify({
        skills: Object.fromEntries(
          skillNames.map((name) => [name, { source: "owner/repo" }]),
        ),
      }),
    );
  };

  /** Writes every exclusion file with the block these skills imply. */
  const setSynchronizedFiles = (skillNames: string[]): void => {
    for (const file of SKILL_EXCLUSION_FILES) {
      const [startMarker, endMarker] = markers(file);

      fileContents.set(
        resolve(file.filePath),
        [
          "# hand-written content above",
          startMarker,
          ...skillNames.map((name) => file.renderEntry(name)),
          endMarker,
          "",
        ].join("\n"),
      );
    }
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SkillExclusionsCommand,
        SynchronizationService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(SkillExclusionsCommand);
    logger = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    fileContents.clear();
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        SkillExclusionsCommand,
        SynchronizationService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("SkillExclusionsCommand");
  });

  describe("files", () => {
    // The three ignore files were the original list; cspell and markdownlint
    // joined it when this repository started linting its own skills, and a
    // missing entry here is a vendored skill silently back in scope.
    it("covers every tool whose scan reaches .agents/", () => {
      expect(SKILL_EXCLUSION_FILES.map((file) => file.filePath)).toStrictEqual([
        ".gitattributes",
        "configuration/.codometerignore",
        "configuration/.markdownlint-cli2.jsonc",
        "configuration/.prettierignore",
        "configuration/cspell.config.yaml",
      ]);
      expect(SKILL_EXCLUSION_FILES.map((file) => file.tool)).toStrictEqual([
        "Linguist",
        "codometer",
        "markdownlint",
        "prettier",
        "cspell",
      ]);
    });

    // A `#` marker in JSONC is a syntax error, so the markers cannot be shared.
    it("delimits the JSONC file with // and every other file with #", () => {
      expect(
        fileNamed("configuration/.markdownlint-cli2.jsonc").commentPrefix,
      ).toBe("//");
      expect(
        SKILL_EXCLUSION_FILES.filter(
          (file) => file.filePath !== "configuration/.markdownlint-cli2.jsonc",
        ).map((file) => file.commentPrefix),
      ).toStrictEqual(["#", "#", "#", "#"]);
    });

    // markdownlint reads a JSONC array, so an entry is a quoted element at the
    // array's indentation with the trailing comma the next element needs.
    it("renders a markdownlint entry as an indented JSONC array element", () => {
      expect(
        fileNamed("configuration/.markdownlint-cli2.jsonc").renderEntry("tdd"),
      ).toBe('    ".agents/skills/tdd/**",');
    });

    // cspell reads a YAML sequence, so an entry is a list item at the
    // sequence's indentation, quoted because the glob starts with `*`.
    it("renders a cspell entry as an indented YAML list item", () => {
      expect(
        fileNamed("configuration/cspell.config.yaml").renderEntry("tdd"),
      ).toBe('  - "**/.agents/skills/tdd/**"');
    });
  });

  describe("check", () => {
    it("passes when every file names every locked skill", async () => {
      setLockedSkills(["ask-matt", "tdd"]);
      setSynchronizedFiles(["ask-matt", "tdd"]);

      await expect(command.synchronize("check")).resolves.toBe(true);
    });

    it("fails when a file is missing a locked skill", async () => {
      setLockedSkills(["ask-matt", "tdd"]);
      setSynchronizedFiles(["ask-matt"]);

      await expect(command.synchronize("check")).resolves.toBe(false);
    });

    // A skill removed from the lockfile leaves entries behind, which would keep
    // excluding a directory nothing installs any more.
    it("fails when a file names a skill the lockfile dropped", async () => {
      setLockedSkills(["ask-matt"]);
      setSynchronizedFiles(["ask-matt", "tdd"]);

      await expect(command.synchronize("check")).resolves.toBe(false);
    });

    it("names the stale files so the report is actionable", async () => {
      setLockedSkills(["ask-matt", "tdd"]);
      setSynchronizedFiles(["ask-matt", "tdd"]);
      const stale = SKILL_EXCLUSION_FILES[0];

      expect(stale).toBeDefined();

      if (stale === undefined) return;
      fileContents.set(
        resolve(stale.filePath),
        [...markers(stale), ""].join("\n"),
      );

      await command.synchronize("check");

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining("out-of-sync"),
        undefined,
        expect.objectContaining({ files: [stale.filePath] }),
      );
    });

    // Ordering is what keeps the generated block reviewable, so a correct set in
    // the wrong order is still drift.
    it("fails when the entries are not sorted", async () => {
      setLockedSkills(["ask-matt", "tdd"]);
      setSynchronizedFiles(["tdd", "ask-matt"]);

      await expect(command.synchronize("check")).resolves.toBe(false);
    });

    it("reports failure when a file has no markers", async () => {
      setLockedSkills(["ask-matt"]);
      setSynchronizedFiles(["ask-matt"]);
      const first = SKILL_EXCLUSION_FILES[0];

      expect(first).toBeDefined();

      if (first === undefined) return;
      fileContents.set(resolve(first.filePath), "# no markers here\n");

      await expect(command.synchronize("check")).resolves.toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed synchronizing"),
        expect.any(String),
      );
    });

    // The JSONC file is the one whose markers are not `#`, so a shared marker
    // would silently find nothing there while the other four passed.
    it("fails when the JSONC file carries the wrong comment syntax", async () => {
      setLockedSkills(["tdd"]);
      setSynchronizedFiles(["tdd"]);
      const jsonc = fileNamed("configuration/.markdownlint-cli2.jsonc");

      fileContents.set(
        resolve(jsonc.filePath),
        [
          "# installed-skills-start",
          jsonc.renderEntry("tdd"),
          "# installed-skills-end",
          "",
        ].join("\n"),
      );

      await expect(command.synchronize("check")).resolves.toBe(false);
    });

    it("names the markdownlint file when only its block is stale", async () => {
      setLockedSkills(["ask-matt", "tdd"]);
      setSynchronizedFiles(["ask-matt", "tdd"]);
      const jsonc = fileNamed("configuration/.markdownlint-cli2.jsonc");
      const [startMarker, endMarker] = markers(jsonc);

      fileContents.set(
        resolve(jsonc.filePath),
        [startMarker, jsonc.renderEntry("ask-matt"), endMarker, ""].join("\n"),
      );

      await command.synchronize("check");

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining("out-of-sync"),
        undefined,
        expect.objectContaining({ files: [jsonc.filePath] }),
      );
    });

    it("reports failure when the lockfile is absent", async () => {
      setSynchronizedFiles(["ask-matt"]);

      await expect(command.synchronize("check")).resolves.toBe(false);
    });
  });

  describe("write", () => {
    it("brings every file in step with the lockfile", async () => {
      setLockedSkills(["ask-matt", "tdd"]);
      setSynchronizedFiles([]);

      await expect(command.synchronize("write")).resolves.toBe(true);
      await expect(command.synchronize("check")).resolves.toBe(true);
    });

    it("renders each file in its own syntax", async () => {
      setLockedSkills(["tdd"]);
      setSynchronizedFiles([]);

      await command.synchronize("write");

      for (const file of SKILL_EXCLUSION_FILES) {
        expect(fileContents.get(resolve(file.filePath))).toContain(
          file.renderEntry("tdd"),
        );
      }
    });

    it("sorts the entries whatever order the lockfile lists them in", async () => {
      setLockedSkills(["tdd", "ask-matt", "grilling"]);
      setSynchronizedFiles([]);
      const file = SKILL_EXCLUSION_FILES[0];

      expect(file).toBeDefined();

      if (file === undefined) return;

      await command.synchronize("write");

      const written = fileContents.get(resolve(file.filePath)) ?? "";

      expect(written.indexOf(file.renderEntry("ask-matt"))).toBeLessThan(
        written.indexOf(file.renderEntry("grilling")),
      );
      expect(written.indexOf(file.renderEntry("grilling"))).toBeLessThan(
        written.indexOf(file.renderEntry("tdd")),
      );
    });

    // Everything outside the markers is prose somebody wrote.
    it("leaves the hand-written content around the block untouched", async () => {
      setLockedSkills(["tdd"]);
      setSynchronizedFiles(["ask-matt"]);
      const file = SKILL_EXCLUSION_FILES[0];

      expect(file).toBeDefined();

      if (file === undefined) return;

      await command.synchronize("write");

      expect(fileContents.get(resolve(file.filePath))).toContain(
        "# hand-written content above",
      );
    });

    it("removes an entry the lockfile no longer declares", async () => {
      setLockedSkills(["ask-matt"]);
      setSynchronizedFiles(["ask-matt", "tdd"]);
      const file = SKILL_EXCLUSION_FILES[0];

      expect(file).toBeDefined();

      if (file === undefined) return;

      await command.synchronize("write");

      expect(fileContents.get(resolve(file.filePath))).not.toContain(
        file.renderEntry("tdd"),
      );
    });

    // The closing marker sits inside an indented JSONC array, and losing its
    // indentation on every write would fight the formatter forever.
    it("keeps the closing marker's own indentation", async () => {
      setLockedSkills(["tdd"]);
      setSynchronizedFiles([]);
      const jsonc = fileNamed("configuration/.markdownlint-cli2.jsonc");
      const [startMarker, endMarker] = markers(jsonc);

      fileContents.set(
        resolve(jsonc.filePath),
        [
          '  "ignores": [',
          `    ${startMarker}`,
          `    ${endMarker}`,
          "  ]",
          "",
        ].join("\n"),
      );

      await command.synchronize("write");

      expect(fileContents.get(resolve(jsonc.filePath))).toBe(
        [
          '  "ignores": [',
          `    ${startMarker}`,
          jsonc.renderEntry("tdd"),
          `    ${endMarker}`,
          "  ]",
          "",
        ].join("\n"),
      );
    });

    it("writes every file it reports", async () => {
      setLockedSkills(["tdd"]);
      setSynchronizedFiles([]);

      await command.synchronize("write");

      expect(vi.mocked(writeFileSync)).toHaveBeenCalledTimes(
        SKILL_EXCLUSION_FILES.length,
      );
    });
  });

  describe("run", () => {
    it("exits non-zero when the lists are stale", async () => {
      setLockedSkills(["ask-matt", "tdd"]);
      setSynchronizedFiles(["ask-matt"]);

      await expectProcessExitOne(async () => command.run(["check"]));

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining("out-of-sync"),
        undefined,
        expect.any(Object),
      );
    });

    it("does not exit when the lists are in step", async () => {
      setLockedSkills(["tdd"]);
      setSynchronizedFiles(["tdd"]);
      const exit = mockProcessExit();

      await command.run(["check"]);

      expect(exit).not.toHaveBeenCalled();
    });
  });
});
