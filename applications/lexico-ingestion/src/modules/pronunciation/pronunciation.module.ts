import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Lexeme } from "@codebase/lexico-entities";
import { LoggerModule } from "@codebase/logging";

import { PronunciationClassicalService } from "./pronunciation-classical.service";
import { PronunciationClassifierService } from "./pronunciation-classifier.service";
import { PronunciationEcclesiasticalService } from "./pronunciation-ecclesiastical.service";
import { PronunciationPhonemesService } from "./pronunciation-phonemes.service";
import { PronunciationService } from "./pronunciation.service";

/**
 * Pronunciation parsing and variant classification module.
 *
 * Manages classification of Latin pronunciation phonemes for both
 * Classical and Ecclesiastical traditions, along with Wiktionary IPA integration.
 */
@Module({
  controllers: [],
  exports: [PronunciationService],
  imports: [TypeOrmModule.forFeature([Lexeme]), LoggerModule],
  providers: [
    PronunciationPhonemesService,
    PronunciationClassicalService,
    PronunciationEcclesiasticalService,
    PronunciationClassifierService,
    PronunciationService,
  ],
})
export class PronunciationModule {}
