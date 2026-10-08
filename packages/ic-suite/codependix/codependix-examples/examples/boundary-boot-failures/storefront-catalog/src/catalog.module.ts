import { Module } from "@nestjs/common";

/**
 * Deliberately broken: the file throws as it is evaluated, class and all.
 *
 * It stands in for the failure a real workspace meets. There, a circular
 * import between two modules evaluates one before the other has finished, and
 * a decorator reading the half-built class throws the temporal-dead-zone
 * error `Cannot access 'X' before initialization`.
 */
@Module({})
export class CatalogModule {}

throw new Error("The storefront catalog cannot be loaded.");
