# Bundling

A plugin ships as **one** `main.js`, but you don't write it as one file. Split your source into as many modules as you want and bundle them. The app imports exactly one file (a `data:` URL import can't resolve relative imports), so bundling is how multi-file plugins work, the same model Obsidian and VS Code use.

## esbuild

The [template](https://github.com/glyph-md/plugin-template) is set up with [esbuild](https://esbuild.github.io):

```bash
esbuild src/main.ts --bundle --format=esm --outfile=main.js --minify
```

That inlines every local `import` into `main.js`. Assets go in the same bundle, no second file to host:

```bash
# CSS as an injected string, images as data URIs
esbuild src/main.ts --bundle --format=esm --outfile=main.js \
  --loader:.css=text --loader:.png=dataurl
```

## Large libraries

`main.js` loads when the app starts, so keep it small. Ship a large library as a second file listed in the manifest's `files`, and import it the first time a document needs it:

```js
const source = await ctx.assets.readText("assets/library.js");
const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
const library = await import(url);
URL.revokeObjectURL(url);
```

The [Slides](https://github.com/glyph-md/plugins/tree/main/plugins/com.glyph.slides) plugin loads reveal.js this way, and [Excalidraw](https://github.com/glyph-md/plugins/tree/main/plugins/com.glyph.excalidraw) loads its editor. Glyph works offline, and its CSP has no `data:` in `connect-src`, so inline whatever the library would fetch at run time (fonts, locales, WebAssembly). Excalidraw's `build.mjs` shows how.

## Rules

- **Output a single ES module** that default-exports `{ activate }`.
- **Don't bundle Glyph internals.** The host provides what you need through `ctx`. (When the API hands you a host object you'd otherwise import, mark it `--external`.)
- **Bundle React only for a root of your own.** The host does not share its React, so a plugin built on a React library (Excalidraw is one) bundles its own and renders into an element the host hands it with `createRoot(el)`, unmounting in a cleanup.
- **Keep it readable.** `--minify` is fine; obfuscation will be rejected in marketplace review.
- The type-only `import type { ... } from "glyph"` is dropped by the bundler. There's no runtime `glyph` package; the types come from `types/glyph.d.ts` in the template.
