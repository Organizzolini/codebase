import { Module } from "@nestjs/common";

import {
  Lexeme,
  Translation,
  TypeOrmModule,
  Word,
  WordForm,
  WordLexeme,
} from "@codebase/lexico-entities";

import { SearchResolver } from "./search.resolver";
import { SearchService } from "./search.service";

/**
 * Search module providing dictionary search services and GraphQL resolvers.
 */
@Module({
  controllers: [],
  exports: [SearchService],
  imports: [
    TypeOrmModule.forFeature([Lexeme, Word, Translation, WordLexeme, WordForm]),
  ],
  providers: [SearchResolver, SearchService],
})
export class SearchModule {}
