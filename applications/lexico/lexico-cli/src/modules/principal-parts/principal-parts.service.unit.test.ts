import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import * as cheerio from "cheerio";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Lexeme, PrincipalPart } from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logging";

import { createRepositoryMock } from "../../../testing/mocks";

import { PrincipalPartsService } from "./principal-parts.service";

import type { AnyNode } from "domhandler";
import type { Repository } from "typeorm";

function getElementByIdentifierOrThrow(
  $: cheerio.CheerioAPI,
  identifier: string,
): AnyNode {
  const element = $(identifier).get(0);
  if (element) {
    return element;
  }

  throw new Error(`Expected element ${identifier} to exist in test markup`);
}

describe(PrincipalPartsService, () => {
  let service: PrincipalPartsService;
  let lexemeRepository: DeepMocked<Repository<Lexeme>>;
  let logger: DeepMocked<LoggerService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PrincipalPartsService,
        {
          provide: getRepositoryToken(Lexeme),
          useValue: createRepositoryMock<Lexeme>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    service = await module.resolve(PrincipalPartsService);
    logger = await module.resolve(LoggerService);
    lexemeRepository = module.get(getRepositoryToken(Lexeme));
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("sets logger context during service construction", () => {
    const initializedService = new PrincipalPartsService(
      lexemeRepository,
      logger,
    );

    expect(initializedService).toBeDefined();
    expect(logger.setContext).toHaveBeenCalledWith(PrincipalPartsService.name);
  });

  describe("ingestLexemePrincipalParts", () => {
    it("preserves existing IDs for matching principal part names", async () => {
      const savedLexeme = new Lexeme();
      const existingPresent = new PrincipalPart();
      existingPresent.id = "existing-present-id";
      existingPresent.name = "present";
      existingPresent.text = ["write"];
      savedLexeme.principalParts = [existingPresent];

      const incomingPresent = new PrincipalPart();
      incomingPresent.name = "present";
      incomingPresent.text = ["writing"];
      const incomingPerfect = new PrincipalPart();
      incomingPerfect.name = "perfect";
      incomingPerfect.text = ["wrote"];

      await service.ingestLexemePrincipalParts(savedLexeme, [
        incomingPresent,
        incomingPerfect,
      ]);

      expect(incomingPresent.id).toBe("existing-present-id");
      expect(incomingPerfect.id).toBeUndefined();
      expect(savedLexeme.principalParts).toStrictEqual([
        incomingPresent,
        incomingPerfect,
      ]);
      expect(lexemeRepository.save).toHaveBeenCalledWith(savedLexeme);
    });

    it("keeps incoming IDs undefined when no existing principal part matches", async () => {
      const savedLexeme = new Lexeme();
      const existingPresent = new PrincipalPart();
      existingPresent.id = "existing-present-id";
      existingPresent.name = "present";
      existingPresent.text = ["write"];
      savedLexeme.principalParts = [existingPresent];

      const incomingPerfect = new PrincipalPart();
      incomingPerfect.name = "perfect";
      incomingPerfect.text = ["wrote"];

      await service.ingestLexemePrincipalParts(savedLexeme, [incomingPerfect]);

      expect(incomingPerfect.id).toBeUndefined();
      expect(savedLexeme.principalParts).toStrictEqual([incomingPerfect]);
      expect(lexemeRepository.save).toHaveBeenCalledWith(savedLexeme);
    });
  });

  describe("parsePrincipalParts", () => {
    it("extracts first principal part from headword and classifies remaining parts", () => {
      const $ = cheerio.load(`
        <p id="entry">
          <strong class="Latn headword">Write</strong>
          <i>infinitive</i><b>Writing</b>
          <i>perfect</i><b>Written</b>
        </p>
      `);
      const element = getElementByIdentifierOrThrow($, "#entry");

      const result = service.parsePrincipalParts({
        $,
        elt: element,
        firstPrincipalPartName: "present",
        lexeme: new Lexeme(),
      });

      expect(result.macronizedWord).toBe("write");
      expect(result.principalParts).toHaveLength(3);
      expect(result.principalParts[0]?.name).toBe("present");
      expect(result.principalParts[0]?.text).toStrictEqual(["write"]);
      expect(result.principalParts[1]?.name).toBe("infinitive");
      expect(result.principalParts[1]?.text).toStrictEqual(["writing"]);
      expect(result.principalParts[2]?.name).toBe("perfect");
      expect(result.principalParts[2]?.text).toStrictEqual(["written"]);
    });

    it("merges alternate forms when previous label is 'or'", () => {
      const $ = cheerio.load(`
        <p id="entry">
          <strong class="Latn headword">Write</strong>
          <i>perfect</i><b>Written</b>
          <i>or</i><b>Wrote</b>
        </p>
      `);
      const element = getElementByIdentifierOrThrow($, "#entry");

      const result = service.parsePrincipalParts({
        $,
        elt: element,
        firstPrincipalPartName: "present",
        lexeme: new Lexeme(),
      });

      expect(result.principalParts).toHaveLength(2);
      expect(result.principalParts[1]?.name).toBe("perfect");
      expect(result.principalParts[1]?.text).toStrictEqual([
        "written",
        "wrote",
      ]);
    });

    it("ignores 'or' when there is no previous principal part to merge", () => {
      const $ = cheerio.load(`
        <p id="entry">
          <i>or</i><b>Wrote</b>
        </p>
      `);
      const element = getElementByIdentifierOrThrow($, "#entry");

      const result = service.parsePrincipalParts({
        $,
        elt: element,
        firstPrincipalPartName: "present",
        lexeme: new Lexeme(),
      });

      expect(result.principalParts).toHaveLength(1);
      expect(result.principalParts[0]?.name).toBe("present");
      expect(result.principalParts[0]?.text).toStrictEqual(["wrote"]);
      expect(result.macronizedWord).toBe("wrote");
    });

    it("returns empty macronized word when no headword is present", () => {
      const $ = cheerio.load(`
        <p id="entry">
          <i>perfect</i><b>Written</b>
        </p>
      `);
      const element = getElementByIdentifierOrThrow($, "#entry");

      const result = service.parsePrincipalParts({
        $,
        elt: element,
        firstPrincipalPartName: "present",
        lexeme: new Lexeme(),
      });

      expect(result.principalParts[0]?.name).toBe("present");
      expect(result.principalParts[0]?.text).toStrictEqual([]);
      expect(result.macronizedWord).toBe("");
    });

    it("throws when principal parts list is emptied during classification", () => {
      const $ = cheerio.load(`
        <p id="entry">
          <strong class="Latn headword">Write</strong>
          <i>perfect</i><b>Written</b>
        </p>
      `);
      const element = getElementByIdentifierOrThrow($, "#entry");

      const classifySpy = vi.spyOn(
        service as unknown as {
          classifyPrincipalPart: (args: {
            $: cheerio.CheerioAPI;
            b: AnyNode;
            lexeme: Lexeme;
            principalParts: PrincipalPart[];
          }) => void;
        },
        "classifyPrincipalPart",
      );

      classifySpy.mockImplementation(({ principalParts }) => {
        principalParts.length = 0;
      });

      expect(() =>
        service.parsePrincipalParts({
          $,
          elt: element,
          firstPrincipalPartName: "present",
          lexeme: new Lexeme(),
        }),
      ).toThrow("no principal parts");
    });
  });
});
