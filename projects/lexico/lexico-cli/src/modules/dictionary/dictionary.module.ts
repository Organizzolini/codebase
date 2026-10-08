import { Module } from "@nestjs/common";

import { FormsModule } from "../forms/forms.module";
import { LexemesModule } from "../lexemes/lexemes.module";
import { ManualModule } from "../manual/manual.module";
import { PrincipalPartsModule } from "../principal-parts/principal-parts.module";
import { PronunciationModule } from "../pronunciation/pronunciation.module";
import { TranslationsModule } from "../translations/translations.module";
import { WordsModule } from "../words/words.module";

import { DictionaryCommand } from "./dictionary.command";

/**
 * TODO: Document the dictionary module.
 */
@Module({
  controllers: [],
  exports: [DictionaryCommand],
  imports: [
    FormsModule,
    LexemesModule,
    ManualModule,
    PrincipalPartsModule,
    PronunciationModule,
    TranslationsModule,
    WordsModule,
  ],
  providers: [DictionaryCommand],
})
export class DictionaryModule {}
