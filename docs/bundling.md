# Bundling

A plugin ships as **one** `main.js`, but you don't write it as one file. Split your source into as many modules as you want and bundle them. The app imports exactly one file (a `data:` URL import can't resolve relative imports), so bundling is how multi-file plugins work — the same model Obsidian and VS Code use.

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

## Rules

- **Output a single ES module** that default-exports `{ activate }`.
- **Don't bundle React or Glyph internals.** The host provides what you need through `ctx`. (When the API hands you a host object you'd otherwise import, mark it `--external`.)
- **Keep it readable.** `--minify` is fine; obfuscation will be rejected in marketplace review.
- The type-only `import type { ... } from "glyph"` is dropped by the bundler — there's no runtime `glyph` package; the types come from `types/glyph.d.ts` in the template.
