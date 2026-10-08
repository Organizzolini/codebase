import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import {
  Author,
  Lexeme,
  LexicoDatabaseModule,
  Line,
  Text,
  Token,
  Translation,
  Word,
} from "@codebase/lexico-entities";

import { ClearCommand } from "./clear.command";

/**
 * Handles clearing dictionary data from the database.
 */
@Module({
  controllers: [],
  exports: [ClearCommand],
  imports: [
    LexicoDatabaseModule,
    TypeOrmModule.forFeature([
      Lexeme,
      Translation,
      Word,
      Line,
      Text,
      Author,
      Token,
    ]),
  ],
  providers: [ClearCommand],
})
export class ClearModule {}
