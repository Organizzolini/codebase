import { Module } from "@nestjs/common";

/**
 * Fixture root module for `NestjsProjectService` unit tests.
 *
 * `exploreProject` dynamically imports whatever `rootModuleFile` a project
 * reports, so a test exercising the success path needs a real file on disk
 * exporting a real `MainModule` class rather than a mock — this package holds
 * no `src/main.module.ts` of its own, being a library rather than a CLI.
 */
@Module({})
export class MainModule {}
