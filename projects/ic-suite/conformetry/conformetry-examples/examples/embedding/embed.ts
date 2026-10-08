import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  ConfigurationModule,
  ConfigurationService,
} from "@conformetry/configuration";
import { GenerationModule, GenerationService } from "@conformetry/generation";
import { ReportingModule, ReportingService } from "@conformetry/output";
import { ValidationModule, ValidationService } from "@conformetry/validation";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

// 📦 Module

/**
 * The whole of conformetry a host needs, with no command-line layer above it.
 *
 * `ConfigurationModule` publishes one service, so a host reaches template and
 * instance discovery through `ConfigurationService` rather than naming a
 * collaborator. `ReportingModule` is named separately because rendering sits
 * in the output layer above validation, which cannot reach up to it.
 */
@Module({
  imports: [
    ConfigurationModule,
    GenerationModule,
    ReportingModule,
    ValidationModule,
  ],
})
class EmbeddedConformetryModule {}

// 🌎 Entry point

/**
 * Generates one instance, then measures the committed ones, using nothing but
 * the runtime packages.
 */
async function main(): Promise<void> {
  const workingDirectory = process.cwd();
  const context = await NestFactory.createApplicationContext(
    EmbeddedConformetryModule,
    { abortOnError: false, logger: false },
  );
  const configurationService = context.get(ConfigurationService);
  const configuration = await configurationService.loadConformetryConfiguration(
    "projects/ic-suite/conformetry/conformetry-examples/examples/embedding/conformetry.config.ts",
  );
  const [definition] = configuration;

  if (definition === undefined) {
    throw new Error(
      "The embedding example's configuration declares no generator.",
    );
  }

  const outputDirectoryPath = fs.mkdtempSync(
    path.join(os.tmpdir(), "conformetry-embedding-"),
  );
  const generated = await context.get(GenerationService).runGenerator({
    definition: {
      name: definition.name,
      templateDirectoryPath: definition.templatePath,
    },
    inputs: { name: "reminder" },
    instancePath: outputDirectoryPath,
  });

  process.stdout.write(
    `Generated ${String(generated.generatedFilePaths.length)} file(s) into ${generated.outputDirectoryPath}\n`,
  );

  const result = context.get(ValidationService).validate({
    instances: definition.instances.flatMap((group) =>
      configurationService.findInstances({
        patterns: group.patterns ?? [],
        workingDirectory,
      }),
    ),
    templates: configurationService.collectTemplates({
      configuration,
      workingDirectory,
    }),
  });

  process.stdout.write(
    `${context.get(ReportingService).formatReport({
      fileResults: result.fileResults,
      scores: result.scores,
      workingDirectory,
    })}\n`,
  );
  await context.close();
  fs.rmSync(outputDirectoryPath, { force: true, recursive: true });
  process.exitCode = result.ok ? 0 : 1;
}

await main();
