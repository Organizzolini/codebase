import { type DynamicModule, Module } from "@nestjs/common";

/** A `forRootAsync`-shaped module, the shape every real data-source module has. */
@Module({})
export class ConnectionModule {
  /** Registers a connection provider built by an asynchronous options factory. */
  static forRootAsync(options: {
    useFactory: () => Promise<string>;
  }): DynamicModule {
    return {
      module: ConnectionModule,
      providers: [{ provide: "CONNECTION", useFactory: options.useFactory }],
    };
  }
}
