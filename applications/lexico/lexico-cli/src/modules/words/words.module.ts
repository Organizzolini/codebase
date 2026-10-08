import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Lexeme, Word, WordForm, WordLexeme } from "@codebase/lexico-entities";

import { WordsService } from "./words.service";

/**
 * TODO: Document the words module.
 */
@Module({
  controllers: [],
  exports: [WordsService],
  imports: [TypeOrmModule.forFeature([Lexeme, Word, WordLexeme, WordForm])],
  providers: [WordsService],
})
export class WordsModule {}
