import { fileURLToPath } from "node:url";

import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";

import { LoggerModule } from "@codebase/logger";

import { environmentSchema } from "./{{nameKebabCase}}.constants";

/**
 * Root NestJS application module for the {{namePascalCase}} GraphQL API.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ".env",
      isGlobal: true,
      validate: (config: Record<string, unknown>) =>
        environmentSchema.parse(config),
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      autoSchemaFile: fileURLToPath(new URL("schema.gql", import.meta.url)),
      driver: ApolloDriver,
      playground: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
    }),
    LoggerModule,
  ],
})
export class {{namePascalCase}}Module {}
