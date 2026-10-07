import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";

import { LexicoDatabaseModule } from "@codebase/lexico-entities";
import { LoggerModule } from "@codebase/logging";

import { environmentSchema, GRAPHQL_SCHEMA_FILE } from "./lexico-api.constants";
import { ORPHANED_GRAPHQL_TYPES } from "./lexico-api.entities";
import { HealthModule } from "./modules/health/health.module";
import { LexemesModule } from "./modules/lexemes/lexemes.module";
import { LiteratureModule } from "./modules/literature/literature.module";
import { SearchModule } from "./modules/search/search.module";
import { WordsModule } from "./modules/words/words.module";

/**
 * Root NestJS application module for the Lexico GraphQL API.
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
      autoSchemaFile: GRAPHQL_SCHEMA_FILE,
      buildSchemaOptions: {
        orphanedTypes: [...ORPHANED_GRAPHQL_TYPES],
      },
      driver: ApolloDriver,
      playground: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
    }),
    LexicoDatabaseModule,
    LoggerModule,
    HealthModule,
    LexemesModule,
    LiteratureModule,
    SearchModule,
    WordsModule,
  ],
})
export class LexicoApiModule {}
