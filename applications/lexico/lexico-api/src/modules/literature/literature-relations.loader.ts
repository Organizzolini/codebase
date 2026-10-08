import { Inject, Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";

import { LiteratureRelationsService } from "./literature-relations.service";
import { createConnectionLoader } from "./literature-relations.utilities";
import { LOAD_CHUNK_SIZE } from "./literature.constants";

import type { Line, Text, Token } from "@codebase/lexico-entities";

/**
 * Request-scoped DataLoaders resolving the relations beneath a page of
 * authors, texts, and lines. Every `load` issued in the same tick for the same
 * page arguments shares one batch of statements, and each answer is cached
 * for the rest of the request, so no relation costs a statement per parent.
 */
@Injectable({ scope: Scope.REQUEST })
export class LiteratureRelationsLoader {
  // 🏗 Dependency Injection

  public constructor(
    @Inject(LiteratureRelationsService)
    private readonly literatureRelationsService: LiteratureRelationsService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Pages a text's child texts, in title order. */
  public readonly childTextsByParent = createConnectionLoader<Text>(
    async (parentIds, pagination) =>
      this.literatureRelationsService.listChildTextsByParent(
        parentIds,
        pagination,
      ),
  );

  /** Pages a text's lines, in index order. */
  public readonly linesByText = createConnectionLoader<Line>(
    async (textIds, pagination) =>
      this.literatureRelationsService.listLinesByText(textIds, pagination),
  );

  /** Finds a text's parent text: null for a top-level or unknown text. */
  public readonly parentTextByText = new DataLoader<string, null | Text>(
    async (textIds) => {
      const parents =
        await this.literatureRelationsService.findParentTexts(textIds);
      return textIds.map((textId) => parents.get(textId) ?? null);
    },
    { maxBatchSize: LOAD_CHUNK_SIZE },
  );

  /** Pages an author's texts, in title order. */
  public readonly textsByAuthor = createConnectionLoader<Text>(
    async (authorIds, pagination) =>
      this.literatureRelationsService.listTextsByAuthor(authorIds, pagination),
  );

  /** Pages a line's tokens, in index order, with each token's word. */
  public readonly tokensByLine = createConnectionLoader<Token>(
    async (lineIds, pagination) =>
      this.literatureRelationsService.listTokensByLine(lineIds, pagination),
  );

  // 🔏 Private Methods

  // 🌎 Public Methods
}
