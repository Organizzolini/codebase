import { fileURLToPath } from "node:url";

import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";

import {
  AdjectivalForm,
  AdjectiveInflection,
  AdverbForm,
  AdverbInflection,
  DatabaseModule,
  FiniteVerbForm,
  GerundForm,
  InfinitiveForm,
  NominalForm,
  NounInflection,
  ParticipleForm,
  PrepositionInflection,
  SupineForm,
  UninflectedInflection,
  VerbInflection,
} from "@codebase/lexico-entities";
import { LoggerModule } from "@codebase/logger";

import { environmentSchema } from "./lexico-api.constants";
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
      autoSchemaFile: fileURLToPath(new URL("schema.gql", import.meta.url)),
      buildSchemaOptions: {
        orphanedTypes: [
          NominalForm,
          FiniteVerbForm,
          ParticipleForm,
          AdverbForm,
          InfinitiveForm,
          GerundForm,
          SupineForm,
          AdjectivalForm,
          NounInflection,
          VerbInflection,
          AdjectiveInflection,
          AdverbInflection,
          PrepositionInflection,
          UninflectedInflection,
        ],
      },
      driver: ApolloDriver,
      playground: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
    }),
    DatabaseModule,
    LoggerModule,
    HealthModule,
    LexemesModule,
    LiteratureModule,
    SearchModule,
    WordsModule,
  ],
})
export class LexicoApiModule {}
