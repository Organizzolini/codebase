import { Module } from "@nestjs/common";

import { CommentsModule } from "../comments/comments.module";

import { DeclarationCommentsService } from "./declaration-comments.service";
import { TypescriptService } from "./typescript.service";

/**
 * NestJS module that provides TypeScript and JavaScript code analysis.
 */
@Module({
  controllers: [],
  exports: [TypescriptService],
  imports: [CommentsModule],
  providers: [DeclarationCommentsService, TypescriptService],
})
export class TypescriptModule {}
