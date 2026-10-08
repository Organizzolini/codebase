import { ConfigurationModule } from "@conformetry/configuration";
import { Module } from "@nestjs/common";

import { DifferencesModule } from "../differences/differences.module";

import { FilesService } from "./files.service";

/**
 * Provides file and directory existence checking.
 *
 * Imported by `conformetry-validation`, which runs it before delegating to any
 * language validator — a file that is absent cannot be compared.
 */
@Module({
  controllers: [],
  exports: [FilesService],
  imports: [ConfigurationModule, DifferencesModule],
  providers: [FilesService],
})
export class FilesModule {}
