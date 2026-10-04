#!/usr/bin/env node
// The `conformetry-nx-bootstrap` command as the published package runs it: the
// build emits this file as `dist/src/main.js`, which `publishConfig.bin`
// points at. The shebang carries through to that output, and the decorator
// metadata NestJS constructor injection reads is already in it, so it runs
// under a bare `node` with no loader. Inside this workspace `main.mjs` imports
// this source instead, because there the `postinstall` runs before any build.
import { runBootstrapCli } from "./modules/generator/bootstrap.utilities";

void runBootstrapCli(process.cwd());
