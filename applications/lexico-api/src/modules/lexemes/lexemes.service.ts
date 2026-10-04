import { Injectable } from "@nestjs/common";

import {
  In,
  InjectRepository,
  Lexeme,
  type Repository,
} from "@codebase/lexico-entities";

/**
 * Service providing dictionary lexeme lookup queries.
 */
@Injectable()
export class LexemesService {
  // 🏗 Dependency Injection

  public constructor(
    @InjectRepository(Lexeme)
    private readonly lexemeRepository: Repository<Lexeme>,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Finds a single lexeme by its unique identifier, with relations eagerly joined.
   */
  public async findById(id: string): Promise<Lexeme | null> {
    return this.lexemeRepository.findOne({
      relations: {
        forms: true,
        inflection: true,
        principalParts: true,
        pronunciations: true,
        translations: true,
      },
      where: { id },
    });
  }

  /**
   * Finds multiple lexemes by their unique identifiers, with relations eagerly joined.
   */
  public async findByIds(ids: string[]): Promise<Lexeme[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.lexemeRepository.find({
      relations: {
        forms: true,
        inflection: true,
        principalParts: true,
        pronunciations: true,
        translations: true,
      },
      where: { id: In(ids) },
    });
  }
}
