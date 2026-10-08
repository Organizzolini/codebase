import { Module } from "@nestjs/common";

import { CatalogModule } from "./catalog.module";

/** The root module a real application bootstraps, found at `src/main.module.ts`. */
@Module({ imports: [CatalogModule] })
export class MainModule {}
