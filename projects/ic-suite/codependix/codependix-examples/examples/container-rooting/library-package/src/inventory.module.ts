import { Module } from "@nestjs/common";

import { SettingsModule } from "./settings.module";

/** One of the modules a synthetic root loads when nothing bootstraps them. */
@Module({ imports: [SettingsModule] })
export class InventoryModule {}
