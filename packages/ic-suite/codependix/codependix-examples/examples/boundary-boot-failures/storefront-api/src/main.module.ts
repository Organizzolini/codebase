import { Module } from "@nestjs/common";

import { CatalogModule } from "../../storefront-catalog/src/catalog.module";

/**
 * The root module a real application bootstraps.
 *
 * It is this project's container that cannot boot, and it cannot boot because
 * of a class that lives in another project: `storefront-catalog`.
 */
@Module({ imports: [CatalogModule] })
export class MainModule {}
