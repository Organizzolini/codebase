import { Module } from "@nestjs/common";

import { InventoryModule } from "./inventory.module";

/** Reachable from the root module, so it is part of the container. */
@Module({ imports: [InventoryModule] })
export class CatalogModule {}
