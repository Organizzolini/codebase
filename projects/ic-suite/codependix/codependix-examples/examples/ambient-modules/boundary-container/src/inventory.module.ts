import { Module } from "@nestjs/common";

import { SettingsModule } from "./settings.module";

/** One of the four modules whose import pushes `SettingsModule` over the rule. */
@Module({ imports: [SettingsModule] })
export class InventoryModule {}
