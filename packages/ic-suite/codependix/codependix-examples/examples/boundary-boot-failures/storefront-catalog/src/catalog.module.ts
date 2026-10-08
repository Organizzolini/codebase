import { Module } from "@nestjs/common";

/** Deliberately broken: the file throws as it is evaluated, class and all. */
@Module({})
export class CatalogModule {}

throw new Error("The storefront catalog cannot be loaded.");
