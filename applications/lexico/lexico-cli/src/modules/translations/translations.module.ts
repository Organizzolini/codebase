import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Lexeme, Translation } from "@codebase/lexico-entities";
import { LoggerModule } from "@codebase/logging";

import { TranslationsService } from "./translations.service";

/**
 * Owns Translation persistence and reference resolution for Lexeme entities.
 */
@Module({
  controllers: [],
  exports: [TranslationsService],
  imports: [TypeOrmModule.forFeature([Lexeme, Translation]), LoggerModule],
  providers: [TranslationsService],
})
export class TranslationsModule {}
