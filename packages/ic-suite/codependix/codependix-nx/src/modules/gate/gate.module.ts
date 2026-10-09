import { Module } from "@nestjs/common";

import { PluginModule } from "../plugin/plugin.module";

import { GateService } from "./gate.service";

/** Provides the run behind the gate executor. */
@Module({
  controllers: [],
  exports: [GateService],
  imports: [PluginModule],
  providers: [GateService],
})
export class GateModule {}
