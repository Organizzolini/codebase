import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { CommentsService } from "./comments.service";
import { CssCommentsService } from "./css-comments.service";
import { HashCommentsService } from "./hash-comments.service";
import { HclCommentsService } from "./hcl-comments.service";
import { LanguageCommentsService } from "./language-comments.service";
import { SqlCommentsService } from "./sql-comments.service";
import { TypescriptCommentsService } from "./typescript-comments.service";
import { YamlCommentsService } from "./yaml-comments.service";

/**
 * NestJS module that provides comment-length measurement.
 *
 * One measuring service and one reader per comment syntax, so a language that
 * marks its comments differently is a new reader here rather than a second
 * definition of what a word is.
 */
@Module({
  controllers: [],
  exports: [
    CommentsService,
    CssCommentsService,
    HashCommentsService,
    HclCommentsService,
    LanguageCommentsService,
    SqlCommentsService,
    TypescriptCommentsService,
    YamlCommentsService,
  ],
  imports: [LoggerModule],
  providers: [
    CommentsService,
    CssCommentsService,
    HashCommentsService,
    HclCommentsService,
    LanguageCommentsService,
    SqlCommentsService,
    TypescriptCommentsService,
    YamlCommentsService,
  ],
})
export class CommentsModule {}
