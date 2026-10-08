import { Injectable } from "@nestjs/common";

import {
  In,
  InjectRepository,
  Line,
  type Repository,
  Text,
  Token,
} from "@codebase/lexico-entities";

import { paginateQueryByParent } from "./literature-relations.utilities";

import type { Connection } from "../../lexico-api.types";
import type { PaginationArguments } from "../search/pagination-arguments.entities";

/**
 * Service resolving the relations beneath many authors, texts, and lines at
 * once — a page of lines' tokens, a list of texts' lines and children, each
 * one's parent — so a nested query costs a fixed number of statements however
 * many rows it fans out to.
 */
@Injectable()
export class LiteratureRelationsService {
  // 🏗 Dependency Injection

  public constructor(
    @InjectRepository(Line)
    private readonly lineRepository: Repository<Line>,
    @InjectRepository(Text)
    private readonly textRepository: Repository<Text>,
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Selects texts with the relations a text connection exposes — the author,
   * and the parent text with its own author — as a lookup by id would load.
   */
  private selectTexts(): ReturnType<Repository<Text>["createQueryBuilder"]> {
    return this.textRepository
      .createQueryBuilder("text")
      .leftJoinAndSelect("text.author", "textAuthor")
      .leftJoinAndSelect("text.parentText", "textParent")
      .leftJoinAndSelect("textParent.author", "textParentAuthor");
  }

  // 🌎 Public Methods

  /**
   * Finds each text's parent text, with that parent's author, in one
   * statement: null for a top-level text, and absent for an unknown one.
   */
  public async findParentTexts(
    textIds: readonly string[],
  ): Promise<Map<string, null | Text>> {
    if (textIds.length === 0) {
      return new Map();
    }

    const texts = await this.textRepository.find({
      relations: { parentText: { author: true } },
      where: { id: In([...textIds]) },
    });
    return new Map(texts.map((text) => [text.id, text.parentText ?? null]));
  }

  /** Pages the child texts of many parent texts at once, in title order. */
  public async listChildTextsByParent(
    parentTextIds: readonly string[],
    pagination?: PaginationArguments,
  ): Promise<Map<string, Connection<Text>>> {
    return paginateQueryByParent(
      {
        alias: "text",
        load: () => this.selectTexts(),
        parentKey: "text.parent_text_id",
        parentOf: (text) => text.parentText?.id,
        repository: this.textRepository,
        sortKey: "text.title",
      },
      parentTextIds,
      pagination,
    );
  }

  /** Pages the lines of many texts at once, in index order. */
  public async listLinesByText(
    textIds: readonly string[],
    pagination?: PaginationArguments,
  ): Promise<Map<string, Connection<Line>>> {
    return paginateQueryByParent(
      {
        alias: "line",
        load: () =>
          this.lineRepository
            .createQueryBuilder("line")
            .leftJoinAndSelect("line.author", "lineAuthor")
            .leftJoinAndSelect("line.text", "lineText")
            .leftJoinAndSelect("lineText.author", "lineTextAuthor"),
        parentKey: "line.text_id",
        parentOf: (line) => line.text.id,
        repository: this.lineRepository,
        sortKey: "line.index",
      },
      textIds,
      pagination,
    );
  }

  /** Pages the texts of many authors at once, in title order. */
  public async listTextsByAuthor(
    authorIds: readonly string[],
    pagination?: PaginationArguments,
  ): Promise<Map<string, Connection<Text>>> {
    return paginateQueryByParent(
      {
        alias: "text",
        load: () => this.selectTexts(),
        parentKey: "text.author_id",
        parentOf: (text) => text.author.id,
        repository: this.textRepository,
        sortKey: "text.title",
      },
      authorIds,
      pagination,
    );
  }

  /**
   * Pages the tokens of many lines at once, in index order, joining each
   * token's dictionary word into the same statement.
   */
  public async listTokensByLine(
    lineIds: readonly string[],
    pagination?: PaginationArguments,
  ): Promise<Map<string, Connection<Token>>> {
    return paginateQueryByParent(
      {
        alias: "token",
        load: () =>
          this.tokenRepository
            .createQueryBuilder("token")
            .leftJoinAndSelect("token.author", "tokenAuthor")
            .leftJoinAndSelect("token.line", "tokenLine")
            .leftJoinAndSelect("tokenLine.text", "tokenLineText")
            .leftJoinAndSelect("tokenLineText.author", "tokenLineTextAuthor")
            .leftJoinAndSelect("token.text", "tokenText")
            .leftJoinAndSelect("tokenText.author", "tokenTextAuthor")
            .leftJoinAndSelect("token.word", "tokenWord"),
        parentKey: "token.line_id",
        parentOf: (token) => token.line.id,
        repository: this.tokenRepository,
        sortKey: "token.index",
      },
      lineIds,
      pagination,
    );
  }
}
