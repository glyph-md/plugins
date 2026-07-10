# Contributing to the Plugin System

This page is about improving the plugin **system** itself: the host, the API, the marketplace, and these docs. For writing a plugin, start at [Getting Started](getting-started.md); for publishing one, see [Publishing](publishing.md).

## Where the code lives

All host code is in [hamidfzm/glyph](https://github.com/hamidfzm/glyph):

| Area | Path |
|---|---|
| Loader, host, registries, types | `src/lib/plugins/` |
| Worker sandbox (protocol, bootstrap, bridge) | `src/lib/plugins/sandbox/` |
| Marketplace client (fetch, updates, sha256 verify) | `src/lib/plugins/marketplace.ts` |
| React wiring (provider, consent, toasts, styles) | `src/contexts/PluginsProvider.tsx`, `src/components/plugins/` |
| Manage Plugins UI | `src/components/plugins/PluginsModal.tsx` |
| Rust commands (scan, install, uninstall) | `src-tauri/src/commands/plugins.rs` |

This repo holds `index.json`, `index.schema.json`, the docs, and the sample plugin. The [template](https://github.com/glyph-md/plugin-template) holds the scaffold and types.

## How the system was built

The delivery plan lived in [hamidfzm/glyph#109](https://github.com/hamidfzm/glyph/issues/109), shipped as phases:

- **Foundation**: loader (data-URL ESM import), host with per-plugin disposer bags, Rust install/list/uninstall, Manage Plugins modal
- **A: Markdown pipeline**: remark/rehype plugins, fenced code-block renderers
- **B: Trust**: declared permissions, install consent, permission-gated workspace API
- **C/D: Surface growth**: sidebar panels, settings panels, exporters, per-plugin settings, translations, `addStyles`, spell-check dictionaries
- **E: Distribution hardening**: index CI validation, sha256 download verification, and the opt-in worker sandbox

All phases are complete; new work is incremental API/proposal-driven.

## Proposing new API surface

1. Open a feature issue on hamidfzm/glyph describing the contribution point (what a plugin registers, what the host renders/runs, what can go wrong on unload).
2. Every registration must return a disposer and route through the plugin's `DisposerBag`, so unload removes exactly that plugin's contributions.
3. Decide the sandbox story up front: can the API cross a `postMessage` boundary? If not (DOM mounts, React components), it stays main-context only and the docs must say so.
4. Bump the pinned `PLUGIN_API_VERSION` (exact-match until 1.0, see hamidfzm/glyph#415) and ship, in the same PR series: host code + tests, `api-reference.md` marker, template `types/glyph.d.ts`, a [recipe](recipes.md), and `index.schema.json` if the manifest changed.

## Gates

The app repo enforces, on every PR (Husky pre-commit and CI):

```bash
pnpm typecheck && pnpm check && pnpm test
cd src-tauri && cargo clippy --all-targets -- -D warnings
```

Codecov patch coverage must stay green; run `pnpm test:coverage` before pushing. This repo runs `validate.yml` on every PR: schema validation, sorted unique ids, https URLs, and a catalog entry for every published id.
