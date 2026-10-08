import { Module } from "@nestjs/common";

import { RunnerService } from "./runner.service";

/**
 * Owns the shared envelope for running a language validator.
 *
 * Imported by `conformetry-validation`, the one consumer that drives the
 * Languages. The Languages themselves implement the contract in
 * `runner.types.ts` without importing this module — including the Jupyter
 * Language, which composes its siblings directly rather than through the
 * runner.
 */
@Module({
  controllers: [],
  exports: [RunnerService],
  imports: [],
  providers: [RunnerService],
})
export class RunnerModule {}
