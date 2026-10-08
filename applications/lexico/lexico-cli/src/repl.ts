import "reflect-metadata";
import { repl } from "@nestjs/core";

import { MainModule } from "./main.module";

/** Starts an interactive NestJS REPL session for the ingestion module — useful for ad-hoc service calls during development. */
async function bootstrap(): Promise<void> {
  await repl(MainModule);
}

void bootstrap();
