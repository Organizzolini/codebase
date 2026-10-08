import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { In, Line, Text, Token } from "@codebase/lexico-entities";

import { createRepositoryMock } from "../../../testing/mocks";

import { LiteratureRelationsService } from "./literature-relations.service";

import type { Repository } from "typeorm";

describe(LiteratureRelationsService, () => {
  let service: LiteratureRelationsService;
  let textRepository: Repository<Text>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LiteratureRelationsService,
        {
          provide: getRepositoryToken(Line),
          useValue: createRepositoryMock<Line>(),
        },
        {
          provide: getRepositoryToken(Text),
          useValue: createRepositoryMock<Text>(),
        },
        {
          provide: getRepositoryToken(Token),
          useValue: createRepositoryMock<Token>(),
        },
      ],
    }).compile();

    service = await module.resolve(LiteratureRelationsService);
    textRepository = module.get(getRepositoryToken(Text));
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("finds each text's parent in one lookup, reading an unjoined parent as null", async () => {
    expect.hasAssertions();

    const parent = Object.assign(new Text(), { id: "parent", title: "Aeneid" });
    vi.mocked(textRepository.find).mockResolvedValueOnce([
      Object.assign(new Text(), { id: "child", parentText: parent }),
      Object.assign(new Text(), { id: "top", parentText: null }),
      Object.assign(new Text(), { id: "bare" }),
    ]);

    const parents = await service.findParentTexts(["child", "top", "bare"]);

    expect(textRepository.find).toHaveBeenCalledWith({
      relations: { parentText: { author: true } },
      where: { id: In(["child", "top", "bare"]) },
    });
    expect([...parents.entries()]).toStrictEqual([
      ["child", parent],
      ["top", null],
      ["bare", null],
    ]);
  });

  it("asks the database nothing for no texts, lines, or authors", async () => {
    expect.hasAssertions();

    vi.mocked(textRepository.find).mockClear();

    await expect(service.findParentTexts([])).resolves.toStrictEqual(new Map());
    await expect(service.listChildTextsByParent([])).resolves.toStrictEqual(
      new Map(),
    );
    await expect(service.listLinesByText([])).resolves.toStrictEqual(new Map());
    await expect(service.listTextsByAuthor([])).resolves.toStrictEqual(
      new Map(),
    );
    await expect(service.listTokensByLine([])).resolves.toStrictEqual(
      new Map(),
    );
    expect(textRepository.find).not.toHaveBeenCalled();
  });
});
