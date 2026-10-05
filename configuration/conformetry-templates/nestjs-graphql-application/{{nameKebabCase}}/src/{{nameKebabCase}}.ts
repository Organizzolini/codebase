import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { createLightship } from "lightship";

import { LoggerService } from "@codebase/logging";

import { environmentSchema } from "./{{nameKebabCase}}.constants";
import { {{namePascalCase}}Module } from "./{{nameKebabCase}}.module";

import type { INestApplication } from "@nestjs/common";

async function bootstrap(): Promise<void> {
  const environment = environmentSchema.parse(process.env);
  const logger = new LoggerService();
  logger.setContext("NestApplication");

  const lightship = await createLightship({
    port: environment.{{nameConstantCase}}_LIGHTSHIP_PORT,
  });

  const app: INestApplication = await NestFactory.create({{namePascalCase}}Module, {
    bufferLogs: true,
    logger,
  });

  lightship.registerShutdownHandler(async () => {
    await app.close();
  });

  await app.listen(environment.{{nameConstantCase}}_PORT);
  lightship.signalReady();

  logger.log(`GraphQL API running on http://localhost:${environment.{{nameConstantCase}}_PORT}/graphql`);
}

void bootstrap();
