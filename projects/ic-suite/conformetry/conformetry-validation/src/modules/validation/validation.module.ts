import { ConfigurationModule } from "@conformetry/configuration";
import {
  FilesModule,
  LanguagesModule,
  ScoringModule,
} from "@conformetry/languages";
import { Module } from "@nestjs/common";

import { RunnerModule } from "../runner/runner.module";

import { ValidationDeduplicationService } from "./validation-deduplication.service";
import { ValidationFindingsService } from "./validation-findings.service";
import { ValidationScoringService } from "./validation-scoring.service";
import { ValidationService } from "./validation.service";

/**
 * Orchestrates a validation run across the languages it resolves.
 *
 * `LanguagesModule` is imported rather than the languages being handed in:
 * every run needs the Fallback, so there was never a run that carried fewer
 * than all of them.
 */
@Module({
  controllers: [],
  exports: [
    ConfigurationModule,
    FilesModule,
    LanguagesModule,
    RunnerModule,
    ScoringModule,
    ValidationDeduplicationService,
    ValidationFindingsService,
    ValidationScoringService,
    ValidationService,
  ],
  imports: [
    ConfigurationModule,
    FilesModule,
    LanguagesModule,
    RunnerModule,
    ScoringModule,
  ],
  providers: [
    ValidationDeduplicationService,
    ValidationFindingsService,
    ValidationScoringService,
    ValidationService,
  ],
})
export class ValidationModule {}
