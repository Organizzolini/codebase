import { Module } from "@nestjs/common";

import { AdapterService } from "./adapter.service";

/**
 * Provides the `Tree`-backed adapters generation writes through.
 *
 * Separate from the plugin module so that a host with a different virtual
 * filesystem can supply its own adapters without rewriting the runner.
 */
@Module({
  controllers: [],
  exports: [AdapterService],
  imports: [],
  providers: [AdapterService],
})
export class AdapterModule {}
