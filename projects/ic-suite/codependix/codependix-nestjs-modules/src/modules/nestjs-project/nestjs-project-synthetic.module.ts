import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import type { DynamicModule, Type } from "@nestjs/common";

/**
 * Root module for a package that bootstraps nothing of its own.
 *
 * A library package has no `MainModule` to explore from, so this stands in as
 * one and imports every module the package defines. The global `ConfigModule`
 * comes with it because a package whose module reads configuration in a
 * `useFactory` cannot be scanned without one.
 */
@Module({})
export class SyntheticRootModule {
  /** Roots a graph in the given modules. */
  static forModules(moduleClasses: Type<unknown>[]): DynamicModule {
    return {
      imports: [
        ConfigModule.forRoot({ ignoreEnvFile: true, isGlobal: true }),
        ...moduleClasses,
      ],
      module: SyntheticRootModule,
    };
  }
}
