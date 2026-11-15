// Builds assets/hunspell.js from src/ (hunspell-wasm's JavaScript in one ES
// module) and copies its WebAssembly binary to assets/hunspell.wasm.
//
//   npm ci --ignore-scripts && npm run build

import { copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));

await esbuild.build({
  entryPoints: [join(here, "src/hunspell.js")],
  outfile: join(here, "assets/hunspell.js"),
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  // Reached only when the engine runs under Node, as in this plugin's tests.
  external: ["module", "fs", "fs/promises", "path", "url", "crypto"],
  legalComments: "eof",
  logLevel: "info",
});

copyFileSync(
  join(here, "node_modules/hunspell-wasm/wasm/hunspell.wasm"),
  join(here, "assets/hunspell.wasm"),
);
