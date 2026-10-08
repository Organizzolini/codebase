import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Lexeme } from "@codebase/lexico-entities";

import { NumeralsModule } from "../numerals/numerals.module";
import { WordsModule } from "../words/words.module";

import { ManualService } from "./manual.service";

/**
 * Handles ingesting manually-curated dictionary lexemes (hic, ille, omnis, Roman numerals).
 */
@Module({
  controllers: [],
  exports: [ManualService],
  imports: [TypeOrmModule.forFeature([Lexeme]), WordsModule, NumeralsModule],
  providers: [ManualService],
})
export class ManualModule {}
