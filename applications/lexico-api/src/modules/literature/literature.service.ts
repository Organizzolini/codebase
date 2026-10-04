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

import {
  createConnection,
  paginateArray,
  toCursor,
} from "../../lexico-api.utilities";

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

  /**
   * Paginates ordered entities into a structured Relay connection.
   */
  private paginateConnection<T extends { id: string }>(
    items: T[],
    pagination?: PaginationArguments,
    getCursor?: (item: T) => string,
  ): Connection<T> {
    const paginated = paginateArray(items, {
      after: pagination?.after,
      before: pagination?.before,
      first: pagination?.first,
      getCursor: getCursor ?? ((item) => toCursor({ id: item.id })),
      last: pagination?.last,
    });

    return createConnection<T>({
      edges: paginated.edges,
      hasNextPage: paginated.hasNextPage,
      hasPreviousPage: paginated.hasPreviousPage,
      totalCount: items.length,
    });
  }

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
   * Lists authors in a stable order.
   */
  public async listAuthors(): Promise<Author[]> {
    return this.authorRepository.find({
      order: { name: "ASC" },
      relations: { texts: true },
    });
  }

  /**
   * Lists authors using Relay pagination.
   */
  public async listAuthorsConnection(
    pagination?: PaginationArguments,
  ): Promise<Connection<Author>> {
    return this.paginateConnection(await this.listAuthors(), pagination);
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
    return this.paginateConnection(
      await this.listLines(textId, range.startIndex, range.endIndex),
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
    return this.paginateConnection(
      await this.listTexts(authorId, parentTextId),
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
    return this.paginateConnection(
      await this.listTokensForLine(lineId),
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
      return createConnection<Author>({
        edges: [],
        hasNextPage: false,
        hasPreviousPage: false,
        totalCount: 0,
      });
    }

    const authors = await this.authorRepository
      .createQueryBuilder("author")
      .where(
        "LOWER(author.name) LIKE :query OR LOWER(author.slug) LIKE :query",
        {
          query: `%${clean.toLowerCase()}%`,
        },
      )
      .orderBy("author.name", "ASC")
      .getMany();

    return this.paginateConnection(authors, pagination);
  }

  /** Searches lines by content within a text or globally. */
  public async searchLines(
    query: string,
    textId?: null | string,
    pagination?: PaginationArguments,
  ): Promise<Connection<Line>> {
    const clean = query.trim();
    if (clean.length === 0) {
      return createConnection<Line>({
        edges: [],
        hasNextPage: false,
        hasPreviousPage: false,
        totalCount: 0,
      });
    }

    const qb = this.lineRepository
      .createQueryBuilder("line")
      .leftJoinAndSelect("line.text", "text")
      .where("LOWER(line.data) LIKE :query", {
        query: `%${clean.toLowerCase()}%`,
      })
      .orderBy("line.index", "ASC");

    if (textId) {
      qb.andWhere("text.id = :textId", { textId });
    }

    return this.paginateConnection(await qb.getMany(), pagination);
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
        ? createConnection<Author>({
            edges: [],
            hasNextPage: false,
            hasPreviousPage: false,
            totalCount: 0,
          })
        : await this.searchAuthors(clean);
    const texts =
      clean.length === 0
        ? createConnection<Text>({
            edges: [],
            hasNextPage: false,
            hasPreviousPage: false,
            totalCount: 0,
          })
        : await this.searchTexts(clean, authorId);
    const lines =
      clean.length === 0
        ? createConnection<Line>({
            edges: [],
            hasNextPage: false,
            hasPreviousPage: false,
            totalCount: 0,
          })
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
      return createConnection<Text>({
        edges: [],
        hasNextPage: false,
        hasPreviousPage: false,
        totalCount: 0,
      });
    }

    const qb = this.textRepository
      .createQueryBuilder("text")
      .leftJoinAndSelect("text.author", "author")
      .where("LOWER(text.title) LIKE :query OR LOWER(text.slug) LIKE :query", {
        query: `%${clean.toLowerCase()}%`,
      })
      .orderBy("text.title", "ASC");

    if (authorId) {
      qb.andWhere("author.id = :authorId", { authorId });
    }

    return this.paginateConnection(await qb.getMany(), pagination);
  }
}
