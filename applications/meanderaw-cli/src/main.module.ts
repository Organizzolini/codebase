import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DiscoveryModule } from "@nestjs/core";

import { LoggerModule } from "@codebase/logger";

import { environmentSchema } from "./constants";
import { ClassificationModule } from "./modules/classification/classification.module";
import { DrawModule } from "./modules/draw/draw.module";
import { DrawingModule } from "./modules/drawing/drawing.module";
import { MatrixModule } from "./modules/matrix/matrix.module";

/**
 * Root NestJS application module.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ".env",
      isGlobal: true,
      validate: (config: Record<string, unknown>) =>
        environmentSchema.parse(config),
    }),
    DiscoveryModule,
    LoggerModule,
    ClassificationModule,
    DrawModule,
    // 🏛️ Registered although `DrawModule` already pulls in the renderer it
    // needs, so that the *other* direction — the parser that reduces a
    // finished document to its ink, the window of it an address names, and
    // the measurement over that same lattice — stays resolvable in
    // `nx run meanderaw-cli:repl`.
    //
    // Nothing in the draw run reads a drawing: a meander is a Code, and every row
    // is built by reading one. That half is kept because the historical
    // extraction is the one thing that still has to go the other way, from the
    // drawings this project started from to the Codes that name them.
    DrawingModule,
    MatrixModule,
  ],
})
export class MainModule {}
