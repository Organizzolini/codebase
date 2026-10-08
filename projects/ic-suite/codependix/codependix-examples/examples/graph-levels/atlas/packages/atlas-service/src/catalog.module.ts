import { Module } from "@nestjs/common";

import { CatalogService } from "./catalog.service";

/** Owns the catalog service. */
@Module({ exports: [CatalogService], providers: [CatalogService] })
export class CatalogModule {}
