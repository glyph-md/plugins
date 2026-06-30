# Glyph Plugins

The official plugin marketplace for [Glyph](https://github.com/hamidfzm/glyph), a cross-platform markdown viewer.

This repository is a single index, [`index.json`](index.json), that lists community plugins. Glyph reads it to discover plugins, install them, and detect new versions. **Plugin code lives in each plugin's own repository**, not here; the index only points at it.

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
  "mainUrl": "https://raw.githubusercontent.com/author/glyph-example/v1.0.0/main.js"
}
```

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Unique reverse-DNS id; also the install folder name (letters, digits, `.`, `_`, `-`) |
| `name` | yes | Display name shown in the palette |
| `description` | no | One-line summary |
| `version` | yes | The plugin's current semver; bumping it triggers the in-app update prompt |
| `apiVersion` | yes | Glyph plugin-API range the plugin targets, e.g. `^1.0.0` |
| `mainUrl` | yes | Direct URL to the plugin's built single-file ES module |

Entries are validated against [`index.schema.json`](index.schema.json).

## Publishing a plugin

Open a pull request that adds (or bumps) your entry in `index.json`. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide, the entry rules, and the review criteria.

## Plugin API

**Writing a plugin? Read the [authoring guide](docs/) ([Getting Started](docs/getting-started.md) · [API Reference](docs/api-reference.md) · [Bundling](docs/bundling.md) · [Publishing](docs/publishing.md)).**

Plugins are plain ES modules that default-export `{ activate(ctx) }`. The context gives a plugin commands, status bar items, notifications, translations, and markdown rendering (remark/rehype plugins + fenced renderers). A worked sample lives in this repo: [`com.glyph.hello-status/`](com.glyph.hello-status/), and the [plugin template](https://github.com/glyph-md/plugin-template) scaffolds a new one. The design and roadmap are tracked in [glyph#109](https://github.com/hamidfzm/glyph/issues/109).
