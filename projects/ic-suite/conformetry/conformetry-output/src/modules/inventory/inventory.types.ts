// 🏷️ Types

// Deliberately empty. Every shape this module speaks in — `InventoriedInstance`,
// `InventoriedPairing`, `InventoriedTemplate` — is declared in
// `@conformetry/core` and imported from there directly, because discovery
// produces them down in the configuration layer and nothing there may reach
// upward into output to find them. Re-exporting them here would give one
// contract two public import paths and invite a consumer to read a core type
// through this package, which is the coupling the spine exists to prevent.
//
// The file itself stays because `nestjs-service-module` declares a
// `*.types.ts` per module, and it is where a type genuinely local to
// rendering would go.
