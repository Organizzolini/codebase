import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { describe, expect, it, vi } from "vitest";

import { Text } from "@codebase/lexico-entities";

import { LiteratureRelationsLoader } from "./literature-relations.loader";
import { LiteratureRelationsService } from "./literature-relations.service";
import { createEmptyConnection } from "./literature.utilities";

/** Resolves a fresh loader over a stubbed relations service. */
async function createLoader(
  service: LiteratureRelationsService,
): Promise<LiteratureRelationsLoader> {
  const module = await Test.createTestingModule({
    providers: [
      LiteratureRelationsLoader,
      { provide: LiteratureRelationsService, useValue: service },
    ],
  }).compile();
  return module.resolve(LiteratureRelationsLoader);
}

describe(LiteratureRelationsLoader, () => {
  it("is defined", async () => {
    await expect(
      createLoader(createMock<LiteratureRelationsService>()),
    ).resolves.toBeDefined();
  });

  it("finds every parent text asked for in the same tick with one lookup", async () => {
    expect.hasAssertions();

    const parent = Object.assign(new Text(), { id: "parent" });
    const findParentTexts = vi
      .fn<LiteratureRelationsService["findParentTexts"]>()
      .mockResolvedValue(new Map([["child", parent]]));
    const loader = await createLoader(
      createMock<LiteratureRelationsService>({ findParentTexts }),
    );

    await expect(
      Promise.all([
        loader.parentTextByText.load("child"),
        loader.parentTextByText.load("unknown"),
      ]),
    ).resolves.toStrictEqual([parent, null]);
    expect(findParentTexts).toHaveBeenCalledExactlyOnceWith([
      "child",
      "unknown",
    ]);
  });

  it("pages each relation through its own batched service call", async () => {
    expect.hasAssertions();

    const empty = new Map([["parent", createEmptyConnection<never>()]]);
    const service = createMock<LiteratureRelationsService>({
      listChildTextsByParent: vi.fn().mockResolvedValue(empty),
      listLinesByText: vi.fn().mockResolvedValue(empty),
      listTextsByAuthor: vi.fn().mockResolvedValue(empty),
      listTokensByLine: vi.fn().mockResolvedValue(empty),
    });
    const loader = await createLoader(service);
    const request = { pagination: { first: 1 }, parentId: "parent" };

    await Promise.all([
      loader.childTextsByParent.load(request),
      loader.linesByText.load(request),
      loader.textsByAuthor.load(request),
      loader.tokensByLine.load(request),
    ]);

    expect(service.listChildTextsByParent).toHaveBeenCalledWith(["parent"], {
      first: 1,
    });
    expect(service.listLinesByText).toHaveBeenCalledWith(["parent"], {
      first: 1,
    });
    expect(service.listTextsByAuthor).toHaveBeenCalledWith(["parent"], {
      first: 1,
    });
    expect(service.listTokensByLine).toHaveBeenCalledWith(["parent"], {
      first: 1,
    });
  });
});
