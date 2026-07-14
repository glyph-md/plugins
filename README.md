# Glyph Plugins

The official plugin marketplace for [Glyph](https://github.com/hamidfzm/glyph), a cross-platform markdown viewer.

This repository registers plugins: one folder each under [`plugins/`](plugins) holding a `plugin.json` (id, category, packageUrl, sha256, …) and a `README.md` catalog page. [`index.json`](index.json) is **generated** from those registrations, and Glyph reads it to discover, install, and update plugins. **Community plugin code lives in each plugin's own repository**; official plugins keep their source next to their registration here.

## For users

Plugins are installed from inside Glyph, you don't clone anything by hand:

1. Open the command palette (`Cmd/Ctrl+K`).
2. Run **Install Plugin: \<name\>** for any plugin in the index.
3. When a newer version is published, the palette shows **Update Plugin: \<name\>**.

Installed plugins are copied into Glyph's config directory and load on every launch:

| OS | Location |
|---|---|
| macOS | `~/Library/Application Support/com.hamidfzm.glyph/plugins/` |
| Windows | `%AppData%\com.hamidfzm.glyph\plugins\` |
| Linux | `~/.config/com.hamidfzm.glyph/plugins/` |

To remove a plugin, delete its folder there and restart Glyph.

## How it works

On launch Glyph fetches `index.json` from this repo's `main` branch over HTTPS (no auth, no server). Each entry carries everything the app needs:

```json
{
  "id": "com.author.example",
  "name": "Example",
  "description": "What it does, in one line.",
  "version": "1.0.0",
  "apiVersion": "^1.0.0",
  "packageUrl": "https://github.com/author/glyph-example/releases/download/v1.0.0/plugin.zip",
  "sha256": "<hex digest of plugin.zip>"
}
```

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Unique reverse-DNS id; also the install folder name (letters, digits, `.`, `_`, `-`) |
| `name` | yes | Display name shown in the palette |
| `description` | no | One-line summary |
| `version` | yes | The plugin's current semver; bumping it triggers the in-app update prompt |
| `apiVersion` | yes | Glyph plugin-API range the plugin targets, e.g. `^1.0.0` |
| `packageUrl` | yes | URL of the release zip: `manifest.json` plus the manifest-declared files |

Entries are validated against [`index.schema.json`](index.schema.json).

## Publishing a plugin

Open a pull request that adds (or bumps) your entry in `index.json`. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide, the entry rules, and the review criteria.

## Plugin API

**Writing a plugin? Browse the [docs site](https://glyph-md.github.io/plugins/) (rendered by Glyph itself) or start at the [docs hub](docs/) ([Getting Started](docs/getting-started.md) · [Recipes](docs/recipes.md) · [API Reference](docs/api-reference.md) · [Publishing](docs/publishing.md) · [Catalog](docs/plugin-catalog.md)).**

Plugins are plain ES modules that default-export `{ activate(ctx) }`. The context gives a plugin commands, status bar items, notifications, translations, and markdown rendering (remark/rehype plugins + fenced renderers). A worked sample lives in this repo: [`com.glyph.hello-status/`](com.glyph.hello-status/), and the [plugin template](https://github.com/glyph-md/plugin-template) scaffolds a new one. The design and roadmap are tracked in [glyph#109](https://github.com/hamidfzm/glyph/issues/109).
