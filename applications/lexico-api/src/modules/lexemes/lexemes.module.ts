import { Module } from "@nestjs/common";

import { Lexeme, TypeOrmModule } from "@codebase/lexico-entities";

import { LexemesResolver } from "./lexemes.resolver";
import { LexemesService } from "./lexemes.service";

/**
 * Module providing dictionary lexeme lookup services and resolvers.
 */
@Module({
  controllers: [],
  exports: [LexemesService],
  imports: [TypeOrmModule.forFeature([Lexeme])],
  providers: [LexemesResolver, LexemesService],
})
export class LexemesModule {}
