import { Module } from "@nestjs/common";

import { DatabaseModule } from "@codebase/lexico-entities";
import { LoggerModule } from "@codebase/logging";

import { ClearModule } from "../clear/clear.module";
import { CorpusScriptorumEcclesiasticorumLatinorumModule } from "../corpus-scriptorum-ecclesiasticorum-latinorum/corpus-scriptorum-ecclesiasticorum-latinorum.module";
import { DictionaryModule } from "../dictionary/dictionary.module";
import { EpigraphikDatenbankClaussSlabyModule } from "../epigraphik-datenbank-clauss-slaby/epigraphik-datenbank-clauss-slaby.module";
import { LatinLibraryModule } from "../latin-library/latin-library.module";
import { LibraryModule } from "../library/library.module";
import { LiteratureModule } from "../literature/literature.module";
import { ManualModule } from "../manual/manual.module";
import { PerseusModule } from "../perseus/perseus.module";
import { WiktionaryModule } from "../wiktionary/wiktionary.module";
import { WordsModule } from "../words/words.module";

import { LexicoIngestionCommand } from "./lexico-ingestion.command";

/**
 * Root application module for lexicoIngestion.
 * Configures database connection, environment validation, and registers all ingestion sub-modules.
 */
@Module({
  controllers: [],
  exports: [LexicoIngestionCommand],
  imports: [
    ClearModule,
    CorpusScriptorumEcclesiasticorumLatinorumModule,
    DictionaryModule,
    EpigraphikDatenbankClaussSlabyModule,
    LatinLibraryModule,
    DatabaseModule,
    LibraryModule,
    LiteratureModule,
    LoggerModule,
    ManualModule,
    PerseusModule,
    WiktionaryModule,
    WordsModule,
  ],
  providers: [LexicoIngestionCommand],
})
export class LexicoIngestionModule {}
