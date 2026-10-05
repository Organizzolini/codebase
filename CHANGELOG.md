# Changelog

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [2.33.2](https://github.com/organizzolini/codebase/compare/v2.33.1...v2.33.2) (2026-10-05)

### ♻️ Code Refactoring

* **meanderaw:** ♻️ rename meanderaw to meanderaw-cli under an applications/meanderaw group ([#1302](https://github.com/organizzolini/codebase/issues/1302)) ([52d2bc3](https://github.com/organizzolini/codebase/commit/52d2bc3ae7dd82b65c85696bb53b1d4fe8c3233c)), closes [#1259](https://github.com/organizzolini/codebase/issues/1259)

## [2.33.1](https://github.com/organizzolini/codebase/compare/v2.33.0...v2.33.1) (2026-10-05)

### 📝 Documentation

* **ic-suite:** 📝 add an npm badge for every published ic-suite package ([#1298](https://github.com/organizzolini/codebase/issues/1298)) ([46bd103](https://github.com/organizzolini/codebase/commit/46bd103566aa3366d45646bfd33b96a5301b7340))

### ♻️ Code Refactoring

* **caelundas,configuration:** 🚚 nest caelundas under a domain folder as caelundas-cli ([#1304](https://github.com/organizzolini/codebase/issues/1304)) ([a465a2d](https://github.com/organizzolini/codebase/commit/a465a2d589d8fac7b0e9e87726f8dd6f4b168b51))

## [2.33.0](https://github.com/organizzolini/codebase/compare/v2.32.0...v2.33.0) (2026-10-05)

### ✨ Features

* **lexico,configuration:** ✨ close lexico-api search gaps and add cors and search logging ([#1297](https://github.com/organizzolini/codebase/issues/1297)) ([af139b9](https://github.com/organizzolini/codebase/commit/af139b9698337f4217f4958a4d449eaa9aa79386)), closes [Organizzolini/codebase#1259](https://github.com/Organizzolini/codebase/issues/1259) [Organizzolini/codebase#1170](https://github.com/Organizzolini/codebase/issues/1170)
* **meanderaw,configuration:** ✨ draw at a 24-edge budget across worker threads and stop committing the html pages ([#1259](https://github.com/organizzolini/codebase/issues/1259)) ([9d9196a](https://github.com/organizzolini/codebase/commit/9d9196a4155772a83d97da21e782781212d73e71)), closes [#1260](https://github.com/organizzolini/codebase/issues/1260) [#1168](https://github.com/organizzolini/codebase/issues/1168) [#1260](https://github.com/organizzolini/codebase/issues/1260) [#1248](https://github.com/organizzolini/codebase/issues/1248)

### 🐛 Bug Fixes

* **codependix:** 🐛 make the published codependix packages releasable at 0.0.1 ([#1290](https://github.com/organizzolini/codebase/issues/1290)) ([b8d920b](https://github.com/organizzolini/codebase/commit/b8d920b95a6b6bed25e14a0df1d2eb352d0cf25a)), closes [#1168](https://github.com/organizzolini/codebase/issues/1168) [#1168](https://github.com/organizzolini/codebase/issues/1168)
* **configuration:** 🐛 anchor the claude worktree ignores to the workspace root ([#1299](https://github.com/organizzolini/codebase/issues/1299)) ([23220b5](https://github.com/organizzolini/codebase/commit/23220b53a657d1234eee5058736415217e6f7447))

### 📦 Build System

* **configuration:** 📦️ add file extensions to shared vite config imports ([#1296](https://github.com/organizzolini/codebase/issues/1296)) ([8b4c1e1](https://github.com/organizzolini/codebase/commit/8b4c1e12b3d80f3325868d0f57fac8d3fc832ff3))
* **synchronization,ic-suite:** 📦️ spell the repository owner in lowercase so npm accepts provenance ([#1300](https://github.com/organizzolini/codebase/issues/1300)) ([92b73f0](https://github.com/organizzolini/codebase/commit/92b73f0c7ebe6d4499baf66cd8f9b6e48e16d9b8))

## [2.32.0](https://github.com/Organizzolini/codebase/compare/v2.31.0...v2.32.0) (2026-10-04)

### ✨ Features

* **meanderaw,infrastructure:** ✨ store meanders in postgres instead of a committed sqlite file ([#1260](https://github.com/Organizzolini/codebase/issues/1260)) ([17c24a6](https://github.com/Organizzolini/codebase/commit/17c24a60b6186ac62ba8fe44d4829f1101f0b798))

### 📝 Documentation

* **documentation:** 📝 add badges for the tools the readme was missing ([#1262](https://github.com/Organizzolini/codebase/issues/1262)) ([dd69376](https://github.com/Organizzolini/codebase/commit/dd69376efad186d05096f1376aece9bf518350f8))

## [2.31.0](https://github.com/Organizzolini/codebase/compare/v2.30.2...v2.31.0) (2026-10-04)

### ✨ Features

* **conformetry,lexico:** ✨ add resolver file template, require all tags, and conform lexico-api modules ([#1234](https://github.com/Organizzolini/codebase/issues/1234)) ([513b440](https://github.com/Organizzolini/codebase/commit/513b44089955acdeadda607757bc947b85bca964))

### 🐛 Bug Fixes

* **conformetry,lexico:** 🐛 emit the lexico-api graphql schema beside its root module ([#1241](https://github.com/Organizzolini/codebase/issues/1241)) ([3e743d3](https://github.com/Organizzolini/codebase/commit/3e743d31f6f83d43e0a3dba36496b994c0a03a9d))
* **conformetry:** 🐛 publish a built conformetry-nx-bootstrap-generators command ([#1245](https://github.com/Organizzolini/codebase/issues/1245)) ([7677716](https://github.com/Organizzolini/codebase/commit/767771666463147d90e05bba085c23479e958d36))
* **dependencies,validation:** 🐛 accept nestjs 11 in the published ic-suite packages ([#1244](https://github.com/Organizzolini/codebase/issues/1244)) ([abc135a](https://github.com/Organizzolini/codebase/commit/abc135a6f661dc65a6f0ce6319d8ecc42c0ab283))
* **lexico:** 🐛 resolve the graphql schema path from the module, not the working directory ([#1246](https://github.com/Organizzolini/codebase/issues/1246)) ([a9e57a1](https://github.com/Organizzolini/codebase/commit/a9e57a1c9fc963771cb92dd4a8bbb575f0efa6c8))

### ⚡ Performance Improvements

* **configuration,documentation:** ⚡️ cache the root checks and hash only the packages each task runs ([#1250](https://github.com/Organizzolini/codebase/issues/1250)) ([e4b2d6b](https://github.com/Organizzolini/codebase/commit/e4b2d6b9987382a20bd53bf4c95f2124311fac6b)), closes [#381](https://github.com/Organizzolini/codebase/issues/381) [#381](https://github.com/Organizzolini/codebase/issues/381)

### ♻️ Code Refactoring

* **meanderaw:** ♻️ fold characteristics into one json map and drop the drift check ([#1248](https://github.com/Organizzolini/codebase/issues/1248)) ([a10f00a](https://github.com/Organizzolini/codebase/commit/a10f00a4d201e1914c7629cbb2f4d139ba184fcf))
* **synchronization,documentation:** ♻️ replace the readme title version with a release badge ([#1249](https://github.com/Organizzolini/codebase/issues/1249)) ([8883439](https://github.com/Organizzolini/codebase/commit/8883439f547c3c67d49abfc5f39de40dbf47ad48))

### 📦 Build System

* **configuration,deployments,scripts:** 📦️ gate the workspace shell scripts with shellcheck ([#1235](https://github.com/Organizzolini/codebase/issues/1235)) ([c43278b](https://github.com/Organizzolini/codebase/commit/c43278b540213cf756f39922e64c73c264dedc13))

## [2.30.2](https://github.com/Organizzolini/codebase/compare/v2.30.1...v2.30.2) (2026-09-30)

### 🐛 Bug Fixes

* **lexico-ingestion:** 🐛 honor command options and fail loudly ([#1232](https://github.com/Organizzolini/codebase/issues/1232)) ([db88c9e](https://github.com/Organizzolini/codebase/commit/db88c9e310a925bfcd646041984ef0f6e394140b))
* **lexico:** 🐛 boot lexico-api as a real server and resolve line tokens ([#1228](https://github.com/Organizzolini/codebase/issues/1228)) ([828fb63](https://github.com/Organizzolini/codebase/commit/828fb63a1351536b58dfde2a07dcf4a6c630c369)), closes [#1128](https://github.com/Organizzolini/codebase/issues/1128) [#1201](https://github.com/Organizzolini/codebase/issues/1201) [#1170](https://github.com/Organizzolini/codebase/issues/1170) [#1171](https://github.com/Organizzolini/codebase/issues/1171) [#1175](https://github.com/Organizzolini/codebase/issues/1175)
* **meanderaw:** 🐛 make start read-only by default with an explicit --write and exit non-zero on failure ([#1203](https://github.com/Organizzolini/codebase/issues/1203)) ([3b6591b](https://github.com/Organizzolini/codebase/commit/3b6591b7fd7613ecfbbbeca8c99af2d60aa5d7b4)), closes [#1187](https://github.com/Organizzolini/codebase/issues/1187) [#1188](https://github.com/Organizzolini/codebase/issues/1188) [#1204](https://github.com/Organizzolini/codebase/issues/1204) [#1205](https://github.com/Organizzolini/codebase/issues/1205) [#1206](https://github.com/Organizzolini/codebase/issues/1206)
* **validation:** 🐛 find package tarballs by their real version instead of 0.0.1 ([#1233](https://github.com/Organizzolini/codebase/issues/1233)) ([892371b](https://github.com/Organizzolini/codebase/commit/892371bf743c6379f5bdb67162155f076a96ae17)), closes [#1168](https://github.com/Organizzolini/codebase/issues/1168)

## [2.30.1](https://github.com/Organizzolini/codebase/compare/v2.30.0...v2.30.1) (2026-09-29)

### 🐛 Bug Fixes

* **lexico-entities:** 🐛 warm the data source import outside the test timeout ([#1225](https://github.com/Organizzolini/codebase/issues/1225)) ([af39e4c](https://github.com/Organizzolini/codebase/commit/af39e4c203b9afeaa962090f23fb1b96f282dd97))

## [2.30.0](https://github.com/Organizzolini/codebase/compare/v2.29.0...v2.30.0) (2026-09-28)

### ✨ Features

* **meanderaw:** ✨ add arabic letter skeletons in all positional forms ([#1206](https://github.com/Organizzolini/codebase/issues/1206)) ([007edad](https://github.com/Organizzolini/codebase/commit/007edad2e4767b31cd2122e7b13edc803c85b0df)), closes [#1205](https://github.com/Organizzolini/codebase/issues/1205) [#1205](https://github.com/Organizzolini/codebase/issues/1205) [#1204](https://github.com/Organizzolini/codebase/issues/1204) [#1198](https://github.com/Organizzolini/codebase/issues/1198) [#1197](https://github.com/Organizzolini/codebase/issues/1197) [#1204](https://github.com/Organizzolini/codebase/issues/1204) [#1198](https://github.com/Organizzolini/codebase/issues/1198) [#1192](https://github.com/Organizzolini/codebase/issues/1192) [#1197](https://github.com/Organizzolini/codebase/issues/1197) [#1198](https://github.com/Organizzolini/codebase/issues/1198) [#1189](https://github.com/Organizzolini/codebase/issues/1189) [#1205](https://github.com/Organizzolini/codebase/issues/1205)

## [2.29.0](https://github.com/Organizzolini/codebase/compare/v2.28.0...v2.29.0) (2026-09-28)

### ✨ Features

* **lexico,callidescope:** ✨ add word and literature lookups ([#1201](https://github.com/Organizzolini/codebase/issues/1201)) ([6b08eca](https://github.com/Organizzolini/codebase/commit/6b08eca1720d2c3d283edea2f77b6af29ebf08d9)), closes [#1170](https://github.com/Organizzolini/codebase/issues/1170) [#1171](https://github.com/Organizzolini/codebase/issues/1171) [#1175](https://github.com/Organizzolini/codebase/issues/1175) [#1179](https://github.com/Organizzolini/codebase/issues/1179) [#1183](https://github.com/Organizzolini/codebase/issues/1183) [#1172](https://github.com/Organizzolini/codebase/issues/1172) [#1173](https://github.com/Organizzolini/codebase/issues/1173) [#1174](https://github.com/Organizzolini/codebase/issues/1174) [#1176](https://github.com/Organizzolini/codebase/issues/1176) [#1177](https://github.com/Organizzolini/codebase/issues/1177) [#1178](https://github.com/Organizzolini/codebase/issues/1178) [#1180](https://github.com/Organizzolini/codebase/issues/1180) [#1181](https://github.com/Organizzolini/codebase/issues/1181) [#1182](https://github.com/Organizzolini/codebase/issues/1182) [#1184](https://github.com/Organizzolini/codebase/issues/1184) [#1185](https://github.com/Organizzolini/codebase/issues/1185) [#1186](https://github.com/Organizzolini/codebase/issues/1186)
* **meanderaw:** ✨ add directional edge counts, submatrix window metadata, and utilities services ([#1188](https://github.com/Organizzolini/codebase/issues/1188)) ([486a3f3](https://github.com/Organizzolini/codebase/commit/486a3f3d6a3753e0dc139750c87c0ee2fe22819f)), closes [#1164](https://github.com/Organizzolini/codebase/issues/1164) [#1165](https://github.com/Organizzolini/codebase/issues/1165) [#1166](https://github.com/Organizzolini/codebase/issues/1166) [#1204](https://github.com/Organizzolini/codebase/issues/1204) [#1204](https://github.com/Organizzolini/codebase/issues/1204) [#1204](https://github.com/Organizzolini/codebase/issues/1204) [#1204](https://github.com/Organizzolini/codebase/issues/1204) [#1204](https://github.com/Organizzolini/codebase/issues/1204) [#1166](https://github.com/Organizzolini/codebase/issues/1166) [#1165](https://github.com/Organizzolini/codebase/issues/1165) [#1163](https://github.com/Organizzolini/codebase/issues/1163) [#1164](https://github.com/Organizzolini/codebase/issues/1164) [#1165](https://github.com/Organizzolini/codebase/issues/1165) [#1166](https://github.com/Organizzolini/codebase/issues/1166) [#1140](https://github.com/Organizzolini/codebase/issues/1140) [#1187](https://github.com/Organizzolini/codebase/issues/1187) [#1167](https://github.com/Organizzolini/codebase/issues/1167) [#1204](https://github.com/Organizzolini/codebase/issues/1204)
* **meanderaw:** ✨ add zig-zag greek letters lambda, sigma, delta, kappa, and omega ([#1205](https://github.com/Organizzolini/codebase/issues/1205)) ([900b8a4](https://github.com/Organizzolini/codebase/commit/900b8a46e7637f0337345944354a114c40bba98e)), closes [#1203](https://github.com/Organizzolini/codebase/issues/1203) [#1191](https://github.com/Organizzolini/codebase/issues/1191) [#1196](https://github.com/Organizzolini/codebase/issues/1196) [#1189](https://github.com/Organizzolini/codebase/issues/1189) [#1204](https://github.com/Organizzolini/codebase/issues/1204)
* **meanderaw:** ✨ enumerate every letter in eight orientations and split out glyph storage ([#1204](https://github.com/Organizzolini/codebase/issues/1204)) ([cf6c8e8](https://github.com/Organizzolini/codebase/commit/cf6c8e8b53db45668e083e8a633a2985acb3e03b)), closes [#1167](https://github.com/Organizzolini/codebase/issues/1167) [#1188](https://github.com/Organizzolini/codebase/issues/1188) [#1188](https://github.com/Organizzolini/codebase/issues/1188) [#1188](https://github.com/Organizzolini/codebase/issues/1188) [#1167](https://github.com/Organizzolini/codebase/issues/1167) [#1195](https://github.com/Organizzolini/codebase/issues/1195) [#1188](https://github.com/Organizzolini/codebase/issues/1188) [#1167](https://github.com/Organizzolini/codebase/issues/1167) [#1188](https://github.com/Organizzolini/codebase/issues/1188) [#1193](https://github.com/Organizzolini/codebase/issues/1193) [#1195](https://github.com/Organizzolini/codebase/issues/1195) [#1194](https://github.com/Organizzolini/codebase/issues/1194) [#1195](https://github.com/Organizzolini/codebase/issues/1195) [#1193](https://github.com/Organizzolini/codebase/issues/1193) [#1195](https://github.com/Organizzolini/codebase/issues/1195) [#1194](https://github.com/Organizzolini/codebase/issues/1194) [#1195](https://github.com/Organizzolini/codebase/issues/1195) [#1193](https://github.com/Organizzolini/codebase/issues/1193) [#1195](https://github.com/Organizzolini/codebase/issues/1195) [#1194](https://github.com/Organizzolini/codebase/issues/1194) [#1194](https://github.com/Organizzolini/codebase/issues/1194) [#1195](https://github.com/Organizzolini/codebase/issues/1195) [#1167](https://github.com/Organizzolini/codebase/issues/1167) [#1190](https://github.com/Organizzolini/codebase/issues/1190) [#1193](https://github.com/Organizzolini/codebase/issues/1193) [#1194](https://github.com/Organizzolini/codebase/issues/1194) [#1195](https://github.com/Organizzolini/codebase/issues/1195) [#1189](https://github.com/Organizzolini/codebase/issues/1189) [#1188](https://github.com/Organizzolini/codebase/issues/1188)

### 🐛 Bug Fixes

* **lexico:** 🐛 type entity relations as Relation to break the Word import cycle ([#1218](https://github.com/Organizzolini/codebase/issues/1218)) ([ff96e72](https://github.com/Organizzolini/codebase/commit/ff96e72a831dc0b0bc1bf825ad45314f6c2fca13)), closes [#1201](https://github.com/Organizzolini/codebase/issues/1201) [#1201](https://github.com/Organizzolini/codebase/issues/1201) [#1217](https://github.com/Organizzolini/codebase/issues/1217) [#1201](https://github.com/Organizzolini/codebase/issues/1201)
* **meanderaw:** 🐛 move glyph words into shared linguistics dictionary ([#1222](https://github.com/Organizzolini/codebase/issues/1222)) ([004d1f5](https://github.com/Organizzolini/codebase/commit/004d1f58c6a12a98bd7e4d35e119e7f79774d647)), closes [#1218](https://github.com/Organizzolini/codebase/issues/1218)
* **validation,configuration:** 🐛 stop pre-commit checks re-linking node_modules ([#1212](https://github.com/Organizzolini/codebase/issues/1212)) ([da8fe64](https://github.com/Organizzolini/codebase/commit/da8fe6414e01dac392572d246076924b259da730)), closes [#1211](https://github.com/Organizzolini/codebase/issues/1211)

## [2.28.0](https://github.com/Organizzolini/codebase/compare/v2.27.0...v2.28.0) (2026-09-28)

### ✨ Features

* **meanderaw:** ✨ implement compound characteristics, entity schema update, and orchestrator refactor ([#1187](https://github.com/Organizzolini/codebase/issues/1187)) ([3df164e](https://github.com/Organizzolini/codebase/commit/3df164e7e8273f180492d458c75bc71a49b08c2f)), closes [#1154](https://github.com/Organizzolini/codebase/issues/1154) [#1155](https://github.com/Organizzolini/codebase/issues/1155) [#1156](https://github.com/Organizzolini/codebase/issues/1156) [#1157](https://github.com/Organizzolini/codebase/issues/1157) [#1158](https://github.com/Organizzolini/codebase/issues/1158) [#1140](https://github.com/Organizzolini/codebase/issues/1140) [#1161](https://github.com/Organizzolini/codebase/issues/1161)

## [2.27.0](https://github.com/JimmyPaolini/codebase/compare/v2.26.0...v2.27.0) (2026-09-28)

### ✨ Features

* **meanderaw:** ✨ implement topological betti numbers and path dynamic characteristic services ([#1161](https://github.com/JimmyPaolini/codebase/issues/1161)) ([ac45a21](https://github.com/JimmyPaolini/codebase/commit/ac45a21d8b01ed7e3033633f4098736ab6c944ac)), closes [#1150](https://github.com/JimmyPaolini/codebase/issues/1150) [#1151](https://github.com/JimmyPaolini/codebase/issues/1151) [#1152](https://github.com/JimmyPaolini/codebase/issues/1152) [#1153](https://github.com/JimmyPaolini/codebase/issues/1153) [#1140](https://github.com/JimmyPaolini/codebase/issues/1140) [#1160](https://github.com/JimmyPaolini/codebase/issues/1160)

## [2.26.0](https://github.com/JimmyPaolini/codebase/compare/v2.25.0...v2.26.0) (2026-09-28)

### ✨ Features

* **meanderaw:** ✨ implement submatrix forks, rectangles, and minimal letter glyph services ([#1162](https://github.com/JimmyPaolini/codebase/issues/1162)) ([edaaed7](https://github.com/JimmyPaolini/codebase/commit/edaaed701d93b200ea21a6284d90b4ea5f7bb2f3)), closes [#1140](https://github.com/JimmyPaolini/codebase/issues/1140) [#1145](https://github.com/JimmyPaolini/codebase/issues/1145) [#1146](https://github.com/JimmyPaolini/codebase/issues/1146) [#1147](https://github.com/JimmyPaolini/codebase/issues/1147) [#1148](https://github.com/JimmyPaolini/codebase/issues/1148)

## [2.25.0](https://github.com/JimmyPaolini/codebase/compare/v2.24.2...v2.25.0) (2026-09-28)

### ✨ Features

* **meanderaw:** ✨ establish characteristic evaluator contract and atomic submatrix point/corner services ([#1160](https://github.com/JimmyPaolini/codebase/issues/1160)) ([c4585bc](https://github.com/JimmyPaolini/codebase/commit/c4585bcc2d06aa4e7aed69f14c549ba67966ccee)), closes [#1141](https://github.com/JimmyPaolini/codebase/issues/1141) [#1142](https://github.com/JimmyPaolini/codebase/issues/1142) [#1143](https://github.com/JimmyPaolini/codebase/issues/1143) [#1144](https://github.com/JimmyPaolini/codebase/issues/1144) [#1140](https://github.com/JimmyPaolini/codebase/issues/1140) [#1145](https://github.com/JimmyPaolini/codebase/issues/1145) [#1150](https://github.com/JimmyPaolini/codebase/issues/1150)

## [2.24.2](https://github.com/JimmyPaolini/codebase/compare/v2.24.1...v2.24.2) (2026-09-27)

### 🐛 Bug Fixes

* **validation:** 🐛 relax commit scope overlap validation ([#1200](https://github.com/JimmyPaolini/codebase/issues/1200)) ([5367fd2](https://github.com/JimmyPaolini/codebase/commit/5367fd2eeba84428d07421f5d553079fe3e35b25))

## [2.24.1](https://github.com/JimmyPaolini/codebase/compare/v2.24.0...v2.24.1) (2026-09-27)

### 🐛 Bug Fixes

* **ic-suite,deployments:** 🐛 fix order of anchor tags and refresh codependix markdown outputs ([#1199](https://github.com/JimmyPaolini/codebase/issues/1199)) ([1621631](https://github.com/JimmyPaolini/codebase/commit/1621631fb0555347d2d95ea4acb76a50542b47d6))

## [2.24.0](https://github.com/JimmyPaolini/codebase/compare/v2.23.3...v2.24.0) (2026-09-26)

### ✨ Features

* **conformetry,lexico,lexico-ingestion,meanderaw:** ✨ scaffold lexico-api application and health probes ([#1128](https://github.com/JimmyPaolini/codebase/issues/1128)) ([d644b05](https://github.com/JimmyPaolini/codebase/commit/d644b050ca1cc2e462944f519639a004f6842be5)), closes [#1118](https://github.com/JimmyPaolini/codebase/issues/1118) [#1119](https://github.com/JimmyPaolini/codebase/issues/1119) [#1120](https://github.com/JimmyPaolini/codebase/issues/1120) [#1121](https://github.com/JimmyPaolini/codebase/issues/1121) [#1117](https://github.com/JimmyPaolini/codebase/issues/1117)
* **lexico:** ✨ implement dictionary lexeme lookups and tiered search queries ([#1122](https://github.com/JimmyPaolini/codebase/issues/1122)) ([#1129](https://github.com/JimmyPaolini/codebase/issues/1129)) ([7c88077](https://github.com/JimmyPaolini/codebase/commit/7c88077ff50d2abe2aa016158f581b1f4a2e6d09)), closes [#1123](https://github.com/JimmyPaolini/codebase/issues/1123) [#1124](https://github.com/JimmyPaolini/codebase/issues/1124) [#1125](https://github.com/JimmyPaolini/codebase/issues/1125) [#1126](https://github.com/JimmyPaolini/codebase/issues/1126) [#1123](https://github.com/JimmyPaolini/codebase/issues/1123) [#1124](https://github.com/JimmyPaolini/codebase/issues/1124) [#1125](https://github.com/JimmyPaolini/codebase/issues/1125) [#1126](https://github.com/JimmyPaolini/codebase/issues/1126) [#1117](https://github.com/JimmyPaolini/codebase/issues/1117) [#1128](https://github.com/JimmyPaolini/codebase/issues/1128)

### 🐛 Bug Fixes

* **callidescope,conformetry:** 🐛 ship the nx plugins as pure esm ([#1102](https://github.com/JimmyPaolini/codebase/issues/1102)) ([4ad5aff](https://github.com/JimmyPaolini/codebase/commit/4ad5aff1a86d1f6e18d7b2ba4448545015ea71d1)), closes [#487](https://github.com/JimmyPaolini/codebase/issues/487) [#488](https://github.com/JimmyPaolini/codebase/issues/488) [#489](https://github.com/JimmyPaolini/codebase/issues/489)

### 📝 Documentation

* **documentation:** 📝 add human-gated step-by-step stops to agent planning workflow ([#1159](https://github.com/JimmyPaolini/codebase/issues/1159)) ([eef38d2](https://github.com/JimmyPaolini/codebase/commit/eef38d2929a715cce8a976945676b5f3729719a8))

## [2.23.3](https://github.com/JimmyPaolini/codebase/compare/v2.23.2...v2.23.3) (2026-09-26)

### 📦 Build System

* **callidescope:** 📦️ migrate callidescope to the vite library build and inline the logger ([#1131](https://github.com/JimmyPaolini/codebase/issues/1131)) ([5be0da0](https://github.com/JimmyPaolini/codebase/commit/5be0da0e7d81a1b1106a95ab4130b4cc994e5d9d)), closes [#475](https://github.com/JimmyPaolini/codebase/issues/475) [#476](https://github.com/JimmyPaolini/codebase/issues/476) [#477](https://github.com/JimmyPaolini/codebase/issues/477) [#478](https://github.com/JimmyPaolini/codebase/issues/478) [#479](https://github.com/JimmyPaolini/codebase/issues/479) [#480](https://github.com/JimmyPaolini/codebase/issues/480)
* **codometer:** 📦️ migrate codometer to the vite library build and inline the logger ([#1132](https://github.com/JimmyPaolini/codebase/issues/1132)) ([424ed90](https://github.com/JimmyPaolini/codebase/commit/424ed90892c3ef03ea04f5868c39d004cdae9eac)), closes [#468](https://github.com/JimmyPaolini/codebase/issues/468) [#469](https://github.com/JimmyPaolini/codebase/issues/469) [#470](https://github.com/JimmyPaolini/codebase/issues/470) [#472](https://github.com/JimmyPaolini/codebase/issues/472) [#473](https://github.com/JimmyPaolini/codebase/issues/473) [#474](https://github.com/JimmyPaolini/codebase/issues/474)
* **conformetry:** 📦️ migrate conformetry to the vite library build and inline the logger ([#1097](https://github.com/JimmyPaolini/codebase/issues/1097)) ([7548270](https://github.com/JimmyPaolini/codebase/commit/75482707c286edc6e863fba687eae95519db519a)), closes [#462](https://github.com/JimmyPaolini/codebase/issues/462) [#463](https://github.com/JimmyPaolini/codebase/issues/463) [#464](https://github.com/JimmyPaolini/codebase/issues/464) [#465](https://github.com/JimmyPaolini/codebase/issues/465) [#466](https://github.com/JimmyPaolini/codebase/issues/466) [#467](https://github.com/JimmyPaolini/codebase/issues/467)

## [2.23.2](https://github.com/JimmyPaolini/codebase/compare/v2.23.1...v2.23.2) (2026-09-25)

### 🐛 Bug Fixes

* **deployments,configuration:** 🐛 sign commits in upgrade-dependencies and suppress dead overrides ([#1135](https://github.com/JimmyPaolini/codebase/issues/1135)) ([a30b316](https://github.com/JimmyPaolini/codebase/commit/a30b316b853726c5c2c7582784953456bd1e8bbe)), closes [#1130](https://github.com/JimmyPaolini/codebase/issues/1130)

### 📦 Build System

* **codependix:** 📦️ migrate codependix to the vite library build and inline the logger ([#1094](https://github.com/JimmyPaolini/codebase/issues/1094)) ([13fc4de](https://github.com/JimmyPaolini/codebase/commit/13fc4dece2591fda9d9f6c82d0ca5398af010983)), closes [#481](https://github.com/JimmyPaolini/codebase/issues/481) [#482](https://github.com/JimmyPaolini/codebase/issues/482) [#483](https://github.com/JimmyPaolini/codebase/issues/483) [#484](https://github.com/JimmyPaolini/codebase/issues/484) [#485](https://github.com/JimmyPaolini/codebase/issues/485) [#486](https://github.com/JimmyPaolini/codebase/issues/486) [#443](https://github.com/JimmyPaolini/codebase/issues/443)

## [2.23.1](https://github.com/JimmyPaolini/codebase/compare/v2.23.0...v2.23.1) (2026-09-25)

### 📦 Build System

* **callidescope,codependix,codometer,configuration,conformetry,ic-suite,testing,validation:** 📦️ verify publish set ([#1057](https://github.com/JimmyPaolini/codebase/issues/1057)) ([e2e155a](https://github.com/JimmyPaolini/codebase/commit/e2e155a2adec21cdfe19831448a383198d5d9d49)), closes [#451](https://github.com/JimmyPaolini/codebase/issues/451) [#452](https://github.com/JimmyPaolini/codebase/issues/452) [#453](https://github.com/JimmyPaolini/codebase/issues/453) [#454](https://github.com/JimmyPaolini/codebase/issues/454) [#455](https://github.com/JimmyPaolini/codebase/issues/455) [#456](https://github.com/JimmyPaolini/codebase/issues/456) [#457](https://github.com/JimmyPaolini/codebase/issues/457)
* **configuration,documentation:** 📦️ add the shared vite library build ([#1058](https://github.com/JimmyPaolini/codebase/issues/1058)) ([b1d2a42](https://github.com/JimmyPaolini/codebase/commit/b1d2a4256c7373868c3cc6fde86d147bbb4107a4)), closes [#458](https://github.com/JimmyPaolini/codebase/issues/458) [#459](https://github.com/JimmyPaolini/codebase/issues/459) [#460](https://github.com/JimmyPaolini/codebase/issues/460) [#461](https://github.com/JimmyPaolini/codebase/issues/461)

## [2.23.0](https://github.com/JimmyPaolini/codebase/compare/v2.22.1...v2.23.0) (2026-09-25)

### ✨ Features

* **meanderaw:** ✨ split branches into comb, arcade, fork, tree, and stipple ([#1100](https://github.com/JimmyPaolini/codebase/issues/1100)) ([392eee0](https://github.com/JimmyPaolini/codebase/commit/392eee0ecb6248ff8f016e7e4eb039625beb6778))

## [2.22.1](https://github.com/JimmyPaolini/codebase/compare/v2.22.0...v2.22.1) (2026-09-24)

### 🐛 Bug Fixes

* **conformetry,codometer,callidescope,codependix,configuration,documentation:** 🐛 make exports conditions authoritative ([#1056](https://github.com/JimmyPaolini/codebase/issues/1056)) ([062d099](https://github.com/JimmyPaolini/codebase/commit/062d09928ee1908d8f2d485010ee3ec83c821a06)), closes [#447](https://github.com/JimmyPaolini/codebase/issues/447) [#448](https://github.com/JimmyPaolini/codebase/issues/448) [#449](https://github.com/JimmyPaolini/codebase/issues/449) [#450](https://github.com/JimmyPaolini/codebase/issues/450)

## [2.22.0](https://github.com/JimmyPaolini/codebase/compare/v2.21.0...v2.22.0) (2026-09-24)

### ✨ Features

* **configuration,meanderaw:** ✨ add waterfalls family and remove invalid boxes ([#1101](https://github.com/JimmyPaolini/codebase/issues/1101)) ([fb32aa6](https://github.com/JimmyPaolini/codebase/commit/fb32aa6f5cb307bfb861310e6d4c5b860e475130))
* **meanderaw:** :sparkles: extract characteristics to refine chain, whirl, and clasps classification ([#1098](https://github.com/JimmyPaolini/codebase/issues/1098)) ([1c4d89d](https://github.com/JimmyPaolini/codebase/commit/1c4d89d4607be3bbf00e4d340076a95815116e7d))

### 📝 Documentation

* **documentation:** 📝 cross-link skills, examples, and command line documentation ([#1055](https://github.com/JimmyPaolini/codebase/issues/1055)) ([5ac136d](https://github.com/JimmyPaolini/codebase/commit/5ac136d4ecc4a8a1f3bd69ffeb74ebbbb80bdace)), closes [#494](https://github.com/JimmyPaolini/codebase/issues/494) [#495](https://github.com/JimmyPaolini/codebase/issues/495) [#496](https://github.com/JimmyPaolini/codebase/issues/496) [#493](https://github.com/JimmyPaolini/codebase/issues/493) [#494](https://github.com/JimmyPaolini/codebase/issues/494) [#495](https://github.com/JimmyPaolini/codebase/issues/495) [#496](https://github.com/JimmyPaolini/codebase/issues/496) [#443](https://github.com/JimmyPaolini/codebase/issues/443)

## [2.21.0](https://github.com/JimmyPaolini/codebase/compare/v2.20.0...v2.21.0) (2026-09-24)

### ✨ Features

* **meanderaw:** ✨ add clasps family for disconnected chain meanders ([#1054](https://github.com/JimmyPaolini/codebase/issues/1054)) ([ab955a0](https://github.com/JimmyPaolini/codebase/commit/ab955a05412b2a077ec0c43ae226765f2cc29f83)), closes [#1027](https://github.com/JimmyPaolini/codebase/issues/1027) [#1052](https://github.com/JimmyPaolini/codebase/issues/1052)

## [2.20.0](https://github.com/JimmyPaolini/codebase/compare/v2.19.0...v2.20.0) (2026-09-24)

### ✨ Features

* **meanderaw:** ✨ Implement single-family classification and update meander entity ([#1052](https://github.com/JimmyPaolini/codebase/issues/1052)) ([8adc28b](https://github.com/JimmyPaolini/codebase/commit/8adc28b266884ced440621467ac7004f76d07fc1)), closes [#1031](https://github.com/JimmyPaolini/codebase/issues/1031) [#1027](https://github.com/JimmyPaolini/codebase/issues/1027)

### ♻️ Code Refactoring

* **meanderaw:** ♻️ Refactor characteristics to use 2D Matrix and remove negative space ([#1051](https://github.com/JimmyPaolini/codebase/issues/1051)) ([1b0c4f9](https://github.com/JimmyPaolini/codebase/commit/1b0c4f9189dd30ecd85dff622836a97c8f3c0b28)), closes [#1030](https://github.com/JimmyPaolini/codebase/issues/1030) [#1027](https://github.com/JimmyPaolini/codebase/issues/1027)

## [2.19.0](https://github.com/JimmyPaolini/codebase/compare/v2.18.1...v2.19.0) (2026-09-24)

### ✨ Features

* **meanderaw:** ✨ Implement MatrixModule and 2D matrix transformation ([#1048](https://github.com/JimmyPaolini/codebase/issues/1048)) ([46c7c3b](https://github.com/JimmyPaolini/codebase/commit/46c7c3b98f63cbb04af92e16b40a2ec2d14213e0)), closes [#1028](https://github.com/JimmyPaolini/codebase/issues/1028) [#1027](https://github.com/JimmyPaolini/codebase/issues/1027)

### 📝 Documentation

* **documentation,deployments:** 📝 reorder readme projects and remove probe from compliance workflow ([#1053](https://github.com/JimmyPaolini/codebase/issues/1053)) ([d0c86ea](https://github.com/JimmyPaolini/codebase/commit/d0c86eadd80cb427f5e548315a539d453ed6ec0c))

### ♻️ Code Refactoring

* **meanderaw:** ♻️ Redefine rows to lattice height and eliminate levels ([#1049](https://github.com/JimmyPaolini/codebase/issues/1049)) ([cd83426](https://github.com/JimmyPaolini/codebase/commit/cd8342670cb04aa8b51026875feee64c24240624)), closes [#1029](https://github.com/JimmyPaolini/codebase/issues/1029) [#1027](https://github.com/JimmyPaolini/codebase/issues/1027)

## [2.18.1](https://github.com/JimmyPaolini/codebase/compare/v2.18.0...v2.18.1) (2026-09-23)

### ♻️ Code Refactoring

* **configuration,deployments:** :recycle: relocate root configuration files and rename compliance jobs ([#1032](https://github.com/JimmyPaolini/codebase/issues/1032)) ([951d98a](https://github.com/JimmyPaolini/codebase/commit/951d98a8ff30c056de7c57954bb05d3e75326327))

## [2.18.0](https://github.com/JimmyPaolini/codebase/compare/v2.17.0...v2.18.0) (2026-09-21)

### ✨ Features

* **validation:** ✨ validate pull request body sections are non-empty ([#1050](https://github.com/JimmyPaolini/codebase/issues/1050)) ([7ea5295](https://github.com/JimmyPaolini/codebase/commit/7ea52958ca50ec4c26e5fc4b4ef0d2aa13e8c2d9))

## [2.17.0](https://github.com/JimmyPaolini/codebase/compare/v2.16.0...v2.17.0) (2026-09-21)

### ✨ Features

* **codependix:** ✨ add a path command that reports how one node reaches another ([#1018](https://github.com/JimmyPaolini/codebase/issues/1018)) ([f7a1170](https://github.com/JimmyPaolini/codebase/commit/f7a11706a0e8f1559d880d021c6ee8dc9f569133)), closes [#924](https://github.com/JimmyPaolini/codebase/issues/924) [#904](https://github.com/JimmyPaolini/codebase/issues/904)
* **codependix:** ✨ give a nestjs module node its declaring file ([#1017](https://github.com/JimmyPaolini/codebase/issues/1017)) ([0f6736c](https://github.com/JimmyPaolini/codebase/commit/0f6736c14e3c1b83e1a644b2f94b6c93c5451320)), closes [#938](https://github.com/JimmyPaolini/codebase/issues/938) [#938](https://github.com/JimmyPaolini/codebase/issues/938) [#940](https://github.com/JimmyPaolini/codebase/issues/940) [#939](https://github.com/JimmyPaolini/codebase/issues/939) [#941](https://github.com/JimmyPaolini/codebase/issues/941) [#926](https://github.com/JimmyPaolini/codebase/issues/926) [#938](https://github.com/JimmyPaolini/codebase/issues/938) [#939](https://github.com/JimmyPaolini/codebase/issues/939) [#940](https://github.com/JimmyPaolini/codebase/issues/940) [#941](https://github.com/JimmyPaolini/codebase/issues/941) [#904](https://github.com/JimmyPaolini/codebase/issues/904)
* **codependix:** ✨ report stale exports by destination, anchor, and difference ([#1019](https://github.com/JimmyPaolini/codebase/issues/1019)) ([487cb80](https://github.com/JimmyPaolini/codebase/commit/487cb80cd6b8730bbedc21d7e7d1b263bb0613ff)), closes [#925](https://github.com/JimmyPaolini/codebase/issues/925) [#904](https://github.com/JimmyPaolini/codebase/issues/904)
* **deployments,documentation:** ✨ combine push releases into continuous deployment workflow ([#1021](https://github.com/JimmyPaolini/codebase/issues/1021)) ([2282c9b](https://github.com/JimmyPaolini/codebase/commit/2282c9b4ae14de9432dabb31212feec6063c78c0)), closes [#996](https://github.com/JimmyPaolini/codebase/issues/996) [#991](https://github.com/JimmyPaolini/codebase/issues/991)
* **deployments:** ✨ validate commit message and governance on push to main ([#1024](https://github.com/JimmyPaolini/codebase/issues/1024)) ([9b1b2ef](https://github.com/JimmyPaolini/codebase/commit/9b1b2ef36787103d6cecb7a315862672faf1dc98))
* **meanderaw:** ✨ bake dimensions and repeats into meander codes ([#1022](https://github.com/JimmyPaolini/codebase/issues/1022)) ([9ea2c80](https://github.com/JimmyPaolini/codebase/commit/9ea2c804e0c0f430721ca970e41bc9eb722a09ca)), closes [#1013](https://github.com/JimmyPaolini/codebase/issues/1013)
* **meanderaw:** ✨ formalize lines, bars, mesh, and dots meander families ([#1047](https://github.com/JimmyPaolini/codebase/issues/1047)) ([e5e786d](https://github.com/JimmyPaolini/codebase/commit/e5e786d6f51f0f9c2da12f969c99b7b91e256f6b))

### 📝 Documentation

* **callidescope,codometer,conformetry:** 📝 remove orphaned codependix anchor blocks ([#1016](https://github.com/JimmyPaolini/codebase/issues/1016)) ([dadd4e3](https://github.com/JimmyPaolini/codebase/commit/dadd4e34e1394b1dc22884cfcc4e9c7b86f32279)), closes [#923](https://github.com/JimmyPaolini/codebase/issues/923) [#904](https://github.com/JimmyPaolini/codebase/issues/904)
* **codependix:** 📝 rewrite the navigate skill to drive the command line ([#1020](https://github.com/JimmyPaolini/codebase/issues/1020)) ([2d2a6e1](https://github.com/JimmyPaolini/codebase/commit/2d2a6e1ea752e3c45ea3362b673e7475548bcd45)), closes [#927](https://github.com/JimmyPaolini/codebase/issues/927) [#904](https://github.com/JimmyPaolini/codebase/issues/904)

### ♻️ Code Refactoring

* **ic-suite:** ♻️ unify markdown anchor markers across ic-suite toolchains ([#1026](https://github.com/JimmyPaolini/codebase/issues/1026)) ([d89e544](https://github.com/JimmyPaolini/codebase/commit/d89e5448255fda29210dc1106b9478dd2ff1c095)), closes [#904](https://github.com/JimmyPaolini/codebase/issues/904)

## [2.16.0](https://github.com/JimmyPaolini/codebase/compare/v2.15.0...v2.16.0) (2026-09-21)

### ✨ Features

* **meanderaw:** ✨ implement canonical phase for meanders ([#1011](https://github.com/JimmyPaolini/codebase/issues/1011)) ([c3215f6](https://github.com/JimmyPaolini/codebase/commit/c3215f651c746172d46ca6972023d5e92b5c708a)), closes [#859](https://github.com/JimmyPaolini/codebase/issues/859)
* **meanderaw:** ✨ measure characteristics ([#1010](https://github.com/JimmyPaolini/codebase/issues/1010)) ([20fabe6](https://github.com/JimmyPaolini/codebase/commit/20fabe623bb69136c798b75c2ede47e8d703a6a3)), closes [#859](https://github.com/JimmyPaolini/codebase/issues/859)
* **meanderaw:** ✨ store families as an open set and drop charter columns ([#1012](https://github.com/JimmyPaolini/codebase/issues/1012)) ([6755608](https://github.com/JimmyPaolini/codebase/commit/6755608a8e8e8c885d679b16d819853da8d81f5c)), closes [#859](https://github.com/JimmyPaolini/codebase/issues/859)

### ♻️ Code Refactoring

* **meanderaw:** ♻️ remove module forward references and restore coverage ([#1013](https://github.com/JimmyPaolini/codebase/issues/1013)) ([b0ffba1](https://github.com/JimmyPaolini/codebase/commit/b0ffba1a5562fff298f5cdbc831f9f2e4baf4b4b)), closes [#859](https://github.com/JimmyPaolini/codebase/issues/859)

## [2.15.0](https://github.com/JimmyPaolini/codebase/compare/v2.14.0...v2.15.0) (2026-09-20)

### ✨ Features

* **validation:** ✨ add continuous compliance hierarchy and governance audits ([#1015](https://github.com/JimmyPaolini/codebase/issues/1015)) ([7d3f379](https://github.com/JimmyPaolini/codebase/commit/7d3f379cffa07b0fd2757f0344bf0765afada67d)), closes [#1005](https://github.com/JimmyPaolini/codebase/issues/1005) [#1006](https://github.com/JimmyPaolini/codebase/issues/1006) [#1007](https://github.com/JimmyPaolini/codebase/issues/1007) [#1008](https://github.com/JimmyPaolini/codebase/issues/1008) [#1009](https://github.com/JimmyPaolini/codebase/issues/1009) [#1004](https://github.com/JimmyPaolini/codebase/issues/1004)

## [2.14.0](https://github.com/JimmyPaolini/codebase/compare/v2.13.1...v2.14.0) (2026-09-20)

### ✨ Features

* **deployments,documentation,dependencies:** ✨ unify continuous deployment and continuous compliance workflows ([#996](https://github.com/JimmyPaolini/codebase/issues/996)) ([1b303cb](https://github.com/JimmyPaolini/codebase/commit/1b303cb8f5bce440ab494a103e0f13ef3e67ce93)), closes [#992](https://github.com/JimmyPaolini/codebase/issues/992) [#991](https://github.com/JimmyPaolini/codebase/issues/991) [#967](https://github.com/JimmyPaolini/codebase/issues/967)

### 🐛 Bug Fixes

* **codometer:** 🐛 discover root and nested package reports in pr changes ([#985](https://github.com/JimmyPaolini/codebase/issues/985)) ([94b2cee](https://github.com/JimmyPaolini/codebase/commit/94b2ceeb4587ab6ce3bc56c4765455a4a786b758)), closes [#981](https://github.com/JimmyPaolini/codebase/issues/981)
* **configuration:** 🐛 stop sharing nx cache across worktrees to prevent race conditions ([#990](https://github.com/JimmyPaolini/codebase/issues/990)) ([1cd8448](https://github.com/JimmyPaolini/codebase/commit/1cd8448294bfd8ab6b68b0159f682e8992a8614b)), closes [#960](https://github.com/JimmyPaolini/codebase/issues/960)

## [2.13.1](https://github.com/JimmyPaolini/codebase/compare/v2.13.0...v2.13.1) (2026-09-20)

## [2.13.0](https://github.com/JimmyPaolini/codebase/compare/v2.12.0...v2.13.0) (2026-09-20)

## [2.12.0](https://github.com/JimmyPaolini/codebase/compare/v2.11.1...v2.12.0) (2026-09-19)

## [2.11.1](https://github.com/JimmyPaolini/codebase/compare/v2.11.0...v2.11.1) (2026-09-19)

## [2.11.0](https://github.com/JimmyPaolini/codebase/compare/v2.10.6...v2.11.0) (2026-09-19)

## [2.10.6](https://github.com/JimmyPaolini/codebase/compare/v2.10.5...v2.10.6) (2026-09-19)

## [2.10.5](https://github.com/JimmyPaolini/codebase/compare/v2.10.4...v2.10.5) (2026-09-19)

## [2.10.4](https://github.com/JimmyPaolini/codebase/compare/v2.10.3...v2.10.4) (2026-09-19)

## [2.10.3](https://github.com/JimmyPaolini/codebase/compare/v2.10.2...v2.10.3) (2026-09-19)

## [2.10.2](https://github.com/JimmyPaolini/codebase/compare/v2.10.1...v2.10.2) (2026-09-18)

## [2.10.1](https://github.com/JimmyPaolini/codebase/compare/v2.10.0...v2.10.1) (2026-09-18)

## [2.10.0](https://github.com/JimmyPaolini/codebase/compare/v2.9.2...v2.10.0) (2026-09-18)

## [2.9.2](https://github.com/JimmyPaolini/codebase/compare/v2.9.1...v2.9.2) (2026-09-18)

## [2.9.1](https://github.com/JimmyPaolini/codebase/compare/v2.9.0...v2.9.1) (2026-09-18)

## [2.9.0](https://github.com/JimmyPaolini/codebase/compare/v2.8.2...v2.9.0) (2026-09-18)

## [2.8.2](https://github.com/JimmyPaolini/codebase/compare/v2.8.1...v2.8.2) (2026-09-18)

## [2.8.1](https://github.com/JimmyPaolini/codebase/compare/v2.8.0...v2.8.1) (2026-09-15)

## [2.8.0](https://github.com/JimmyPaolini/codebase/compare/v2.7.0...v2.8.0) (2026-09-15)

## [2.7.0](https://github.com/JimmyPaolini/codebase/compare/v2.6.0...v2.7.0) (2026-09-14)

## [2.6.0](https://github.com/JimmyPaolini/codebase/compare/v2.5.0...v2.6.0) (2026-09-14)

## [2.5.0](https://github.com/JimmyPaolini/codebase/compare/v2.4.2...v2.5.0) (2026-09-14)

## [2.4.2](https://github.com/JimmyPaolini/codebase/compare/v2.4.1...v2.4.2) (2026-09-14)

## [2.4.1](https://github.com/JimmyPaolini/codebase/compare/v2.4.0...v2.4.1) (2026-09-14)

## [2.4.0](https://github.com/JimmyPaolini/codebase/compare/v2.3.1...v2.4.0) (2026-09-14)

## [2.3.1](https://github.com/JimmyPaolini/codebase/compare/v2.3.0...v2.3.1) (2026-09-14)

## [2.3.0](https://github.com/JimmyPaolini/codebase/compare/v2.2.1...v2.3.0) (2026-09-14)

## [2.2.1](https://github.com/JimmyPaolini/codebase/compare/v2.2.0...v2.2.1) (2026-09-14)

## [2.2.0](https://github.com/JimmyPaolini/codebase/compare/v2.1.2...v2.2.0) (2026-09-14)

## [2.1.2](https://github.com/JimmyPaolini/codebase/compare/v2.1.1...v2.1.2) (2026-09-08)

## [2.1.1](https://github.com/JimmyPaolini/codebase/compare/v2.1.0...v2.1.1) (2026-09-08)

## [2.1.0](https://github.com/JimmyPaolini/codebase/compare/v2.0.0...v2.1.0) (2026-09-07)

## [2.0.0](https://github.com/JimmyPaolini/codebase/compare/v1.64.0...v2.0.0) (2026-09-07)

## [1.64.0](https://github.com/JimmyPaolini/codebase/compare/v1.63.0...v1.64.0) (2026-09-07)

## [1.63.0](https://github.com/JimmyPaolini/codebase/compare/v1.62.0...v1.63.0) (2026-09-07)

## [1.62.0](https://github.com/JimmyPaolini/codebase/compare/v1.61.0...v1.62.0) (2026-09-07)

## [1.61.0](https://github.com/JimmyPaolini/codebase/compare/v1.60.0...v1.61.0) (2026-09-07)

## [1.60.0](https://github.com/JimmyPaolini/codebase/compare/v1.59.0...v1.60.0) (2026-09-07)

## [1.59.0](https://github.com/JimmyPaolini/codebase/compare/v1.58.1...v1.59.0) (2026-09-07)

## [1.58.1](https://github.com/JimmyPaolini/codebase/compare/v1.58.0...v1.58.1) (2026-09-06)

## [1.58.0](https://github.com/JimmyPaolini/codebase/compare/v1.57.0...v1.58.0) (2026-09-05)

## [1.57.0](https://github.com/JimmyPaolini/codebase/compare/v1.56.0...v1.57.0) (2026-09-05)

## [1.56.0](https://github.com/JimmyPaolini/codebase/compare/v1.55.2...v1.56.0) (2026-09-05)

## [1.55.2](https://github.com/JimmyPaolini/codebase/compare/v1.55.1...v1.55.2) (2026-09-05)

## [1.55.1](https://github.com/JimmyPaolini/codebase/compare/v1.55.0...v1.55.1) (2026-09-05)

## [1.55.0](https://github.com/JimmyPaolini/codebase/compare/v1.54.0...v1.55.0) (2026-09-04)

## [1.54.0](https://github.com/JimmyPaolini/codebase/compare/v1.53.0...v1.54.0) (2026-09-04)

## [1.53.0](https://github.com/JimmyPaolini/codebase/compare/v1.52.1...v1.53.0) (2026-09-03)

## [1.52.1](https://github.com/JimmyPaolini/codebase/compare/v1.52.0...v1.52.1) (2026-09-02)

## [1.52.0](https://github.com/JimmyPaolini/codebase/compare/v1.51.0...v1.52.0) (2026-09-02)

## [1.51.0](https://github.com/JimmyPaolini/codebase/compare/v1.50.1...v1.51.0) (2026-09-01)

## [1.50.1](https://github.com/JimmyPaolini/codebase/compare/v1.50.0...v1.50.1) (2026-09-01)

## [1.50.0](https://github.com/JimmyPaolini/codebase/compare/v1.49.0...v1.50.0) (2026-08-28)

## [1.49.0](https://github.com/JimmyPaolini/codebase/compare/v1.48.0...v1.49.0) (2026-08-28)

## [1.48.0](https://github.com/JimmyPaolini/codebase/compare/v1.47.1...v1.48.0) (2026-08-27)

## [1.47.1](https://github.com/JimmyPaolini/codebase/compare/v1.47.0...v1.47.1) (2026-08-27)

## [1.47.0](https://github.com/JimmyPaolini/codebase/compare/v1.46.0...v1.47.0) (2026-08-27)

## [1.46.0](https://github.com/JimmyPaolini/codebase/compare/v1.45.0...v1.46.0) (2026-08-27)

## [1.45.0](https://github.com/JimmyPaolini/codebase/compare/v1.44.0...v1.45.0) (2026-08-27)

## [1.44.0](https://github.com/JimmyPaolini/codebase/compare/v1.43.0...v1.44.0) (2026-08-27)

## [1.43.0](https://github.com/JimmyPaolini/codebase/compare/v1.42.0...v1.43.0) (2026-08-27)

## [1.42.0](https://github.com/JimmyPaolini/codebase/compare/v1.41.0...v1.42.0) (2026-08-27)

## [1.41.0](https://github.com/JimmyPaolini/codebase/compare/v1.40.0...v1.41.0) (2026-08-26)

## [1.40.0](https://github.com/JimmyPaolini/codebase/compare/v1.39.0...v1.40.0) (2026-08-26)

## [1.39.0](https://github.com/JimmyPaolini/codebase/compare/v1.38.0...v1.39.0) (2026-08-26)

## [1.38.0](https://github.com/JimmyPaolini/codebase/compare/v1.37.1...v1.38.0) (2026-08-26)

## [1.37.1](https://github.com/JimmyPaolini/codebase/compare/v1.37.0...v1.37.1) (2026-08-25)

## [1.37.0](https://github.com/JimmyPaolini/codebase/compare/v1.36.0...v1.37.0) (2026-08-25)

## [1.36.0](https://github.com/JimmyPaolini/codebase/compare/v1.35.2...v1.36.0) (2026-08-24)

## [1.35.2](https://github.com/JimmyPaolini/codebase/compare/v1.35.1...v1.35.2) (2026-08-24)

## [1.35.1](https://github.com/JimmyPaolini/codebase/compare/v1.35.0...v1.35.1) (2026-08-24)

## [1.35.0](https://github.com/JimmyPaolini/codebase/compare/v1.34.0...v1.35.0) (2026-08-24)

## [1.34.0](https://github.com/JimmyPaolini/codebase/compare/v1.33.2...v1.34.0) (2026-08-24)

## [1.33.2](https://github.com/JimmyPaolini/codebase/compare/v1.33.1...v1.33.2) (2026-08-23)

## [1.33.1](https://github.com/JimmyPaolini/codebase/compare/v1.33.0...v1.33.1) (2026-08-23)

## [1.33.0](https://github.com/JimmyPaolini/codebase/compare/v1.32.1...v1.33.0) (2026-08-23)

## [1.32.1](https://github.com/JimmyPaolini/codebase/compare/v1.32.0...v1.32.1) (2026-08-23)

## [1.32.0](https://github.com/JimmyPaolini/codebase/compare/v1.31.2...v1.32.0) (2026-08-23)

## [1.31.2](https://github.com/JimmyPaolini/codebase/compare/v1.31.1...v1.31.2) (2026-08-23)

## [1.31.1](https://github.com/JimmyPaolini/codebase/compare/v1.31.0...v1.31.1) (2026-08-23)

## [1.31.0](https://github.com/JimmyPaolini/codebase/compare/v1.30.2...v1.31.0) (2026-08-23)

## [1.30.2](https://github.com/JimmyPaolini/codebase/compare/v1.30.1...v1.30.2) (2026-08-22)

## [1.30.1](https://github.com/JimmyPaolini/codebase/compare/v1.30.0...v1.30.1) (2026-08-22)

## [1.30.0](https://github.com/JimmyPaolini/codebase/compare/v1.29.2...v1.30.0) (2026-08-22)

## [1.29.2](https://github.com/JimmyPaolini/codebase/compare/v1.29.1...v1.29.2) (2026-08-22)

## [1.29.1](https://github.com/JimmyPaolini/codebase/compare/v1.29.0...v1.29.1) (2026-08-22)

## [1.29.0](https://github.com/JimmyPaolini/codebase/compare/v1.28.1...v1.29.0) (2026-08-21)

## [1.28.1](https://github.com/JimmyPaolini/codebase/compare/v1.28.0...v1.28.1) (2026-08-21)

## [1.28.0](https://github.com/JimmyPaolini/codebase/compare/v1.27.0...v1.28.0) (2026-08-21)

## [1.27.0](https://github.com/JimmyPaolini/codebase/compare/v1.26.0...v1.27.0) (2026-08-18)

## [1.26.0](https://github.com/JimmyPaolini/codebase/compare/v1.25.0...v1.26.0) (2026-08-18)

## [1.25.0](https://github.com/JimmyPaolini/codebase/compare/v1.24.0...v1.25.0) (2026-08-18)

## [1.24.0](https://github.com/JimmyPaolini/codebase/compare/v1.23.0...v1.24.0) (2026-08-18)

## [1.23.0](https://github.com/JimmyPaolini/codebase/compare/v1.22.0...v1.23.0) (2026-08-17)

## [1.22.0](https://github.com/JimmyPaolini/codebase/compare/v1.21.1...v1.22.0) (2026-08-16)

## [1.21.1](https://github.com/JimmyPaolini/codebase/compare/v1.21.0...v1.21.1) (2026-08-16)

## [1.21.0](https://github.com/JimmyPaolini/codebase/compare/v1.20.1...v1.21.0) (2026-08-16)

## [1.20.1](https://github.com/JimmyPaolini/codebase/compare/v1.20.0...v1.20.1) (2026-08-16)

## [1.20.0](https://github.com/JimmyPaolini/codebase/compare/v1.19.0...v1.20.0) (2026-08-16)

## [1.19.0](https://github.com/JimmyPaolini/codebase/compare/v1.18.0...v1.19.0) (2026-08-16)

## [1.18.0](https://github.com/JimmyPaolini/codebase/compare/v1.17.3...v1.18.0) (2026-08-16)

## [1.17.3](https://github.com/JimmyPaolini/codebase/compare/v1.17.2...v1.17.3) (2026-08-16)

## [1.17.2](https://github.com/JimmyPaolini/codebase/compare/v1.17.1...v1.17.2) (2026-08-15)

## [1.17.1](https://github.com/JimmyPaolini/codebase/compare/v1.17.0...v1.17.1) (2026-08-15)

## [1.17.0](https://github.com/JimmyPaolini/codebase/compare/v1.16.0...v1.17.0) (2026-08-15)

## [1.16.0](https://github.com/JimmyPaolini/codebase/compare/v1.15.1...v1.16.0) (2026-07-30)

## [1.15.1](https://github.com/JimmyPaolini/monorepo/compare/v1.15.0...v1.15.1) (2026-07-24)

## [1.15.0](https://github.com/JimmyPaolini/monorepo/compare/v1.14.3...v1.15.0) (2026-07-24)

## [1.14.3](https://github.com/JimmyPaolini/monorepo/compare/v1.14.2...v1.14.3) (2026-07-23)

## [1.14.2](https://github.com/JimmyPaolini/monorepo/compare/v1.14.1...v1.14.2) (2026-07-22)

## [1.14.1](https://github.com/JimmyPaolini/monorepo/compare/v1.14.0...v1.14.1) (2026-07-22)

## [1.14.0](https://github.com/JimmyPaolini/monorepo/compare/v1.13.2...v1.14.0) (2026-07-21)

## [1.13.2](https://github.com/JimmyPaolini/monorepo/compare/v1.13.1...v1.13.2) (2026-07-21)

## [1.13.1](https://github.com/JimmyPaolini/monorepo/compare/v1.13.0...v1.13.1) (2026-07-18)

### 📦 Build System

* **deps:** bump mistune from 3.2.1 to 3.3.0 in /applications/affirmations in the uv group across 1 directory ([#88](https://github.com/JimmyPaolini/monorepo/issues/88)) ([63c86fd](https://github.com/JimmyPaolini/monorepo/commit/63c86fdbd11199303f493614f12b2e1a2059376f))

## [1.13.0](https://github.com/JimmyPaolini/monorepo/compare/v1.12.0...v1.13.0) (2026-07-17)

### ✨ Features

* **scripts:** ✨ add stale local branch cleanup script ([#89](https://github.com/JimmyPaolini/monorepo/issues/89)) ([7cbb1d0](https://github.com/JimmyPaolini/monorepo/commit/7cbb1d0f98ba321e39992b80d387d0f05d7539e5))

## [1.12.0](https://github.com/JimmyPaolini/monorepo/compare/v1.11.0...v1.12.0) (2026-07-17)

### ✨ Features

* **monorepo:** ✨ integrate fallow code-quality workflows ([#74](https://github.com/JimmyPaolini/monorepo/issues/74)) ([e219208](https://github.com/JimmyPaolini/monorepo/commit/e2192087a5c5e53162ccd574ff34798384b505f7))

### 🐛 Bug Fixes

* **monorepo:** 🐛 enforce gpg signing checks for copilot commits ([#75](https://github.com/JimmyPaolini/monorepo/issues/75)) ([2f5c636](https://github.com/JimmyPaolini/monorepo/commit/2f5c6361cc2963dead6ad0d51832449c63bc3223))

### ♻️ Code Refactoring

* **conformance:** ♻️ refactor modules and add command option routing ([#82](https://github.com/JimmyPaolini/monorepo/issues/82)) ([4a4083a](https://github.com/JimmyPaolini/monorepo/commit/4a4083acc8e47e0b4d71bfde113ff681819d6ad8))
* **monorepo:** ♻️ migrate sync scripts to synchronization tool ([#80](https://github.com/JimmyPaolini/monorepo/issues/80)) ([3ea7081](https://github.com/JimmyPaolini/monorepo/commit/3ea7081789a3cfe19477bb6a86612cc6a4218a8c))
* **monorepo:** ♻️ standardize orchestration and deduplicate modules ([#79](https://github.com/JimmyPaolini/monorepo/issues/79)) ([a42d349](https://github.com/JimmyPaolini/monorepo/commit/a42d34955f0a943b4071a7a43644c7f726738e37))

### 📦 Build System

* **dependencies:** ⬆️ upgrade nx to version 23 ([#73](https://github.com/JimmyPaolini/monorepo/issues/73)) ([94b51bb](https://github.com/JimmyPaolini/monorepo/commit/94b51bb09c2011e069df142bfb5b68f3f8295286))
* **deps:** bump the uv group across 1 directory with 3 updates ([#76](https://github.com/JimmyPaolini/monorepo/issues/76)) ([245b3f5](https://github.com/JimmyPaolini/monorepo/commit/245b3f591a024fbfa9611e0803953c7d0fd59056))

## [1.11.0](https://github.com/JimmyPaolini/monorepo/compare/v1.10.4...v1.11.0) (2026-06-18)

### ✨ Features

* **conformance:** ✨ add nestjs service files conformance generator ([#70](https://github.com/JimmyPaolini/monorepo/issues/70)) ([944a965](https://github.com/JimmyPaolini/monorepo/commit/944a9650b9691879f4bf77541d88e1ad1189c7b7))

## [1.10.4](https://github.com/JimmyPaolini/monorepo/compare/v1.10.3...v1.10.4) (2026-06-18)

### 📦 Build System

* **deps:** bump the uv group across 1 directory with 5 updates ([#71](https://github.com/JimmyPaolini/monorepo/issues/71)) ([f288501](https://github.com/JimmyPaolini/monorepo/commit/f28850113f99aa5209a66dbda7bcf35f29171803))

## [1.10.3](https://github.com/JimmyPaolini/monorepo/compare/v1.10.2...v1.10.3) (2026-06-18)

### 📦 Build System

* **deps:** bump @apollo/server from 4.13.0 to 5.5.1 in /tools/conformance/src/generators/nestjs-graphql-application/templates in the npm_and_yarn group across 1 directory ([#64](https://github.com/JimmyPaolini/monorepo/issues/64)) ([75096e3](https://github.com/JimmyPaolini/monorepo/commit/75096e3662e9244597f8fa0cda1762b834e5a528))
* **deps:** bump tornado from 6.5.5 to 6.5.6 in /applications/affirmations in the uv group across 1 directory ([#67](https://github.com/JimmyPaolini/monorepo/issues/67)) ([dd76687](https://github.com/JimmyPaolini/monorepo/commit/dd76687045235ac7c55d2b9bff97222b3a0724fa))

## [1.10.2](https://github.com/JimmyPaolini/monorepo/compare/v1.10.1...v1.10.2) (2026-06-18)

### ♻️ Code Refactoring

* **monorepo:** ♻️ standardize naming and lint configuration ([#69](https://github.com/JimmyPaolini/monorepo/issues/69)) ([6306eb6](https://github.com/JimmyPaolini/monorepo/commit/6306eb6cbe5e12d4e29fcb00a0d2ae960ccb7a9e))

## [1.10.1](https://github.com/JimmyPaolini/monorepo/compare/v1.10.0...v1.10.1) (2026-06-13)

### 📝 Documentation

* **documentation:** 📝 add proactive code validation skills and workflow gates ([#66](https://github.com/JimmyPaolini/monorepo/issues/66)) ([db88dfe](https://github.com/JimmyPaolini/monorepo/commit/db88dfe7679cf3ec212db9475613d8e82e2664f0))

### 📦 Build System

* **deps:** ⬆️ bump aiohttp from 3.13.5 to 3.14.0 in /applications/affirmations in the uv group across 1 directory ([#57](https://github.com/JimmyPaolini/monorepo/issues/57)) ([bc8a31e](https://github.com/JimmyPaolini/monorepo/commit/bc8a31e77c3e39bcba086156d9c896dfa7601317))

## [1.10.0](https://github.com/JimmyPaolini/monorepo/compare/v1.9.0...v1.10.0) (2026-06-12)

### ✨ Features

* **lexico-ingestion:** ✨ implement multi-provider literature ingestion system ([#65](https://github.com/JimmyPaolini/monorepo/issues/65)) ([7a83390](https://github.com/JimmyPaolini/monorepo/commit/7a83390732bb0b70bccbab02aa1551da6e79f922))

## [1.9.0](https://github.com/JimmyPaolini/monorepo/compare/v1.8.0...v1.9.0) (2026-06-09)

### ✨ Features

* **conformance:** ✨ add nestjs-graphql-application and supporting generators ([#63](https://github.com/JimmyPaolini/monorepo/issues/63)) ([4b07c18](https://github.com/JimmyPaolini/monorepo/commit/4b07c188b6cf93d87f256e9aa4e9725d0781752a))

## [1.8.0](https://github.com/JimmyPaolini/monorepo/compare/v1.7.0...v1.8.0) (2026-06-08)

### ✨ Features

* **conformance:** ✨ add python conformance validators for json, markdown, notebook, text, and python files ([#58](https://github.com/JimmyPaolini/monorepo/issues/58)) ([940342c](https://github.com/JimmyPaolini/monorepo/commit/940342c67720a386a99ac50f07182a6a3595da0a))

## [1.7.0](https://github.com/JimmyPaolini/monorepo/compare/v1.6.0...v1.7.0) (2026-06-08)

### ✨ Features

* **conformance:** ✨ add nestjs-graphql-module generator ([#59](https://github.com/JimmyPaolini/monorepo/issues/59)) ([3e84ceb](https://github.com/JimmyPaolini/monorepo/commit/3e84ceb2f1c80486a91450e3aa1b03d4aef3f87e))

## [1.6.0](https://github.com/JimmyPaolini/monorepo/compare/v1.5.0...v1.6.0) (2026-06-04)

### ✨ Features

* **conformance:** ✨ add NestJS REPL entry point to nestjs-command-application generator ([#60](https://github.com/JimmyPaolini/monorepo/issues/60)) ([f263bf4](https://github.com/JimmyPaolini/monorepo/commit/f263bf4ea8e950376128eacc33da3cce394e1d0e)), closes [#56](https://github.com/JimmyPaolini/monorepo/issues/56)

## [1.5.0](https://github.com/JimmyPaolini/monorepo/compare/v1.4.0...v1.5.0) (2026-06-03)

### ✨ Features

* **conformance:** ✨ add jupyter-notebook-application Nx generator ([#52](https://github.com/JimmyPaolini/monorepo/issues/52)) ([236c9f1](https://github.com/JimmyPaolini/monorepo/commit/236c9f1cbb1579a8090c3ed12e56177f2fa8ab4e))

## [1.4.0](https://github.com/JimmyPaolini/monorepo/compare/v1.3.2...v1.4.0) (2026-06-03)

### ✨ Features

* **lexico:** ✨ add ingestion CLI app with typeorm entities package ([#53](https://github.com/JimmyPaolini/monorepo/issues/53)) ([7048b03](https://github.com/JimmyPaolini/monorepo/commit/7048b03be32c6477a5acbbc4fe59c66fd930622c))

### ♻️ Code Refactoring

* **conformance:** ♻️ centralize template conformance with auto-discovery ([#54](https://github.com/JimmyPaolini/monorepo/issues/54)) ([c69e136](https://github.com/JimmyPaolini/monorepo/commit/c69e136d6ca24c808b80c63ba841467e195b0e46))

## [1.3.2](https://github.com/JimmyPaolini/monorepo/compare/v1.3.1...v1.3.2) (2026-05-29)

### ♻️ Code Refactoring

* **caelundas:** 🔨 move module-level functions/constants into classes as instance methods ([#51](https://github.com/JimmyPaolini/monorepo/issues/51)) ([e659f0b](https://github.com/JimmyPaolini/monorepo/commit/e659f0b698cb06ef7aada42cf03d4ac3fb314dd3))

## [1.3.1](https://github.com/JimmyPaolini/monorepo/compare/v1.3.0...v1.3.1) (2026-05-29)

### 📦 Build System

* **affirmations:** 📦 upgrade python from 3.11 to 3.14 ([#45](https://github.com/JimmyPaolini/monorepo/issues/45)) ([2778fe4](https://github.com/JimmyPaolini/monorepo/commit/2778fe411082a48096258927d497743c2a4b9a4e))

## [1.3.0](https://github.com/JimmyPaolini/monorepo/compare/v1.2.7...v1.3.0) (2026-05-29)

### ✨ Features

* **conformance:** ✨ add nestjs-command-application generator for NestJS CLI scaffolding ([#44](https://github.com/JimmyPaolini/monorepo/issues/44)) ([bb3fd72](https://github.com/JimmyPaolini/monorepo/commit/bb3fd72ff2541781e674fca955034f8b3bb5d6e5))

### 🐛 Bug Fixes

* **configuration:** 🐛 add bash shebang to pre-commit hook ([#46](https://github.com/JimmyPaolini/monorepo/issues/46)) ([8d37d1b](https://github.com/JimmyPaolini/monorepo/commit/8d37d1b3cae09d52f2cf81099581eb12c5407c73))
* **configuration:** 🐛 make pre-commit hook posix sh-compatible ([#47](https://github.com/JimmyPaolini/monorepo/issues/47)) ([78372d5](https://github.com/JimmyPaolini/monorepo/commit/78372d5f5406fae5cead955c0b4bf75163bda459))

## [1.2.7](https://github.com/JimmyPaolini/monorepo/compare/v1.2.6...v1.2.7) (2026-05-25)

### 📦 Build System

* **deps:** bump the uv group across 1 directory with 14 updates ([#42](https://github.com/JimmyPaolini/monorepo/issues/42)) ([75828bb](https://github.com/JimmyPaolini/monorepo/commit/75828bbf3c1d6eba0cc65644a59dfc6877a81c3c))

## [1.2.6](https://github.com/JimmyPaolini/monorepo/compare/v1.2.5...v1.2.6) (2026-05-25)

### ♻️ Code Refactoring

* **tools:** ♻️ rename code-generator to conformance ([#40](https://github.com/JimmyPaolini/monorepo/issues/40)) ([c6a09a1](https://github.com/JimmyPaolini/monorepo/commit/c6a09a11da46bfe5114978352f3bfec0728ab787))

## [1.2.5](https://github.com/JimmyPaolini/monorepo/compare/v1.2.4...v1.2.5) (2026-05-25)

### ♻️ Code Refactoring

* **code-generator:** ♻️ migrate template rendering from ejs to mustache ([#37](https://github.com/JimmyPaolini/monorepo/issues/37)) ([79008c8](https://github.com/JimmyPaolini/monorepo/commit/79008c8cb92bdec6cfe8791d3ee6a350c9fd3b8b))

## [1.2.4](https://github.com/JimmyPaolini/monorepo/compare/v1.2.3...v1.2.4) (2026-05-25)

### 📝 Documentation

* **documentation:** 📝 expand git workflow with full branch, commit, and pr conventions ([#36](https://github.com/JimmyPaolini/monorepo/issues/36)) ([a14565a](https://github.com/JimmyPaolini/monorepo/commit/a14565acd97e7487c61704464ff66d6560ea37bf))
* **documentation:** 📝 fix outdated documentation across skills and projects ([#35](https://github.com/JimmyPaolini/monorepo/issues/35)) ([28aa035](https://github.com/JimmyPaolini/monorepo/commit/28aa035cbd38035ea607a3dc1e1aa6572ed2ad9e))

### ♻️ Code Refactoring

* **deployments:** ♻️ move devcontainer resource config to docker-compose.yml ([#39](https://github.com/JimmyPaolini/monorepo/issues/39)) ([39a543d](https://github.com/JimmyPaolini/monorepo/commit/39a543d189df41a2304c189242e99ea9adec93ee))

## [1.2.3](https://github.com/JimmyPaolini/monorepo/compare/v1.2.2...v1.2.3) (2026-05-25)

### 🐛 Bug Fixes

* **monorepo:** 🐛 replace removed gitleaks devcontainer feature with direct binary install ([#34](https://github.com/JimmyPaolini/monorepo/issues/34)) ([865c4c2](https://github.com/JimmyPaolini/monorepo/commit/865c4c2e5d7eabec1b91962b5cc8149b34bdafc7))

## [1.2.2](https://github.com/JimmyPaolini/monorepo/compare/v1.2.1...v1.2.2) (2026-05-25)

### 🐛 Bug Fixes

* **infrastructure:** 🐛 resolve devcontainer .env file resolution in ci ([#33](https://github.com/JimmyPaolini/monorepo/issues/33)) ([ad435df](https://github.com/JimmyPaolini/monorepo/commit/ad435df421afa875f5f2d8f0693961bcc86f5dd4)), closes [#26375211448](https://github.com/JimmyPaolini/monorepo/issues/26375211448)

### 📝 Documentation

* **documentation:** 🗑️ remove mcp-github skill and prefer gh cli ([#32](https://github.com/JimmyPaolini/monorepo/issues/32)) ([ce28d31](https://github.com/JimmyPaolini/monorepo/commit/ce28d31b409374a0809b0f45e117679d7ca6a5ca))

## [1.2.1](https://github.com/JimmyPaolini/monorepo/compare/v1.2.0...v1.2.1) (2026-05-24)

### 🐛 Bug Fixes

* **deployments:** 🐛 remove cacheTo from devcontainer and sync configs ([#30](https://github.com/JimmyPaolini/monorepo/issues/30)) ([5496e9e](https://github.com/JimmyPaolini/monorepo/commit/5496e9e28adfa25a283aa98ef56d0d860c1b7169))

## [1.2.0](https://github.com/JimmyPaolini/monorepo/compare/v1.1.1...v1.2.0) (2026-05-23)

### ✨ Features

* **tools:** ✨ add nestjs-service-module generator ([#25](https://github.com/JimmyPaolini/monorepo/issues/25)) ([f1ace47](https://github.com/JimmyPaolini/monorepo/commit/f1ace476ac842e71a5c608c09ea76913c7a9b684))

### ♻️ Code Refactoring

* **caelundas:** ♻️ nest-commander module reorganization and performance optimizations ([#22](https://github.com/JimmyPaolini/monorepo/issues/22)) ([15a8dc0](https://github.com/JimmyPaolini/monorepo/commit/15a8dc03971ca1c9477c71ba66e400df368f3a7c))

## [1.1.1](https://github.com/JimmyPaolini/monorepo/compare/v1.1.0...v1.1.1) (2026-04-22)

### ♻️ Code Refactoring

- **configuration:** ♻️ rename py-test target to pytest and clean up tsconfig baseUrl ([#20](https://github.com/JimmyPaolini/monorepo/issues/20)) ([3e2dd71](https://github.com/JimmyPaolini/monorepo/commit/3e2dd71876f53fdae46bd0a82c0b7cbbbeb392e2))

## [1.1.0](https://github.com/JimmyPaolini/monorepo/compare/v1.0.0...v1.1.0) (2026-04-14)

### ✨ Features

- **affirmations:** 🚀 build affirmation application in python with langchain and ollama ([#19](https://github.com/JimmyPaolini/monorepo/issues/19)) ([595c0af](https://github.com/JimmyPaolini/monorepo/commit/595c0afcc850a2eff0cf9dcc01858f2098ddd01e))

## 1.0.0 (2026-02-27)

### ✨ Features

- ✨ add caelundas ([2189b7d](https://github.com/JimmyPaolini/monorepo/commit/2189b7ddc1728a9511b32f1ac466e4801f8f1014))
- ✨ add gitmodule JimmyPaolini ([ad6eae5](https://github.com/JimmyPaolini/monorepo/commit/ad6eae57e7d83903d63ea06e2ff83938248071df))
- ✨ add top level nx targets ([a107528](https://github.com/JimmyPaolini/monorepo/commit/a1075287ff81fa98b6f486a5e82bcdcda0955009))
- ✨ caelundas kubernetes job running ([fd3896a](https://github.com/JimmyPaolini/monorepo/commit/fd3896a6dee7c5e2cafa3abc3842d37da0bc3140))
- ✨ caelundas running as a node app ([9d6022c](https://github.com/JimmyPaolini/monorepo/commit/9d6022cdd1488f43f4643469e0347704f8880153))
- ✨ duration events ([1179f57](https://github.com/JimmyPaolini/monorepo/commit/1179f57de3e9f7a4ec088ed7366aeae0c7cd33fe))
- ✨ ephemeris service enhancements ([65783ae](https://github.com/JimmyPaolini/monorepo/commit/65783aeb8f6c716bd3b6f7d074413e73317c13c5))
- ✨ insert ephemeris values when fetched ([b4c7540](https://github.com/JimmyPaolini/monorepo/commit/b4c75407643ea0ff3af9a6525c365c12f69bb86c))
- ✨ list and copy scripts ([d233c30](https://github.com/JimmyPaolini/monorepo/commit/d233c3040eaa3795b751dcac335cd0b2c6ca27e4))
- ✨ multibody aspects ([5deb65d](https://github.com/JimmyPaolini/monorepo/commit/5deb65d47a57c19a4f7ca4c908507dfe24149f78))
- ✨ multiple refactors and improvements, removing dead code ([17a9594](https://github.com/JimmyPaolini/monorepo/commit/17a9594de253f59d06c9af670615cf7417d71a6c))
- ✨ retry logic, job running ([8f610b7](https://github.com/JimmyPaolini/monorepo/commit/8f610b79f1b059993333e31e3d412494fabb31bd))
- ✨ return to normal logging ([c78dd53](https://github.com/JimmyPaolini/monorepo/commit/c78dd53366b72b6118b5c23417bbb1dbac874c40))
- ✨ running new version ([2dd1000](https://github.com/JimmyPaolini/monorepo/commit/2dd10009a8968b5482685312781ffda86594f4b9))
- ✨ setup monorepo, import linode lke, import caelundas ([f2a95a1](https://github.com/JimmyPaolini/monorepo/commit/f2a95a11e3bdfab4b10c0ea00e36bc0d4c99f761))
- ✨ simplify compound aspects ([d59a116](https://github.com/JimmyPaolini/monorepo/commit/d59a116f76b00290d1ca4120bfcff149a7898bce))
- 🚧 compound aspects, other refactors ([cb91a0e](https://github.com/JimmyPaolini/monorepo/commit/cb91a0ed49b50dacb358ded6362f36887ad42f00))
- 🚧 wip migrating caelundas to node ([b7a15e8](https://github.com/JimmyPaolini/monorepo/commit/b7a15e84daec117b0691911d9bfae75ba8b8f44a))
- **configuration:** 🔧 add static analysis tools and comprehensive documentation ([#10](https://github.com/JimmyPaolini/monorepo/issues/10)) ([d1d3799](https://github.com/JimmyPaolini/monorepo/commit/d1d3799a9387064d5de251887a46b4c97d0937dd))
- **database:** ✨ initialize database and create ephemeris and events tables ([f211cf7](https://github.com/JimmyPaolini/monorepo/commit/f211cf7ec39b700138813f104e0d46b4e1b717e6))
- **format:** 🎨 add Prettier formatting commands and GitHub Actions workflow ([3f6d006](https://github.com/JimmyPaolini/monorepo/commit/3f6d0064719893cbca4bac7a73cc2fe176f4a32f))
- **infrastructure:** 🏗 implement devcontainer and enhance developer tooling ([#3](https://github.com/JimmyPaolini/monorepo/issues/3)) ([329e746](https://github.com/JimmyPaolini/monorepo/commit/329e746e983bd854771475bff5d9df48f35f377c))
- **lexico-components:** 🎨 add all shadcn components ([84fb0c6](https://github.com/JimmyPaolini/monorepo/commit/84fb0c6639228acb2adcc3d3b1f963adc18877ca))
- **lexico-components:** 🎨 add more components, use more shadcn defaults ([ec5f3da](https://github.com/JimmyPaolini/monorepo/commit/ec5f3dac31cc400480d6a00b14b16a39426bfdb2))
- **lexico:** ✨ add skeleton, tooltip, sheet, and sidebar components ([64e52fa](https://github.com/JimmyPaolini/monorepo/commit/64e52fa3be92ef0d87985e113d313633c3f67560))
- **lexico:** ✨ initialize Supabase configuration and database schema ([9ed3fe3](https://github.com/JimmyPaolini/monorepo/commit/9ed3fe328cc047bd1cb172f5a0d3349f37877fdf))
- **lexico:** ✨ lexico migration 1 ([30cdf00](https://github.com/JimmyPaolini/monorepo/commit/30cdf00af84e7d70b895b264bb33aa8f1ffdd77d))
- **lexico:** ✨ lexico migration 2 ([0ce5eb7](https://github.com/JimmyPaolini/monorepo/commit/0ce5eb77b7c18f8bdcbf076ea021e1c6dd8d1c30))
- **lexico:** ✨ migration 3 ([3114c98](https://github.com/JimmyPaolini/monorepo/commit/3114c98e7eafe46a746be4c9f1da9b4296cf361c))
- **lexico:** ✨ update styles and components for improved accessibility and design ([4dcfdcd](https://github.com/JimmyPaolini/monorepo/commit/4dcfdcd76e98bc7ecf3d6a0faee2a749bfc1eaa4))
- **lexico:** 🏗 scaffold lexico and lexico-components ([b7f08b3](https://github.com/JimmyPaolini/monorepo/commit/b7f08b314d23efe9168d81b6ee60f1f7ce0aa5a8))
- **lexico:** 💄 styling entry card ([8e32d09](https://github.com/JimmyPaolini/monorepo/commit/8e32d0973fbb0235cfbae543efc7a9b14ef718fe))
- **monorepo:** ✨ add comprehensive code analysis tooling ([#2](https://github.com/JimmyPaolini/monorepo/issues/2)) ([60fefb5](https://github.com/JimmyPaolini/monorepo/commit/60fefb5e8bb27e8463a45cbbb3038cc85e12ed6b))
- **monorepo:** ✨ enhance fetch utilities tests with improved timer handling ([827b907](https://github.com/JimmyPaolini/monorepo/commit/827b907a7239a13e18bc967d9e6ea8d27c730639))
- **monorepo:** 👷 implement component generator ([8149c27](https://github.com/JimmyPaolini/monorepo/commit/8149c2755a4f98fa53bb65522c8ae56305f71adf))

### 🐛 Bug Fixes

- 🐛 delete Persistent Volume before uninstall ([05a7e65](https://github.com/JimmyPaolini/monorepo/commit/05a7e650aa459889f4ee1945b7f5369e30474b72))
- 🐛 moon phase bug ([d7ef67b](https://github.com/JimmyPaolini/monorepo/commit/d7ef67b4166a0b44053956a3bdd602fb54d38c40))
- 🐛 output ([b06b2ca](https://github.com/JimmyPaolini/monorepo/commit/b06b2cab4950d9ce5bb5cdee96ae83a740c6f9c3))
- 🐛 parametrize timezone in ephemeris methods ([a65c579](https://github.com/JimmyPaolini/monorepo/commit/a65c57915fdcfa61a26d1ae6ba4a78655227d33c))
- 🔥 remove git submodule ([164cb8d](https://github.com/JimmyPaolini/monorepo/commit/164cb8d0c89e2041fd684b52203b8dfaa104ff7e))
- 🚨 lint fix first pass ([b869fc7](https://github.com/JimmyPaolini/monorepo/commit/b869fc78c2e68052e0d27fc64e9c2c3515f6919a))
- **aspect:** 🐛 ensure absolute difference calculation for aspect comparison ([65b512f](https://github.com/JimmyPaolini/monorepo/commit/65b512f38e94a799bf82a2ec441f0c84318df363))
- **caelundas:** 🏷️ typecheck tests ([06d97c6](https://github.com/JimmyPaolini/monorepo/commit/06d97c65a29c49297f8cdf64aed01886b23e21e7))
- **configuration:** 🔧 enhance devcontainer setup and developer workspace configuration ([#6](https://github.com/JimmyPaolini/monorepo/issues/6)) ([99bb9ef](https://github.com/JimmyPaolini/monorepo/commit/99bb9eff42b5f32f6241263bceb85f738d53db1f))
- **env:** 🔧 update output directory configuration in environment files ([feebea4](https://github.com/JimmyPaolini/monorepo/commit/feebea4e1c1cab5b730c78457b31776fc2cd3694))
- **eslint:** 🔧 update tsconfigRootDir to use \_\_dirname for correct path resolution ([4a8ac29](https://github.com/JimmyPaolini/monorepo/commit/4a8ac29487ea30cc77cf347d71ad71a2b381d4f6))
- **lexico:** ✨ typechecks ([2a7e442](https://github.com/JimmyPaolini/monorepo/commit/2a7e442cf384e1d2d9b65efe29a008f97277f238))
- **lexico:** 🐛 fix entry card styles and behavior WIP ([72ac100](https://github.com/JimmyPaolini/monorepo/commit/72ac100e71a4406c1cd38490a47d35f7b480e22c))
- **monorepo:** 🏷️ typecheck ([1946e10](https://github.com/JimmyPaolini/monorepo/commit/1946e108fd3a781c06b854afbb87a156d84059af))
- **monorepo:** 🚨 fix eslint config errors ([d51fead](https://github.com/JimmyPaolini/monorepo/commit/d51fead936a5ff4b60710a8cd068cf3f25c8d7a0))
- **monorepo:** 🚨 format, lint, typecheck ([44f8978](https://github.com/JimmyPaolini/monorepo/commit/44f89782e488b9d497005d476c203454a5e37d45))
- **persistence:** 🔧 update mountPath for data storage to /app/output ([427f9e6](https://github.com/JimmyPaolini/monorepo/commit/427f9e60d1c5a37c85830257504a2fc988ae09d5))
- **quadruple:** 🐛 update summary regex to correctly handle multiple symbols ([8daabdc](https://github.com/JimmyPaolini/monorepo/commit/8daabdc88e5bea1d772631a0e8e81fe4bf9f0402))
- **tests:** 🐛 ensure output directory exists for integration tests ([93ccbe7](https://github.com/JimmyPaolini/monorepo/commit/93ccbe715898d92a73b3ab598d8800795e8c7a12))
- **tests:** 🐛 update test database paths for integration and unit tests ([3cba380](https://github.com/JimmyPaolini/monorepo/commit/3cba380ebbd65ae7587ae40e0199aab1cb6fb158))

### 📝 Documentation

- 📝 scripts and documentation ([08ac117](https://github.com/JimmyPaolini/monorepo/commit/08ac117dd77cd1d68152b20ea333ebf53875b82d))
- **documentation:** 📝 update planning prompts with improved structure and phase guidance ([#7](https://github.com/JimmyPaolini/monorepo/issues/7)) ([23c9813](https://github.com/JimmyPaolini/monorepo/commit/23c9813082d9847082d10b9b25fa0021eceb8fc0))
- **monorepo:** 📝 Add instruction files and update configuration ([#5](https://github.com/JimmyPaolini/monorepo/issues/5)) ([9ae05b8](https://github.com/JimmyPaolini/monorepo/commit/9ae05b89f78f02770fe1a46808016c4eef299963))
- **nx:** 📝 add general guidelines for working with Nx ([bf21acc](https://github.com/JimmyPaolini/monorepo/commit/bf21acc957e84f3b2f82807255a6a5b281aacde3))

### ♻️ Code Refactoring

- ♻️ ephemeris ([57b46b8](https://github.com/JimmyPaolini/monorepo/commit/57b46b858a3acd4bdd77367094c6bdc8619a7d82))
- ♻️ k8s scripts ([219a5b8](https://github.com/JimmyPaolini/monorepo/commit/219a5b8384768f8031673838d93389099cdd21f2))
- ♻️ refactor output ([9915052](https://github.com/JimmyPaolini/monorepo/commit/99150524e0f5cc8c749433180a18c9b9835fd53e))
- ♻️ refactor script utilities ([63ad71e](https://github.com/JimmyPaolini/monorepo/commit/63ad71e461779ece2ef79ff4f9954c6e92e37225))
- ♻️ remove configurable inputs ([4be923d](https://github.com/JimmyPaolini/monorepo/commit/4be923d422f76cd6fbecb9bf3f1bcbcb550261ae))
- ♻️ script improvements ([ec679cc](https://github.com/JimmyPaolini/monorepo/commit/ec679cc5a8a4dd528de61afa60a9b442c411ac8b))
- ♻️ use tz-lookup for timezones ([16f9132](https://github.com/JimmyPaolini/monorepo/commit/16f9132f379dca29db80d17023cb5a5a6c9eb820))
- 🎨 formatting ([8c7927b](https://github.com/JimmyPaolini/monorepo/commit/8c7927b9dbdf719874fed3618b33b75889a4b725))
- 🚚 move files, bash utilities ([568e96c](https://github.com/JimmyPaolini/monorepo/commit/568e96c7d68e707bb7b831b71b03ab9b39c1c7cb))
- 🚚 rename kubernetes scripts ([dbf8abf](https://github.com/JimmyPaolini/monorepo/commit/dbf8abfad16022e7841a21e59eb3a87b374c4cee))
- **helm:** ♻️ improve persistent volume deletion logic in uninstall script ([7201b75](https://github.com/JimmyPaolini/monorepo/commit/7201b75a7fc30443693b0915d83764b2545d8906))
- **helm:** ♻️ rename helm-deploy to helm-upgrade and update script path ([2b92772](https://github.com/JimmyPaolini/monorepo/commit/2b92772b9e54b745966b3e266f5f1c358cfbcb6a))
- **monorepo:** ♻️ nx targets ([ea6155e](https://github.com/JimmyPaolini/monorepo/commit/ea6155e35fa5e0be628a97d2f3929927def548be))
- **monorepo:** ♻️ update markdown-lint command to use --configuration=write ([24e0e62](https://github.com/JimmyPaolini/monorepo/commit/24e0e627a8b5ac042256914365408c6d76a0fd0a))
- trigger lockfile check for any package.json or workspace config change ([88b50f0](https://github.com/JimmyPaolini/monorepo/commit/88b50f065bafecb307aeaaf85ee1e9e5abe297e4))

### 📦 Build System

- **configuration:** 🔧 switch devcontainer from node to root user for git worktree support ([#8](https://github.com/JimmyPaolini/monorepo/issues/8)) ([b9f8f52](https://github.com/JimmyPaolini/monorepo/commit/b9f8f525bcda2ab3f3e29aa8667c2bdd1b847719))
