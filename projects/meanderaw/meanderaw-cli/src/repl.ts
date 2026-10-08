import "reflect-metadata";
import { repl } from "@nestjs/core";

import { MainModule } from "./main.module";

/** Starts an interactive NestJS REPL for Meanderaw services. */
async function bootstrap(): Promise<void> {
  await repl(MainModule);
}

void bootstrap();
