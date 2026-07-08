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
