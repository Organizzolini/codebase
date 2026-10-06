import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Lexeme, Word } from "@codebase/lexico-entities";

import { WiktionaryCommand } from "./wiktionary.command";

/**
 * TODO: Document the wiktionary module.
 */
@Module({
  controllers: [],
  exports: [WiktionaryCommand],
  imports: [TypeOrmModule.forFeature([Lexeme, Word])],
  providers: [WiktionaryCommand],
})
export class WiktionaryModule {}
