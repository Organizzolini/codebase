import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Lexeme } from "@codebase/lexico-entities";

import { EtymologyModule } from "../etymology/etymology.module";
import { FormsModule } from "../forms/forms.module";
import { PartOfSpeechModule } from "../part-of-speech/part-of-speech.module";
import { PrincipalPartsModule } from "../principal-parts/principal-parts.module";
import { PronunciationModule } from "../pronunciation/pronunciation.module";
import { TranslationsModule } from "../translations/translations.module";
import { WordsModule } from "../words/words.module";

import { LexemesService } from "./lexemes.service";

/**
 * Wires POS detection, pronunciation parsing, and full Wiktionary entry
 * orchestration into a single injectable module.
 */
@Module({
  controllers: [],
  exports: [LexemesService],
  imports: [
    TypeOrmModule.forFeature([Lexeme]),
    EtymologyModule,
    FormsModule,
    PartOfSpeechModule,
    PrincipalPartsModule,
    PronunciationModule,
    TranslationsModule,
    WordsModule,
  ],
  providers: [LexemesService],
})
export class LexemesModule {}
