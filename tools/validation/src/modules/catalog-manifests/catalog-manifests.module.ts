import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { CatalogManifestsCommand } from "./catalog-manifests.command";
import { CatalogManifestsService } from "./catalog-manifests.service";

/** Provides the catalog-manifests check command. */
@Module({
  controllers: [],
  exports: [CatalogManifestsCommand, CatalogManifestsService],
  imports: [LoggerModule],
  providers: [CatalogManifestsCommand, CatalogManifestsService],
})
export class CatalogManifestsModule {}
