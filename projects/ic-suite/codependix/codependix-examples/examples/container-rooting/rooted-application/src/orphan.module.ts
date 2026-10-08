import { Module } from "@nestjs/common";

/**
 * Defined but never imported by the root module.
 *
 * A rooted project is explored from `MainModule` outward, so this module is
 * absent from the graph — where a package with no root module would have had
 * it loaded into the synthetic root along with every other module file.
 */
@Module({})
export class OrphanModule {}
