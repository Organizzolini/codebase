import { Module } from "@nestjs/common";

import { ClassificationService } from "./classification.service";

/**
 * Wires up single-family meander classification.
 */
@Module({
  controllers: [],
  exports: [ClassificationService],
  imports: [],
  providers: [ClassificationService],
})
export class ClassificationModule {}
