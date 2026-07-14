# The Glyph Plugin Ecosystem

Three repositories make up the plugin ecosystem. This page maps what lives where and how versions flow between them.

## The repos

| Repo | What it is | You go there to |
|---|---|---|
| [hamidfzm/glyph](https://github.com/hamidfzm/glyph) | The app and the plugin **host**: loader, registries, permission gating, sandbox, marketplace client | Change how plugins run, propose new API surface, report host bugs |
| [glyph-md/plugins](https://github.com/glyph-md/plugins) (this repo) | The **marketplace index** (`index.json`), these docs, and the plugin catalog | Publish or update a plugin, read/write documentation |
| [glyph-md/plugin-template](https://github.com/glyph-md/plugin-template) | The **scaffold**: build setup, `types/glyph.d.ts`, a working sample | Start a new plugin (click *Use this template*) |

## How the pieces connect

```
plugin author                          user
     │                                   │
     │ scaffolds from                    │ installs via
     ▼                                   ▼
plugin-template ──types track──▶ glyph (host, PLUGIN_API_VERSION)
     │                                   ▲
     │ publishes entry to                │ fetches index.json + main.js,
     ▼                                   │ verifies sha256, checks updates
glyph-md/plugins (plugins/<id>/) ────────┘
```

- Registrations live one-per-folder under `plugins/<id>/`; CI generates `index.json` from them on merge. The app fetches that `index.json` from this repo's `main` branch to list marketplace plugins, detect updates (version diff), and install: the `packageUrl` zip is downloaded, verified against `sha256`, and only its manifest-declared files are copied out.
- Plugin code itself is **not** hosted here (except official plugins like Hello Status); each entry's `packageUrl` points at a release asset in the plugin's own repo, pinned to a tag.
- The template ships type declarations that mirror the host's `ctx`, so plugin authors get autocomplete without a runtime dependency.
- These docs, the catalog, and every plugin README are published as a website at [glyph-md.github.io/plugins](https://glyph-md.github.io/plugins/), rendered by Glyph's own website export on every merge (dogfooding the export-website action).
- Alongside the aggregate `index.json`, the generator emits `index/<category>.json` shards and `index/meta.json` (per-category counts), so clients can fetch one section instead of everything once the catalog grows.
- Official plugin packages are built and released by CI: bump the version in an official plugin's `manifest.json` + `plugin.json` and the release workflow zips the declared files, publishes the tagged release, rewrites `packageUrl`/`sha256`, and regenerates the index in one bot commit.

## Version flow

Three version numbers matter, and they are linked:

1. **`PLUGIN_API_VERSION`** in the app (`src/lib/plugins/apiVersion.ts`), pinned at `0.16.0`. Bumped by hand when the API decisions change; unstable until it ships as 1.0.0.
2. **`apiVersion`** in each plugin's manifest, checked at load time. While the API major is 0 it must equal the host version exactly; caret ranges only mean something from 1.0.0.
3. **`version`** of each plugin: its own semver, used by the marketplace to offer updates.

The maintenance convention: every app PR that changes the plugin API updates, in the same delivery,

- `api-reference.md` here, with an "(API X.Y)" marker on the new section,
- the template's `types/glyph.d.ts` (header comment states the version),
- `index.schema.json` if the manifest grew a field,
- [recipes.md](recipes.md) if a new contribution point landed.

So the doc markers, the template types, and the host constant always describe the same API.
