import { Injectable } from "@nestjs/common";

import {
  Author,
  In,
  InjectRepository,
  Line,
  type Repository,
  Text,
  Token,
  Word,
} from "@codebase/lexico-entities";

import { createEmptyConnection, paginateQuery } from "./literature.utilities";

import type { Connection } from "../../lexico-api.types";
import type { PaginationArguments } from "../search/pagination-arguments.entities";

/**
 * Service for author, text, line, and token literature resolution.
 */
@Injectable()
export class LiteratureService {
  // 🏗 Dependency Injection

  public constructor(
    @InjectRepository(Author)
    private readonly authorRepository: Repository<Author>,
    @InjectRepository(Line)
    private readonly lineRepository: Repository<Line>,
    @InjectRepository(Text)
    private readonly textRepository: Repository<Text>,
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
    @InjectRepository(Word)
    private readonly wordRepository: Repository<Word>,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Finds an author by id or slug. */
  public async findAuthorByLookup(
    id?: null | string,
    slug?: null | string,
  ): Promise<Author | null> {
    if (id) {
      return this.authorRepository.findOne({
        relations: { texts: true },
        where: { id },
      });
    }
    if (slug) {
      return this.authorRepository.findOne({
        relations: { texts: true },
        where: { slug },
      });
    }
    return null;
  }

  /** Finds a text by id or slug. */
  public async findTextByLookup(
    id?: null | string,
    slug?: null | string,
  ): Promise<null | Text> {
    if (id) {
      return this.textRepository.findOne({
        relations: {
          author: true,
          parentText: true,
        },
        where: { id },
      });
    }
    if (slug) {
      return this.textRepository.findOne({
        relations: {
          author: true,
          parentText: true,
        },
        where: { slug },
      });
    }
    return null;
  }

  /** Loads token rows by ID, preserving their word relation for DataLoader batching. */
  public async findTokensByIds(tokenIds: string[]): Promise<Token[]> {
    if (tokenIds.length === 0) {
      return [];
    }

    return this.tokenRepository.find({
      relations: { word: true },
      where: { id: In(tokenIds) },
    });
  }

  /**
   * Lists authors by name using Relay pagination.
   */
  public async listAuthorsConnection(
    pagination?: PaginationArguments,
  ): Promise<Connection<Author>> {
    return paginateQuery(
      {
        filter: () => this.authorRepository.createQueryBuilder("author"),
        load: async (ids) =>
          this.authorRepository.find({
            relations: { texts: true },
            where: { id: In(ids) },
          }),
        sortKey: "author.name",
      },
      pagination,
    );
  }

  /**
   * Retrieves lines for a text, optionally clipped to index bounds.
   */
  public async listLines(
    textId?: null | string,
    startIndex?: null | number,
    endIndex?: null | number,
  ): Promise<Line[]> {
    if (!textId) {
      return [];
    }

    const query = this.lineRepository
      .createQueryBuilder("line")
      .leftJoinAndSelect("line.author", "author")
      .leftJoinAndSelect("line.text", "text")
      .where("line.text_id = :textId", { textId })
      .orderBy("line.index", "ASC");

    if (typeof startIndex === "number") {
      query.andWhere("line.index >= :startIndex", { startIndex });
    }
    if (typeof endIndex === "number") {
      query.andWhere("line.index <= :endIndex", { endIndex });
    }

    return query.getMany();
  }

  /**
   * Retrieves paginated lines for a text with optional range bounds.
   */
  public async listLinesConnection(
    textId: null | string | undefined,
    range: {
      endIndex?: null | number;
      startIndex?: null | number;
    },
    pagination?: PaginationArguments,
  ): Promise<Connection<Line>> {
    if (!textId) {
      return createEmptyConnection<Line>();
    }

    return paginateQuery(
      {
        filter: () => {
          const query = this.lineRepository
            .createQueryBuilder("line")
            .where("line.text_id = :textId", { textId });
          if (typeof range.startIndex === "number") {
            query.andWhere("line.index >= :startIndex", {
              startIndex: range.startIndex,
            });
          }
          if (typeof range.endIndex === "number") {
            query.andWhere("line.index <= :endIndex", {
              endIndex: range.endIndex,
            });
          }
          return query;
        },
        load: async (ids) =>
          this.lineRepository.find({
            relations: { author: true, text: true },
            where: { id: In(ids) },
          }),
        sortKey: "line.index",
      },
      pagination,
    );
  }

  /**
   * Lists texts by author with optional parent filter.
   */
  public async listTexts(
    authorId?: null | string,
    parentTextId?: null | string,
  ): Promise<Text[]> {
    return this.textRepository.find({
      order: { title: "ASC" },
      relations: {
        author: true,
        parentText: true,
      },
      where: {
        ...(authorId ? { author: { id: authorId } } : {}),
        ...(parentTextId ? { parentText: { id: parentTextId } } : {}),
      },
    });
  }

  /**
   * Lists texts using Relay pagination with the same author and parent text filters.
   */
  public async listTextsConnection(
    authorId?: null | string,
    parentTextId?: null | string,
    pagination?: PaginationArguments,
  ): Promise<Connection<Text>> {
    return paginateQuery(
      {
        filter: () => {
          const query = this.textRepository.createQueryBuilder("text");
          if (authorId) {
            query.andWhere("text.author_id = :authorId", { authorId });
          }
          if (parentTextId) {
            query.andWhere("text.parent_text_id = :parentTextId", {
              parentTextId,
            });
          }
          return query;
        },
        load: async (ids) =>
          this.textRepository.find({
            relations: { author: true, parentText: true },
            where: { id: In(ids) },
          }),
        sortKey: "text.title",
      },
      pagination,
    );
  }

  /**
   * Finds tokens for a line with word relations eager-loaded.
   */
  public async listTokensForLine(lineId: string): Promise<Token[]> {
    return this.tokenRepository.find({
      order: { index: "ASC" },
      relations: { author: true, line: true, text: true, word: true },
      where: { line: { id: lineId } },
    });
  }

  /**
   * Lists tokens for a line with Relay pagination.
   */
  public async listTokensForLineConnection(
    lineId: string,
    pagination?: PaginationArguments,
  ): Promise<Connection<Token>> {
    return paginateQuery(
      {
        filter: () =>
          this.tokenRepository
            .createQueryBuilder("token")
            .where("token.line_id = :lineId", { lineId }),
        load: async (ids) =>
          this.tokenRepository.find({
            relations: { author: true, line: true, text: true, word: true },
            where: { id: In(ids) },
          }),
        sortKey: "token.index",
      },
      pagination,
    );
  }

  /** Returns a word entity by a token's normalized word value. */
  public async resolveTokenWord(token: Token): Promise<null | Word> {
    if (token.isPunctuation || !token.data) {
      return null;
    }

    return this.wordRepository.findOne({
      where: { data: token.data },
    });
  }

  /** Searches authors by name or slug with a simple substring filter. */
  public async searchAuthors(
    query: string,
    pagination?: PaginationArguments,
  ): Promise<Connection<Author>> {
    const clean = query.trim();
    if (clean.length === 0) {
      return createEmptyConnection<Author>();
    }

    return paginateQuery(
      {
        filter: () =>
          this.authorRepository
            .createQueryBuilder("author")
            .where(
              "(LOWER(author.name) LIKE :query OR LOWER(author.slug) LIKE :query)",
              { query: `%${clean.toLowerCase()}%` },
            ),
        load: async (ids) => this.authorRepository.findBy({ id: In(ids) }),
        sortKey: "author.name",
      },
      pagination,
    );
  }

  /** Searches lines by content within a text or globally. */
  public async searchLines(
    query: string,
    textId?: null | string,
    pagination?: PaginationArguments,
  ): Promise<Connection<Line>> {
    const clean = query.trim();
    if (clean.length === 0) {
      return createEmptyConnection<Line>();
    }

    return paginateQuery(
      {
        filter: () => {
          const lines = this.lineRepository
            .createQueryBuilder("line")
            .where("LOWER(line.data) LIKE :query", {
              query: `%${clean.toLowerCase()}%`,
            });
          if (textId) {
            lines.andWhere("line.text_id = :textId", { textId });
          }
          return lines;
        },
        load: async (ids) => this.lineRepository.findBy({ id: In(ids) }),
        sortKey: "line.index",
      },
      pagination,
    );
  }

  /** Aggregates author, text, and line search hits into a single response. */
  public async searchLiterature(
    query: string,
    authorId?: null | string,
  ): Promise<{
    authors: Author[];
    lines: Line[];
    texts: Text[];
  }> {
    const clean = query.trim();
    const authors =
      clean.length === 0
        ? createEmptyConnection<Author>()
        : await this.searchAuthors(clean);
    const texts =
      clean.length === 0
        ? createEmptyConnection<Text>()
        : await this.searchTexts(clean, authorId);
    const lines =
      clean.length === 0
        ? createEmptyConnection<Line>()
        : await this.searchLines(clean);

    return {
      authors: authors.edges.map((edge: { node: Author }) => edge.node),
      lines: lines.edges.map((edge: { node: Line }) => edge.node),
      texts: texts.edges.map((edge: { node: Text }) => edge.node),
    };
  }

  /** Searches texts by title or slug with optional author filter. */
  public async searchTexts(
    query: string,
    authorId?: null | string,
    pagination?: PaginationArguments,
  ): Promise<Connection<Text>> {
    const clean = query.trim();
    if (clean.length === 0) {
      return createEmptyConnection<Text>();
    }

    return paginateQuery(
      {
        filter: () => {
          const texts = this.textRepository
            .createQueryBuilder("text")
            .where(
              "(LOWER(text.title) LIKE :query OR LOWER(text.slug) LIKE :query)",
              { query: `%${clean.toLowerCase()}%` },
            );
          if (authorId) {
            texts.andWhere("text.author_id = :authorId", { authorId });
          }
          return texts;
        },
        load: async (ids) => this.textRepository.findBy({ id: In(ids) }),
        sortKey: "text.title",
      },
      pagination,
    );
  }
}
