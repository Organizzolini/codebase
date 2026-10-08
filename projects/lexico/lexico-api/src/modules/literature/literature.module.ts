import { Module } from "@nestjs/common";

import {
  Author,
  Line,
  Text,
  Token,
  TypeOrmModule,
  Word,
} from "@codebase/lexico-entities";

import { AuthorsResolver } from "./authors.resolver";
import { LinesResolver } from "./lines.resolver";
import { LiteratureResolver } from "./literature.resolver";
import { LiteratureService } from "./literature.service";
import { TextsResolver } from "./texts.resolver";
import { TokenWordLoader } from "./token-word.loader";
import { TokensResolver } from "./tokens.resolver";

/**
 * Module providing literature browsing, hierarchy, and search endpoints.
 */
@Module({
  controllers: [],
  exports: [LiteratureService, TokenWordLoader],
  imports: [TypeOrmModule.forFeature([Author, Text, Line, Token, Word])],
  providers: [
    AuthorsResolver,
    TextsResolver,
    LinesResolver,
    TokensResolver,
    LiteratureResolver,
    LiteratureService,
    TokenWordLoader,
  ],
})
export class LiteratureModule {}
