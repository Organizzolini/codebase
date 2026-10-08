import { Module } from "@nestjs/common";

import {
  TypeOrmModule,
  Word,
  WordForm,
  WordLexeme,
} from "@codebase/lexico-entities";

import { WordFormResolver } from "./word-form.resolver";
import { WordLexemeResolver } from "./word-lexeme.resolver";
import { WordLinkLoader } from "./word-link.loader";
import { WordsResolver } from "./words.resolver";
import { WordsService } from "./words.service";

/**
 * Module exposing surface-word lookups and morphologically-linked dictionary data.
 */
@Module({
  controllers: [],
  exports: [WordsService],
  imports: [TypeOrmModule.forFeature([Word, WordForm, WordLexeme])],
  providers: [
    WordFormResolver,
    WordLexemeResolver,
    WordLinkLoader,
    WordsResolver,
    WordsService,
  ],
})
export class WordsModule {}
