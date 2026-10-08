import "reflect-metadata";
import { repl } from "@nestjs/core";

import { MainModule } from "./main.module";

/** Starts the NestJS REPL for interactive development. */
async function bootstrap(): Promise<void> {
  await repl(MainModule);
}

void bootstrap();
