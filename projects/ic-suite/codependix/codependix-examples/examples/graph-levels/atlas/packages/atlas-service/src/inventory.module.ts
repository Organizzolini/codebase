import { Module } from "@nestjs/common";

/** A leaf module, imported by the root and importing nothing. */
@Module({})
export class InventoryModule {}
