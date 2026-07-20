# Getting Started

## 1. Scaffold

Use the **[plugin template](https://github.com/glyph-md/plugin-template)** (click *Use this template* on GitHub). It contains:

```
manifest.json     # plugin metadata
src/main.ts       # your code (TypeScript)
types/glyph.d.ts  # the plugin API types
package.json      # esbuild build script
```

```bash
npm install
```

## 2. Write

`src/main.ts` default-exports an object with an `activate(ctx)` function. Everything you register through `ctx` is torn down automatically when the plugin is disabled or uninstalled, so a simple plugin needs no `deactivate`.

```ts
import type { PluginModule } from "glyph";

const plugin: PluginModule = {
  activate(ctx) {
    ctx.commands.register({
      id: "hello.greet",
      title: "Hello: Greet",
      run: () => ctx.notify(`Hello from plugin API ${ctx.apiVersion}`),
    });
  },
};

export default plugin;
```

See the **[API Reference](api-reference.md)** for the full `ctx` surface.

## 3. Build

```bash
npm run build   # bundles src/ into a single main.js
```

The app loads exactly one `main.js`, so multi-file plugins must be bundled. See **[Bundling](bundling.md)**.

## 4. Install locally

In Glyph: `Cmd/Ctrl+K` → **Manage Plugins…** → **Install from folder…** → pick your plugin folder (after `npm run build`).

The folder is copied into Glyph's config directory and loads on every launch:

| OS | Location |
|---|---|
| macOS | `~/Library/Application Support/com.hamidfzm.glyph/plugins/` |
| Windows | `%AppData%\com.hamidfzm.glyph\plugins\` |
| Linux | `~/.config/com.hamidfzm.glyph/plugins/` |

Use **Manage Plugins…** to enable/disable or remove it. To ship it to other users, see **[Publishing](publishing.md)**.

## manifest.json

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Reverse-DNS id; also the install folder name (letters, digits, `.`, `_`, `-`) |
| `name` | yes | Display name |
| `version` | yes | The plugin's semver |
| `apiVersion` | yes | Glyph plugin-API version; exact match required until 1.0 (currently `0.17.0`) |
| `description` | no | One-line summary |
| `main` | no | Entry file name, defaults to `main.js` |
| `files` | no | Every file the plugin consists of (must include `main`), e.g. `["main.js", "assets/fa.dic"]`. Required to ship assets: installs copy exactly this list and `ctx.assets` reads are limited to it |
| `permissions` | no | Capabilities you request (e.g. `workspace:read`, `network:api.example.com`); shown to users for consent |
| `sandbox` | no | Defaults to `true`: an isolated worker with network fenced to your `network:` permissions. Declare `false` only if you need main-context APIs (markdown, DOM mounts); users must then accept a full-access warning. See the [API reference](api-reference.md#sandboxed-plugins) |
