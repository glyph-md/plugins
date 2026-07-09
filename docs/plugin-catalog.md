# Plugin Catalog

Every plugin published in [`index.json`](../index.json) gets a section here, so users can see what a plugin does and what it asks for before installing. A marketplace PR is only merged together with its catalog entry (CI enforces this).

Entry format: heading = plugin name, first line = the `id` in backticks, then what it does, the permissions it declares, and links. Screenshots welcome.

---

## Hello Status

`com.glyph.hello-status`

The sample plugin: adds a status bar greeting and a "Hello Status: Say Hello" command to the palette. Exists to prove the pipeline (install → consent → activate → contribute) and as a minimal reference implementation.

- **Permissions**: none
- **Sandbox**: no
- **Source**: [com.glyph.hello-status/](../com.glyph.hello-status/) in this repo

## Persian Spell Check

`com.glyph.spellcheck-fa`

Adds a Persian (Farsi) dictionary to the editor's spell check: once installed, فارسی appears under Settings → Editor → Spell Check → Language. The Hunspell dictionary comes from the [Lilak](https://github.com/b00f/lilak) project (Apache-2.0), published as [`dictionary-fa`](https://www.npmjs.com/package/dictionary-fa); it is fetched from jsDelivr the first time you select the language (about 1 MB, once per session), so the first activation needs a network connection. Requires Glyph plugin API 1.3 (spell-check dictionaries).

- **Permissions**: `network:cdn.jsdelivr.net`
- **Sandbox**: no (dictionary contributions are main-context only)
- **Source**: [com.glyph.spellcheck-fa/](../com.glyph.spellcheck-fa/) in this repo
