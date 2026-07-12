# Publishing

Glyph reads a marketplace index (`index.json`) maintained in [glyph-md/plugins](https://github.com/glyph-md/plugins). Listing your plugin there lets users one-click **Install** from the command palette and get **Update** prompts when you ship a new version.

## Steps

1. Build and package in **your own repo**: run `npm run build`, zip `manifest.json` plus every file the manifest's `files` list declares (entry + assets), and attach the zip to a tagged release (e.g. `v1.0.0`) so it has a stable, immutable URL. Compute its digest with `shasum -a 256 plugin.zip` (or `Get-FileHash` on Windows).
2. Open a PR to [glyph-md/plugins](https://github.com/glyph-md/plugins) adding an entry to `index.json`:

   ```json
   {
     "id": "com.yourname.example",
     "name": "Example",
     "description": "What it does, in one line.",
     "version": "1.0.0",
     "apiVersion": "0.16.0",
     "packageUrl": "https://github.com/yourname/glyph-example/releases/download/v1.0.0/plugin.zip",
     "sha256": "<hex digest of plugin.zip>"
   }
   ```

3. Validate against `index.schema.json` (editors do this via the `$schema` key) and keep the array sorted by `id`.

See the marketplace [CONTRIBUTING guide](https://github.com/glyph-md/plugins/blob/main/CONTRIBUTING.md) for the field rules and review criteria.

## Updates

Cut a new release, then open a PR that bumps `version`, `packageUrl` (to the new tag), and `sha256`. Glyph compares the index `version` against what each user has installed and offers an in-app update when they differ. Always **pin `packageUrl` to a tag**, never a moving branch: the digest is verified before anything installs, and only the manifest-declared files are copied out of the archive.

## Versioning

- `version`: your plugin's semver; must increase when `packageUrl` changes.
- `apiVersion`: the Glyph plugin-API version you built against (currently `0.16.0`). Until the API reaches 1.0 it must match the host exactly; Glyph refuses to load anything else, so retest and republish when the API version bumps.
