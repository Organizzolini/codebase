import { Module } from "@nestjs/common";

import { CorpusScriptorumEcclesiasticorumLatinorumCommand } from "./corpus-scriptorum-ecclesiasticorum-latinorum.command";

/**
 * TODO: Document the corpusScriptorumEcclesiasticorumLatinorum module.
 */
@Module({
  controllers: [],
  exports: [CorpusScriptorumEcclesiasticorumLatinorumCommand],
  imports: [],
  providers: [CorpusScriptorumEcclesiasticorumLatinorumCommand],
})
export class CorpusScriptorumEcclesiasticorumLatinorumModule {}
