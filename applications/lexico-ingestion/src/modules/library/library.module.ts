import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { LibraryCommand } from "./library.command";
import { LIBRARY_PROVIDERS_TOKEN } from "./library.constants";
import { CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider } from "./providers/corpus-scriptorum-ecclesiasticorum-latinorum-library.provider";
import { EpigraphikDatenbankClaussSlabyLibraryProvider } from "./providers/epigraphik-datenbank-clauss-slaby-library.provider";
import { LatinLibraryBuilder } from "./providers/latin-library.builder";
import { LatinLibraryProvider } from "./providers/latin-library.provider";
import { PerseusLibraryTextExtractionProvider } from "./providers/perseus-library-text-extraction.provider";
import { PerseusLibraryProvider } from "./providers/perseus-library.provider";

import type { LibrarySourceProvider } from "./library.types";

/**
 * Scrape literature from various sources.
 */
@Module({
  controllers: [],
  exports: [LibraryCommand],
  imports: [LoggerModule],
  providers: [
    LibraryCommand,
    CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider,
    EpigraphikDatenbankClaussSlabyLibraryProvider,
    LatinLibraryBuilder,
    LatinLibraryProvider,
    PerseusLibraryProvider,
    PerseusLibraryTextExtractionProvider,
    {
      inject: [
        CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider,
        EpigraphikDatenbankClaussSlabyLibraryProvider,
        LatinLibraryProvider,
        PerseusLibraryProvider,
      ],
      provide: LIBRARY_PROVIDERS_TOKEN,
      useFactory: (
        corpusScriptorumEcclesiasticorumLatinorum: CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider,
        epigraphikDatenbankClaussSlaby: EpigraphikDatenbankClaussSlabyLibraryProvider,
        latinLibrary: LatinLibraryProvider,
        perseus: PerseusLibraryProvider,
      ): LibrarySourceProvider[] => {
        return [
          corpusScriptorumEcclesiasticorumLatinorum,
          epigraphikDatenbankClaussSlaby,
          latinLibrary,
          perseus,
        ];
      },
    },
  ],
})
export class LibraryModule {}
