# API Reference (v1)

A plugin default-exports `{ activate(ctx), deactivate? }`. `activate` receives the **plugin context** (`ctx`), the only door to the host. Every `register*` call returns a **disposer** and is also auto-removed on unload, so you rarely call disposers yourself.

```ts
export interface PluginModule {
  activate(ctx: GlyphPluginContext): void | Promise<void>;
  deactivate?(): void;
}
```

## `ctx.apiVersion`

The host's plugin-API version (string). Your manifest's `apiVersion` range is checked against it before the plugin loads.

## `ctx.commands`

```ts
ctx.commands.register({
  id: "my.command",        // unique within your plugin
  title: "My Plugin: Do Thing",
  run: () => { /* sync or async */ },
});
```

The command appears in the palette (`Cmd/Ctrl+K`) under **Commands**.

## `ctx.ui.addStatusBarItem`

```ts
ctx.ui.addStatusBarItem({
  id: "my.status",
  mount(el, registerCleanup) {
    el.textContent = "Ready";
    const t = setInterval(() => { el.textContent = new Date().toISOString(); }, 1000);
    registerCleanup(() => clearInterval(t));
  },
});
```

`mount(el, registerCleanup)` is **framework-agnostic**: write into `el` with vanilla DOM, or mount React/Svelte/Vue into it. Register any teardown (timers, listeners, framework unmount) via `registerCleanup`.

## `ctx.ui.addSidebarPanel` (API 1.1)

A titled section rendered in the sidebar below the built-in Outline. Same `mount` contract as status bar items.

```ts
ctx.ui.addSidebarPanel({
  id: "my.todos",
  title: "TODOs",
  mount(el) { el.textContent = "3 open"; },
});
```

## `ctx.ui.addSettingsPanel` (API 1.1)

One settings UI per plugin, shown under your plugin's row in Manage Plugins while it is enabled. Pair it with `ctx.settings` to persist what the user picks.

```ts
ctx.ui.addSettingsPanel({
  id: "my.settings",
  mount(el) {
    const input = document.createElement("input");
    input.value = String(ctx.settings.get("size") ?? 12);
    input.onchange = () => ctx.settings.set("size", Number(input.value));
    el.append("Font size: ", input);
  },
});
```

## `ctx.ui.addStyles` (API 1.2)

Inject a stylesheet after the app's own styles (plugin rules win ties). Removed automatically on unload. This is how custom CSS and theme plugins work.

```ts
ctx.ui.addStyles(".markdown-body { letter-spacing: 0.01em }");
```

## `ctx.settings` (API 1.1)

Per-plugin persisted key-value settings. Hydrated before `activate`, so `get` is synchronous; `set` persists in the background and survives restarts.

```ts
const size = ctx.settings.get<number>("size") ?? 12;
ctx.settings.set("size", size + 1);
```

## `ctx.exporters` (API 1.1)

Contribute an export format. The host runs the shared pipeline (prepares the rendered document, asks for a save location with a derived filename, writes the file); your plugin only turns HTML into file contents (string or `Uint8Array`). It appears in the command palette as "Export: <label>…".

```ts
ctx.exporters.register({
  id: "my.slides",
  label: "reveal.js slides",
  extension: "html",
  async build(bodyHtml) {
    return `<!doctype html><html>…${bodyHtml}…</html>`;
  },
});
```

## `ctx.markdown`

Extend how documents render.

```ts
// remark / rehype plugins (unified ecosystem), appended after the built-ins
ctx.markdown.registerRemarkPlugin(myRemarkPlugin);
ctx.markdown.registerRehypePlugin(myRehypePlugin);

// render a fenced code block of a given language with a React component
ctx.markdown.registerFencedRenderer("d2", ({ code }) => <D2Diagram source={code} />);
```

- Plugin remark/rehype run **after** the built-in pipeline (GFM, math, alerts, wikilinks, sanitize). Plugin code is trusted, so plugin rehype output is not re-sanitized.
- A fenced renderer handles ` ```<language> ` blocks whose language isn't already built in (mermaid/csv/tsv take precedence). It receives the raw `code` string.

## `ctx.workspace`

Read-only, mediated access to the opened workspace. Requires the plugin manifest to declare the `workspace:read` permission (shown to the user in the install consent prompt). Paths are workspace-relative; anything absolute or escaping the root is rejected, and calls fail when no workspace is open.

```ts
const files = await ctx.workspace.listFiles();      // absolute paths of workspace markdown files
const text  = await ctx.workspace.readFile("sub/notes.md");
```

## `ctx.notify`

```ts
ctx.notify("Saved");   // shows a transient toast
```

## `ctx.registerTranslations`

Ship and read your own i18n strings; the bundle is deep-merged into the host's i18n.

```ts
ctx.registerTranslations("en", "myplugin", { greeting: "Hello" });
ctx.registerTranslations("de", "myplugin", { greeting: "Hallo" });
```

## Lifecycle

- `activate(ctx)` runs when the plugin loads (startup, install, or re-enable).
- Everything registered through `ctx` is removed automatically on unload.
- `deactivate()` runs on unload too — use it only for teardown that doesn't go through a `ctx` disposer.

## Sandboxed plugins (API 1.2)

Declare `"sandbox": true` in `manifest.json` to run your plugin in an isolated worker instead of the app context:

```json
{
  "id": "com.you.fetcher",
  "name": "Fetcher",
  "version": "1.0.0",
  "apiVersion": "^1.2.0",
  "sandbox": true,
  "permissions": ["network:api.example.com"]
}
```

Inside the sandbox:

- There is no DOM and no Tauri access; the plugin talks to the host only through the plugin API.
- `fetch` works only for hosts covered by your `network:<host>` permissions (the exact host or a subdomain of it). `XMLHttpRequest`, `WebSocket`, and `importScripts` are removed.
- The available API subset is: `ctx.commands`, `ctx.ui.addStyles`, `ctx.exporters`, `ctx.workspace` (still requires `workspace:read`), `ctx.settings`, `ctx.notify`, and `ctx.registerTranslations`.
- Not available: `ctx.markdown` and the DOM-mount APIs (`addStatusBarItem`, `addSidebarPanel`, `addSettingsPanel`), because they cannot cross the worker boundary.

Prefer the sandbox when your plugin needs network access or doesn't touch the UI; users can trust it with less.

## Not available yet

No shell or `invoke` access; filesystem access only through the permission-gated `ctx.workspace`. In the main (non-sandboxed) context there is no network gating, so network-using plugins should opt into the sandbox. More capabilities are tracked on the [roadmap](https://github.com/hamidfzm/glyph/issues/109).
 