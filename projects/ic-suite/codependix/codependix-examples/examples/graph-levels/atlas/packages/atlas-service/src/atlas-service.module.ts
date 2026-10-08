import { Module } from "@nestjs/common";

import { CatalogModule } from "./catalog.module";
import { InventoryModule } from "./inventory.module";

/** The module the rest of the fixture project hangs off. */
@Module({ imports: [CatalogModule, InventoryModule] })
export class AtlasServiceModule {}
