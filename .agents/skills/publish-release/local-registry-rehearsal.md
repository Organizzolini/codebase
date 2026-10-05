# Local Registry Rehearsal

A rehearsal publishes one package to the workspace's Verdaccio registry (the
root `codebase:local-registry` target) and installs it into a project outside
the workspace, proving the tarball a real release would ship actually imports.

Every step keeps the publish **sealed** off npmjs.org. Two things otherwise
send a rehearsal to the real registry:

- Every ic-suite package sets `publishConfig.registry` to npmjs.org, and that
  setting wins over a `--registry` flag.
- The developer's `~/.npmrc` and the `NPM_TOKEN` variable can hold a live
  npmjs.org token.

So the manifest is edited only in a scratch copy, npm and pnpm read only a
scratch configuration holding a placeholder token, and the last step checks
npmjs.org directly. Below, `<scratch>` is any directory outside the workspace,
`<project>` is the package's Nx project name (`codometer-core` for
`@codometer/core`), and `<name>` is its package name.

## Steps

1. **Build the package**: `pnpm exec nx run <project>:build`. Done when
   `dist/src/index.js` and `dist/src/index.d.ts` exist in the package.
2. **Start the registry** in the background, leaving the developer's npm
   configuration alone and storage out of the workspace:

   ```bash
   pnpm exec nx run codebase:local-registry --location none --storage <scratch>/storage
   ```

   Done when `curl -sf http://localhost:4873/-/ping` succeeds; retry it for up
   to a minute while Verdaccio boots. `--storage` overrides the configuration
   file's own storage path. The default `--location user` rewrites `~/.npmrc`
   for as long as the registry runs, and each start clears storage unless
   `--clear false` is passed.

3. **Pack and stage a copy**: in the package, run
   `pnpm pack --pack-destination <scratch>` — pnpm resolves `catalog:` and
   `workspace:` ranges and applies the `publishConfig` paths. Then, from
   `<scratch>`:

   ```bash
   mkdir staged && tar -xzf <tarball>.tgz -C staged && cd staged/package
   node -e "const fs = require('fs'); const p = JSON.parse(fs.readFileSync('package.json'));
     delete p.publishConfig.registry; p.version += '-rehearsal.' + Date.now();
     fs.writeFileSync('package.json', JSON.stringify(p, null, 2));"
   ```

   The suffix keeps every rehearsal publishable — Verdaccio refuses a version
   it already stores — and unmistakable for a real release. Done when `git status` in the workspace is unchanged
   and the staged manifest has no `registry` field.

4. **Seal npm and pnpm**: write `<scratch>/isolated.npmrc` holding only
   `registry=http://localhost:4873/` and
   `//localhost:4873/:_authToken=rehearsal-placeholder` — the configuration
   lets anyone publish, so the placeholder is accepted. Write an empty
   `<scratch>/empty-global.npmrc`, and prefix every remaining npm and pnpm
   command, run from inside `<scratch>`, with:

   ```bash
   env -u NPM_TOKEN -u NODE_AUTH_TOKEN -u NPM_CONFIG_REGISTRY \
     NPM_CONFIG_USERCONFIG=<scratch>/isolated.npmrc \
     NPM_CONFIG_GLOBALCONFIG=<scratch>/empty-global.npmrc
   ```

   Done when both `npm config get registry` and `pnpm config get registry`
   print `http://localhost:4873/`.

5. **Publish** from `<scratch>/staged/package`:
   `npm publish --registry http://localhost:4873/ --tag rehearsal`. Done when
   npm prints `Publishing to http://localhost:4873/`; note the `integrity` line
   it prints.
6. **Consume outside the workspace**: in a fresh `<scratch>/consumer` holding
   `{"private":true,"type":"module"}`, run `npm install <name>@<rehearsal-version>`,
   then `node -e "import('<name>').then(m => console.log(Object.keys(m)))"`.
   Done when every `resolved` URL in `package-lock.json` is on `localhost:4873`
   and the import lists the package's exports. Repeat in `<scratch>/consumer-pnpm`
   with `pnpm add`: an in-workspace check misses duplicate NestJS copies and
   pnpm patch problems. pnpm's lockfile records no URLs, so there the check is
   that the package's `integrity` matches the one printed at publish.
7. **Prove it stayed sealed and clean up**:
   `curl -s https://registry.npmjs.org/<name>` — with a scoped name's `/`
   written `%2f` — lists no `rehearsal` version. Then stop the registry,
   confirm `npm config get registry` prints `https://registry.npmjs.org/`,
   confirm `git status` in the workspace is unchanged (revert `pnpm-lock.yaml`
   if it moved), and delete `<scratch>`.
