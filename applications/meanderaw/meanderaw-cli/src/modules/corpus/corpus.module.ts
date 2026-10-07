import { Module } from "@nestjs/common";

import { CharacteristicsModule } from "../characteristics/characteristics.module";
import { CodeModule } from "../code/code.module";
import { DatabaseModule } from "../database/database.module";
import { EnumerationModule } from "../enumeration/enumeration.module";

import { CorpusService } from "./corpus.service";

/**
 * Registers `CorpusService`: the generic decoder and Characteristic
 * computation every Code is read through, plus the meander database it
 * persists a row to — the same modules `DrawCodeService`
 * reaches for a `--code` drawing, since ingesting the historical corpus is
 * the same "decode, measure, persist" pipeline
 * run over extracted constants instead of one command-line Code — plus the
 * enumeration, which decides which entries are beyond the draw run's reach and
 * so have to be preserved at all.
 */
@Module({
  controllers: [],
  exports: [CorpusService],
  imports: [
    CharacteristicsModule,
    CodeModule,
    DatabaseModule,
    EnumerationModule,
  ],
  providers: [CorpusService],
})
export class CorpusModule {}
