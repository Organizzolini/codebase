import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import {
  Author,
  LexicoDatabaseModule,
  Line,
  Text,
  Token,
  Word,
} from "@codebase/lexico-entities";
import { LoggerModule } from "@codebase/logging";

import { NumeralsModule } from "../numerals/numerals.module";

import { LiteratureLibraryScanService } from "./literature-library-scan.service";
import { LiteratureTextIngestionService } from "./literature-text-ingestion.service";
import { LiteratureWordNormalizationService } from "./literature-word-normalization.service";
import { LiteratureCommand } from "./literature.command";
import { LiteratureService } from "./literature.service";

/**
 * Module for literature ingestion.
 */
@Module({
  controllers: [],
  exports: [LiteratureCommand, LiteratureService],
  imports: [
    LexicoDatabaseModule,
    TypeOrmModule.forFeature([Author, Text, Line, Token, Word]),
    LoggerModule,
    NumeralsModule,
  ],
  providers: [
    LiteratureCommand,
    LiteratureLibraryScanService,
    LiteratureService,
    LiteratureTextIngestionService,
    LiteratureWordNormalizationService,
  ],
})
export class LiteratureModule {}
