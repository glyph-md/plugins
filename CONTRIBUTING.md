# Contributing a plugin

The marketplace registers each plugin as one folder: `plugins/<id>/` holding a `plugin.json` (the registration) and a `README.md` (the catalog page shown to users). To list or update a plugin you open a pull request that touches only your folder, so submissions never conflict. Your plugin's code stays in your own repository; [`index.json`](index.json) and the catalog are generated from the registrations on merge.

## Add a plugin

1. Build and publish your plugin in **your own repo** (start from the [plugin template](https://github.com/glyph-md/plugin-template) — click "Use this template"): a single ES module (`main.js`) that default-exports `{ activate(ctx) }`. Tag a release so the file has a stable, immutable URL.
2. Fork this repo and add `plugins/<your-id>/plugin.json`:

   ```json
   {
     "$schema": "../../plugin.schema.json",
     "id": "com.yourname.example",
     "name": "Example",
     "description": "What it does, in one line.",
     "version": "1.0.0",
     "apiVersion": "0.17.0",
     "category": "tools",
     "keywords": ["example"],
     "packageUrl": "https://github.com/yourname/glyph-example/releases/download/v1.0.0/plugin.zip",
     "sha256": "<hex digest of plugin.zip>"
   }
   ```

3. Add `plugins/<your-id>/README.md`: what the plugin does, its permissions, and any setup. This is the page users see in the marketplace details view.
4. Open a pull request. CI validates the registration against [`plugin.schema.json`](plugin.schema.json) (the folder name must equal the `id`) and rejects direct edits to the generated `index.json`/catalog.

## Multiple files and bundling

A plugin ships as **one** `main.js`, but you don't have to write it as one file. Split your source into as many modules as you want and **bundle** them into a single ES module before release. The app loads exactly one file (a `data:` URL import can't resolve relative imports), so bundling is how multi-file plugins work, the same model Obsidian and VS Code use.

With [esbuild](https://esbuild.github.io):

```bash
esbuild src/main.ts --bundle --format=esm --outfile=main.js --minify
```

That inlines every local `import` into `main.js`. Assets go in the same bundle, no second file to host:

```bash
# CSS as an injected string, images as data URIs
esbuild src/main.ts --bundle --format=esm --outfile=main.js \
  --loader:.css=text --loader:.png=dataurl
```

Notes:

- **Don't bundle React or the markdown pipeline.** Glyph provides those; when the API hands them to you, mark them `--external:react` (etc.) so there's one copy at runtime. The current API surface is DOM-based and needs no such externals.
- Keep the output readable enough to review, `--minify` is fine, obfuscation is not (see review criteria).
- Zip `manifest.json` plus the manifest-declared `files` (entry + assets), attach it to a tagged release, and point `packageUrl` at that asset with its `sha256` digest.

## Update a plugin

Cut a new release in your repo, then open a PR that bumps `version`, `packageUrl` (to the new tag), and `sha256` in your `plugins/<id>/plugin.json`. Glyph compares the index `version` against what each user has installed and offers an in-app update when they differ.

## Entry rules

| Field | Rule |
|---|---|
| `id` | Reverse-DNS, unique. Only letters, digits, `.`, `_`, `-`. It is the folder name here and the install folder name. |
| `name` | Short, human-readable. |
| `description` | One line, no trailing period needed. Optional but recommended. |
| `version` | Valid semver (`MAJOR.MINOR.PATCH`). Must increase when `packageUrl` changes. |
| `apiVersion` | The Glyph plugin-API version you built against (currently `0.17.0`); exact match required until 1.0. |
| `category` | One of `themes`, `markdown`, `exporters`, `tools`, `integrations`, `language`, `ai`. Drives the marketplace filter and the catalog grouping. |
| `packageUrl` | HTTPS URL to the release zip (manifest + declared files). **Pin it to a tag**, not a moving branch: the `sha256` digest is verified before install, and only the manifest-declared files are extracted. |

## Review criteria

A maintainer will check that:

- The registration validates against the schema, the folder name equals the `id`, and the README describes what users are trusting.
- `packageUrl` resolves to a zip whose root `manifest.json` declares `files`, and whose entry default-exports `{ activate }`.
- The code is readable (not obfuscated) so it can be reviewed.
- It doesn't bundle its own copy of React or the markdown pipeline (Glyph provides those).
- The plugin does what its `description` says and nothing surprising.

## Security

Plugins run inside Glyph with access mediated through the plugin context, there is no direct filesystem or shell access. Even so, **you are publishing code that other people will run.** Reviewers read the linked `main.js` before merging, and Glyph asks users to confirm before enabling a plugin. Don't submit code you didn't write or can't vouch for. To report a malicious entry, open an issue or email the address in Glyph's [SECURITY.md](https://github.com/hamidfzm/glyph/blob/main/SECURITY.md).
