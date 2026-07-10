# Publishing

Glyph reads a marketplace index (`index.json`) maintained in [glyph-md/plugins](https://github.com/glyph-md/plugins). Listing your plugin there lets users one-click **Install** from the command palette and get **Update** prompts when you ship a new version.

## Steps

1. Build and release in **your own repo**: run `npm run build`, commit `main.js`, and tag a release (e.g. `v1.0.0`) so the file has a stable, immutable URL.
2. Open a PR to [glyph-md/plugins](https://github.com/glyph-md/plugins) adding an entry to `index.json`:

   ```json
   {
     "id": "com.yourname.example",
     "name": "Example",
     "description": "What it does, in one line.",
     "version": "1.0.0",
     "apiVersion": "0.16.0",
     "mainUrl": "https://raw.githubusercontent.com/yourname/glyph-example/v1.0.0/main.js"
   }
   ```

3. Validate against `index.schema.json` (editors do this via the `$schema` key) and keep the array sorted by `id`.

See the marketplace [CONTRIBUTING guide](https://github.com/glyph-md/plugins/blob/main/CONTRIBUTING.md) for the field rules and review criteria.

## Updates

Cut a new release, then open a PR that bumps **both** `version` and `mainUrl` (to the new tag). Glyph compares the index `version` against what each user has installed and offers an in-app update when they differ. Always **pin `mainUrl` to a tag or commit**, never a moving branch, so installs are reproducible.

## Versioning

- `version` — your plugin's semver; must increase when `mainUrl` changes.
- `apiVersion`: the Glyph plugin-API version you built against (currently `0.16.0`). Until the API reaches 1.0 it must match the host exactly; Glyph refuses to load anything else, so retest and republish when the API version bumps.
