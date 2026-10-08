// ♟️ Constants

/** Fields copied verbatim from local into cloud. */
export const DEVCONTAINER_SYNCED_KEYS = new Set([
  "$schema",
  "containerUser",
  "customizations",
  "forwardPorts",
  "image",
  "portsAttributes",
  "postAttachCommand",
  "postCreateCommand",
  "remoteEnv",
  "remoteUser",
  "runServices",
  "waitFor",
]);

/** Fields that belong exclusively to cloud config and are never overwritten or checked. */
export const DEVCONTAINER_CLOUD_ONLY_KEYS = new Set(["mounts"]);

/** Keys within remoteEnv that are environment-specific and preserved from cloud config. */
export const DEVCONTAINER_REMOTE_ENVIRONMENT_PRESERVED_KEYS = new Set([
  "CODEBASE_ENVIRONMENT",
]);
