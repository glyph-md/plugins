# Contributing a plugin

The marketplace is just [`index.json`](index.json). To list or update a plugin you open a pull request that edits that one file. Your plugin's code stays in your own repository.

## Add a plugin

1. Build and publish your plugin in **your own repo** (start from the [plugin template](https://github.com/glyph-md/plugin-template) — click "Use this template"): a single ES module (`main.js`) that default-exports `{ activate(ctx) }`. Tag a release so the file has a stable, immutable URL.
2. Fork this repo and add an entry to the `plugins` array in `index.json`:

   ```json
   {
     "id": "com.yourname.example",
     "name": "Example",
     "description": "What it does, in one line.",
     "version": "1.0.0",
     "apiVersion": "^1.0.0",
     "packageUrl": "https://github.com/yourname/glyph-example/releases/download/v1.0.0/plugin.zip",
     "sha256": "<hex digest of plugin.zip>"
   }
   ```

3. Validate it against [`index.schema.json`](index.schema.json) (most editors do this automatically via the `$schema` key). Keep the array sorted by `id`.
4. Open a pull request.

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

Cut a new release in your repo, then open a PR that bumps `version`, `packageUrl` (to the new tag), and `sha256`. Glyph compares the index `version` against what each user has installed and offers an in-app update when they differ.

## Entry rules

| Field | Rule |
|---|---|
| `id` | Reverse-DNS, unique across the index. Only letters, digits, `.`, `_`, `-`. It becomes a folder name, so no slashes or spaces. |
| `name` | Short, human-readable. |
| `description` | One line, no trailing period needed. Optional but recommended. |
| `version` | Valid semver (`MAJOR.MINOR.PATCH`). Must increase when `packageUrl` changes. |
| `apiVersion` | A caret or exact range against the Glyph plugin API, e.g. `^1.0.0`. Glyph refuses to load a plugin whose range it doesn't satisfy. |
| `packageUrl` | HTTPS URL to the release zip (manifest + declared files). **Pin it to a tag**, not a moving branch: the `sha256` digest is verified before install, and only the manifest-declared files are extracted. |

## Review criteria

A maintainer will check that:

- The entry validates against the schema and the array stays sorted by `id`.
- `packageUrl` resolves to a zip whose root `manifest.json` declares `files`, and whose entry default-exports `{ activate }`.
- The code is readable (not obfuscated) so it can be reviewed.
- It doesn't bundle its own copy of React or the markdown pipeline (Glyph provides those).
- The plugin does what its `description` says and nothing surprising.

## Security

Plugins run inside Glyph with access mediated through the plugin context, there is no direct filesystem or shell access. Even so, **you are publishing code that other people will run.** Reviewers read the linked `main.js` before merging, and Glyph asks users to confirm before enabling a plugin. Don't submit code you didn't write or can't vouch for. To report a malicious entry, open an issue or email the address in Glyph's [SECURITY.md](https://github.com/hamidfzm/glyph/blob/main/SECURITY.md).
