import { Module } from "@nestjs/common";

import {
  Author,
  Line,
  Text,
  Token,
  TypeOrmModule,
} from "@codebase/lexico-entities";

import { AuthorsResolver } from "./authors.resolver";
import { LinesResolver } from "./lines.resolver";
import { LiteratureRelationsLoader } from "./literature-relations.loader";
import { LiteratureRelationsService } from "./literature-relations.service";
import { LiteratureResolver } from "./literature.resolver";
import { LiteratureService } from "./literature.service";
import { TextsResolver } from "./texts.resolver";
import { TokensResolver } from "./tokens.resolver";

/**
 * Module providing literature browsing, hierarchy, and search endpoints.
 */
@Module({
  controllers: [],
  exports: [LiteratureService],
  imports: [TypeOrmModule.forFeature([Author, Text, Line, Token])],
  providers: [
    AuthorsResolver,
    TextsResolver,
    LinesResolver,
    TokensResolver,
    LiteratureResolver,
    LiteratureService,
    LiteratureRelationsService,
    LiteratureRelationsLoader,
  ],
})
export class LiteratureModule {}
