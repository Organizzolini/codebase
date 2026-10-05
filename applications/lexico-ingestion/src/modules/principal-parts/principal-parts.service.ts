import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as cheerio from "cheerio";
import { Repository } from "typeorm";

import { Lexeme, PrincipalPart } from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logging";

import type { AnyNode } from "domhandler";

/**
 * Parses Wiktionary HTML to extract a lexeme's principal parts and persists
 * them with TypeORM cascade diffing to avoid orphaned records.
 */
@Injectable()
export class PrincipalPartsService {
  // 🏗 Dependency Injection

  constructor(
    @InjectRepository(Lexeme)
    private readonly lexemeRepository: Repository<Lexeme>,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(PrincipalPartsService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Classifies principal part for principal-part parsing.
   */
  private classifyPrincipalPart(args: {
    $: cheerio.CheerioAPI;
    b: AnyNode;
    lexeme: Lexeme;
    principalParts: PrincipalPart[];
  }): void {
    const { $, b, lexeme, principalParts } = args;
    const previous = $(b).prev("i").text();
    if (previous === "or") {
      const lastPrincipalPart = principalParts.pop();
      if (!lastPrincipalPart) return;
      lastPrincipalPart.text = [
        ...lastPrincipalPart.text,
        $(b).text().toLowerCase(),
      ];
      principalParts.push(lastPrincipalPart);
    } else {
      const pp = new PrincipalPart();
      pp.name = previous;
      pp.text = [$(b).text().toLowerCase()];
      pp.lexeme = lexeme;
      principalParts.push(pp);
    }
  }

  // 🌎 Public Methods

  /** Assigns the new principalParts onto the loaded entity
   * so TypeORM diffs against the loaded state and cascade-removes orphaned records. */
  async ingestLexemePrincipalParts(
    savedLexeme: Lexeme,
    principalParts: PrincipalPart[],
  ): Promise<void> {
    // Preserve existing IDs to prevent insert/delete churn and unique constraint violations
    for (const newPp of principalParts) {
      const existing = savedLexeme.principalParts.find(
        (p) => p.name === newPp.name,
      );
      if (existing) newPp.id = existing.id;
    }
    savedLexeme.principalParts = principalParts;

    await this.lexemeRepository.save(savedLexeme);
  }

  /**
   * Parses principal parts from the Wiktionary HTML element context.
   */
  parsePrincipalParts(args: {
    $: cheerio.CheerioAPI;
    elt: AnyNode;
    firstPrincipalPartName: string;
    lexeme: Lexeme;
  }): { macronizedWord: string; principalParts: PrincipalPart[] } {
    const { $, elt, firstPrincipalPartName, lexeme } = args;
    const principalParts: PrincipalPart[] = [];

    const firstPP = new PrincipalPart();
    firstPP.name = firstPrincipalPartName;
    firstPP.text = $(elt)
      .children("strong.Latn.headword")
      .toArray()
      .map((p1: AnyNode) => $(p1).text().toLowerCase());
    firstPP.lexeme = lexeme;
    principalParts.push(firstPP);

    for (const b of $(elt).children("b")) {
      this.classifyPrincipalPart({ $, b, lexeme, principalParts });
    }

    if (principalParts.length === 0) throw new Error("no principal parts");
    const macronizedWord = principalParts[0]?.text[0] ?? "";
    return { macronizedWord, principalParts };
  }
}
