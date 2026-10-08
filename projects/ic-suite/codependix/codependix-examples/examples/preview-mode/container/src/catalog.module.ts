import { Module } from "@nestjs/common";

import { ConnectionModule } from "./connection.module";

/**
 * Imports a connection whose options factory refuses to run.
 *
 * Exploring this project in preview mode registers the provider without ever
 * calling the factory, so the graph is built and the factory never throws. A
 * factory that opened a real database connection would be just as untouched.
 */
@Module({
  imports: [
    ConnectionModule.forRootAsync({
      useFactory: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error(
          "This options factory would have opened a database connection.",
        );
      },
    }),
  ],
})
export class CatalogModule {}
