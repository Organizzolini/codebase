import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Lexeme } from "@codebase/lexico-entities";
import { LoggerModule } from "@codebase/logging";

import { PrincipalPartsService } from "./principal-parts.service";

/**
 * Owns persistence and parsing logic for Lexeme principal parts.
 */
@Module({
  controllers: [],
  exports: [PrincipalPartsService],
  imports: [TypeOrmModule.forFeature([Lexeme]), LoggerModule],
  providers: [PrincipalPartsService],
})
export class PrincipalPartsModule {}
