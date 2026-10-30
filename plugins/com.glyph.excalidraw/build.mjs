// Builds assets/excalidraw.js from src/: Excalidraw, React, lz-string, and
// DOMPurify in one ES module, and LICENSE with their notices. Glyph renders
// offline, so everything Excalidraw would load from a URL is inlined here.
//
//   npm ci --ignore-scripts && npm run build

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, "node_modules/@excalidraw/excalidraw/dist/prod");

// Glyph's languages besides English, which Excalidraw has built in. Any other
// locale resolves to an empty bundle, and Excalidraw falls back to English.
const LOCALES = ["de-DE", "es-ES", "fa-IR", "zh-CN"];

// The CJK hand-drawn font is about 13 MB. It gets Excalidraw's own `local:`
// marker, which loads no URL, so CJK text uses a system font and nothing falls
// back to Excalidraw's CDN.
const SKIPPED_FONTS = new Set(["Xiaolai"]);

const FONT_URI = /"\.\/fonts\/([^/"]+)\/([^"/]+\.woff2)"/g;

function inlineFonts(source) {
  let count = 0;
  const output = source.replace(FONT_URI, (_, family, file) => {
    count++;
    if (SKIPPED_FONTS.has(family)) return JSON.stringify(`local:${family}`);
    const bytes = readFileSync(join(dist, "fonts", family, file));
    return JSON.stringify(`data:font/woff2;base64,${bytes.toString("base64")}`);
  });
  return { output, count };
}

/** Excalidraw's stylesheet as text, its UI font inlined. */
async function buildEditorCss() {
  const result = await esbuild.build({
    entryPoints: [join(dist, "index.css")],
    bundle: true,
    minify: true,
    write: false,
    loader: { ".woff2": "dataurl" },
  });
  return result.outputFiles[0].text;
}

function offlineAssets(editorCss) {
  let inlined = 0;
  return {
    name: "offline-assets",
    setup(build) {
      build.onResolve({ filter: /^excalidraw-editor-css$/ }, () => ({
        path: "editor.css",
        namespace: "editor-css",
      }));
      build.onLoad({ filter: /.*/, namespace: "editor-css" }, () => ({
        contents: editorCss,
        loader: "text",
      }));

      // Converting Mermaid to a drawing (a dialog, and pasting Mermaid text)
      // would bundle Mermaid itself, about 3 MB; it fails with a message
      // instead. Glyph renders ```mermaid blocks on its own.
      build.onResolve({ filter: /^@excalidraw\/mermaid-to-excalidraw$/ }, () => ({
        path: "mermaid-to-excalidraw",
        namespace: "no-mermaid",
      }));
      build.onLoad({ filter: /.*/, namespace: "no-mermaid" }, () => ({
        contents:
          'export async function parseMermaidToExcalidraw() { throw new Error("Mermaid is not available in this editor"); }',
        loader: "js",
      }));

      build.onResolve({ filter: /^\.\/locales\// }, (args) => {
        if (LOCALES.some((locale) => args.path.startsWith(`./locales/${locale}-`))) return null;
        return { path: args.path, namespace: "skipped-locale" };
      });
      build.onLoad({ filter: /.*/, namespace: "skipped-locale" }, () => ({
        contents: "export default {};",
        loader: "js",
      }));

      build.onLoad({ filter: /[\\/]@excalidraw[\\/]excalidraw[\\/]dist[\\/]prod[\\/][^\\/]+\.js$/ }, (args) => {
        const { output, count } = inlineFonts(readFileSync(args.path, "utf8"));
        inlined += count;
        return { contents: output, loader: "js" };
      });

      build.onEnd(() => {
        // A new Excalidraw that names its fonts differently would otherwise
        // ship a bundle that quietly fetches them from the CDN.
        if (inlined === 0) throw new Error("no Excalidraw font URLs were inlined");
      });
    },
  };
}

function licenseText(name) {
  const dir = join(here, "node_modules", name);
  const file = readdirSync(dir).find((entry) => /^(licen[cs]e|copying)/i.test(entry));
  if (file) return readFileSync(join(dir, file), "utf8");
  // Published without its license file; the text is kept in src/licenses/.
  for (const candidate of [name.replace("/", "__"), name.split("/")[0]]) {
    const path = join(here, "src/licenses", `${candidate}.txt`);
    if (existsSync(path)) return readFileSync(path, "utf8");
  }
  throw new Error(`no license text for ${name}; add src/licenses/${name.replace("/", "__")}.txt`);
}

const RULE = "=".repeat(72);

// LICENSE carries the notice of every package esbuild put in the bundle, and
// of the inlined fonts, so it cannot fall behind a dependency update.
function writeNotices(metafile) {
  const names = new Set();
  for (const input of Object.keys(metafile.inputs)) {
    const name = /node_modules[\\/]((?:@[^\\/]+[\\/])?[^\\/]+)/.exec(input)?.[1].replace("\\", "/");
    if (name) names.add(name);
  }
  // Packages that share a license text (React's, Radix's) share an entry.
  const byText = new Map();
  for (const name of [...names].sort()) {
    const { version } = JSON.parse(readFileSync(join(here, "node_modules", name, "package.json"), "utf8"));
    const text = licenseText(name).replace(/\r\n/g, "\n").trim();
    byText.set(text, [...(byText.get(text) ?? []), `${name} ${version}`]);
  }
  const sections = [...byText].map(([text, packages]) => [RULE, ...packages, RULE, "", text].join("\n"));
  const fonts = readFileSync(join(here, "src/licenses/fonts.txt"), "utf8").replace(/\r\n/g, "\n").trim();
  const notices = [
    "Third-party notices for assets/excalidraw.js. Written by build.mjs from the",
    "packages the bundle includes; do not edit by hand.",
    "",
    ...sections.flatMap((section) => [section, ""]),
    [RULE, "Fonts", RULE, "", fonts].join("\n"),
    "",
  ].join("\n");
  writeFileSync(join(here, "LICENSE"), notices);
}

const result = await esbuild.build({
  entryPoints: [join(here, "src/excalidraw.jsx")],
  outfile: join(here, "assets/excalidraw.js"),
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  jsx: "automatic",
  conditions: ["production"],
  define: { "process.env.NODE_ENV": '"production"' },
  inject: [join(here, "src/offlineFetch.js")],
  legalComments: "eof",
  metafile: true,
  plugins: [offlineAssets(await buildEditorCss())],
  logLevel: "info",
});
writeNotices(result.metafile);
