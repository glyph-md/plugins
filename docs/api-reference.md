# API Reference (0.25.0)

A plugin default-exports `{ activate(ctx), deactivate? }`. `activate` receives the **plugin context** (`ctx`), the only door to the host. Every `register*` call returns a **disposer** and is also auto-removed on unload, so you rarely call disposers yourself.

```ts
export interface PluginModule {
  activate(ctx: GlyphPluginContext): void | Promise<void>;
  deactivate?(): void;
}
```

## `ctx.apiVersion`

The host's plugin-API version (string): the Glyph app version itself. The API is unstable until 1.0: the host accepts any manifest `apiVersion` inside its compatibility window, from the floor (`0.16.0`) up to the app version. Every release widens the window at the top and only a breaking contract change moves the floor, so plugins built against an older compatible contract keep loading without a republish. A caret grants nothing below 1.0; normal caret ranges start at 1.0.0.

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

## `ctx.ui.addSidebarPanel`

A titled section rendered in the sidebar below the built-in Outline. Same `mount` contract as status bar items.

```ts
ctx.ui.addSidebarPanel({
  id: "my.todos",
  title: "TODOs",
  mount(el) { el.textContent = "3 open"; },
});
```

## `ctx.ui.addSettingsPanel`

One settings UI per plugin, shown under your plugin's row in Settings, Plugins while it is enabled. Pair it with `ctx.settings` to persist what the user picks.

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

## `ctx.ui.addStyles`

Inject a stylesheet after the app's own styles (plugin rules win ties). Removed automatically on unload. This is how custom CSS and theme plugins work.

```ts
ctx.ui.addStyles(".markdown-body { letter-spacing: 0.01em }");
```

## `ctx.settings`

Per-plugin persisted key-value settings. Hydrated before `activate`, so `get` is synchronous; `set` persists in the background and survives restarts.

```ts
const size = ctx.settings.get<number>("size") ?? 12;
ctx.settings.set("size", size + 1);
```

## `ctx.exporters`

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

### `ctx.exporters.registerSiteTheme` (API 0.17)

Contribute a theme for the website export (File > Export > Website, or the `--export site --out <dir>` CLI; it was `--export-website <dir>` up to Glyph v0.20.0). The CSS is appended to the exported site's shared `style.css` after the built-in chrome, so it can restyle the site header (`.glyph-site-header`), the navigation tree (`.glyph-site-nav`), the outline column (`.glyph-site-outline`), and the `.markdown-body` content. Workspaces select a theme with the `theme` field of `.glyph/site.json`; the built-ins are `github` (default) and `plain`, and a plugin cannot override those ids.

```ts
ctx.exporters.registerSiteTheme({
  id: "solarized",
  label: "Solarized",
  css: ".glyph-site-header { background: #fdf6e3; }",
});
```

## `ctx.markdown`

Extend how documents render.

```ts
// remark / rehype plugins (unified ecosystem), appended after the built-ins
ctx.markdown.registerRemarkPlugin(myRemarkPlugin);
ctx.markdown.registerRehypePlugin(myRehypePlugin);

// API 0.25: a heavy rehype plugin that loads only for documents that need it
ctx.markdown.registerRehypePlugin({
  detect: (markdown) => markdown.includes("@startuml"),
  load: async () => (await import("./rehypePlantUml")).default,
});

// render a fenced code block of a given language (API 0.25: a mount object)
ctx.markdown.registerFencedRenderer(
  "plantuml",
  {
    mount(el, { code, openLightbox }, registerCleanup) {
      const diagram = document.createElement("div");
      diagram.innerHTML = renderPlantUmlSvg(code); // sanitize untrusted output yourself
      if (openLightbox) {
        const zoom = () => openLightbox(svgDataUrl(diagram.innerHTML), ctx.i18n.t("myplugin:diagram"));
        diagram.setAttribute("role", "button");
        diagram.tabIndex = 0;
        diagram.addEventListener("click", zoom);
        diagram.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") zoom();
        });
      }
      el.replaceChildren(diagram);
    },
  },
  // optional: a light-theme render for print, PDF, and website export (API 0.25)
  { renderStatic: async (code) => renderPlantUmlSvg(code, { theme: "light" }) },
);
```

- Plugin remark/rehype run **after** the built-in pipeline (GFM, alerts, wikilinks, sanitize). Plugin code is trusted, so plugin rehype output is not re-sanitized.
- **API 0.25:** pass `{ detect, load }` to `registerRehypePlugin` for a plugin too heavy to load at startup. `detect(markdown)` is a cheap check run per document; the first match calls `load()` once, the document re-renders with the plugin, and print and every export wait for the load. A failed load is logged and not retried. The math core plugin loads KaTeX this way.
- **API 0.25, math:** wrap rendered math in an element carrying its TeX source in `data-math-source`, plus `data-math-display` on block math. PDF export rasterizes the marked blocks, and PDF and Word fall back to the source for inline math. The host strips these attributes from the document's own HTML, so only a plugin can set them.
- A fenced renderer handles ` ```<language> ` blocks whose language isn't already built in (csv/tsv take precedence). It receives the raw `code` string. When several plugins register the same language, the first registration wins; at startup, core plugins register before community ones, so a community renderer for `mermaid` or `d2` only takes over while that core plugin is switched off.
- **API 0.25:** pass a mount object, `{ mount(el, props, registerCleanup) }`, like the panel mounts. It draws into `el` with plain DOM and needs no React. When the block's source changes, your cleanups run and it is mounted again over its previous output, so an asynchronous renderer can keep the old render on screen and swap it (`el.replaceChildren(...)`) when the new one is ready. A plain function returning a string still works, but plugins cannot use React hooks: the host does not share its React.
- **API 0.25:** the renderer also receives `openLightbox(src, label)` where the document offers click-to-zoom; make the render interactive only when it is present, keyboard included. Exports strip `tabindex` and `title` from plugin blocks and turn `role="button"` into `role="img"` (or drop it when there is no `aria-label`).
- **API 0.25:** while an asynchronous render is still pending, set `aria-busy="true"` on `el` (or your element) and clear it when done. Print and every export wait for it.
- **API 0.25:** `renderStatic(code)` returns markup (typically an SVG) that print, PDF, and website export put on white paper in place of your live render, which may be drawn in the app's dark colors. Wrap it in your own classes if your stylesheet should apply. The host sanitizes it and gives up after 15 seconds; a PDF or website page then shows the block's source. A website export also drops image references other than `data:` URLs from it, since your markup is not rewritten the way the page's own links are, so inline any images. Without it, the live render is used as is.

## `ctx.documents` (API 0.25)

Open a document type of your own. Files with the extensions you register open read-only, and their whole body renders as one fenced block of `language`, so pair it with a fenced renderer for that language.

```ts
ctx.documents.registerFileType({ extensions: ["puml"], language: "plantuml" });
```

- Extensions are matched without the dot and ignoring case; the first registration for an extension wins. The language is letters, digits, `-`, and `_` (what the ` ```<language> ` lookup matches) and extensions letters and digits; types Glyph opens itself (markdown, notebooks, canvases, images, media) are refused.
- The file is fenced at render time, so enabling or disabling your plugin re-renders an open tab in place; with no plugin claiming it, the file shows as plain source. Restoring a saved session waits up to five seconds for plugins, so a restored tab of your type opens once you have registered it.
- Available in the sandbox (it is pure data), though a sandboxed plugin cannot register the fenced renderer itself.
- Registered extensions are offered by **Open File**. The workspace file tree, relative links, drag and drop, and the operating system's "open with" still cover only the document types built into Glyph.

## `ctx.workspace`

Read-only, mediated access to the opened workspace. Requires the plugin manifest to declare the `workspace:read` permission (shown to the user in the install consent prompt). Paths are workspace-relative; anything absolute or escaping the root is rejected, and calls fail when no workspace is open.

```ts
const files = await ctx.workspace.listFiles();      // absolute paths of workspace markdown files
const text  = await ctx.workspace.readFile("sub/notes.md");
```

## `ctx.assets`

Read your plugin's own bundled files: exactly the ones declared in the manifest's `files` list. No permission needed, it is your own reviewed content, and the host re-validates every path.

```ts
const dic = await ctx.assets.readText("assets/fa.dic");
const font = await ctx.assets.readBinary("assets/font.woff2");
```

## `ctx.spellcheck`

Contribute a spell-check dictionary; it appears in Settings → Editor's language picker, and `load` runs only when the user first selects the language. Registering an existing code (including the built-in `en`) replaces it; unloading the plugin removes it.

```ts
ctx.spellcheck.registerDictionary({
  language: "fa",
  label: "فارسی (Persian)",
  load: async () => ({ aff: AFF_TEXT, dic: DIC_TEXT }),
});
```

Real dictionaries are megabytes of Hunspell text; ship them as package assets and read them with `ctx.assets` (see the [recipe](recipes.md#spell-check-dictionary)) rather than embedding them in `main.js`.

The optional `scripts` field declares the ISO 15924 script codes the dictionary covers, e.g. `scripts: ["Arab"]`. When omitted the host infers it from `language` via CLDR likely-subtags, so `fa` already covers Arabic-script words. Words are checked only against dictionaries covering their script and skipped entirely when no enabled dictionary does, which keeps mixed-language notes clean. Casing is normalized, composite codes (`Jpan`, `Kore`, `Hans`, `Hant`) expand to their constituent scripts, and an unknown name logs a warning and contributes no coverage. Hosts that predate the field ignore it and infer instead, so declaring it is always safe.

## `ctx.notify`

```ts
ctx.notify("Saved");   // shows a transient toast
```

## `ctx.registerTranslations`

Ship your own i18n strings; the bundle is deep-merged into the host's i18n. Use a namespace of your own (your plugin id works) so no other plugin overwrites your keys.

```ts
ctx.registerTranslations("en", "myplugin", { greeting: "Hello" });
ctx.registerTranslations("de", "myplugin", { greeting: "Hallo" });
```

## `ctx.i18n` (API 0.25)

Read the strings you registered, in the app's current language.

```ts
const label = ctx.i18n.t("myplugin:greeting");
ctx.i18n.onLanguageChange(() => updateLabels()); // returns a disposer; removed on unload too
```

- Keys are `namespace:key`; values use i18next's `{{name}}` interpolation: `ctx.i18n.t("myplugin:hello", { name })`. Values are not HTML-escaped, so set them with `textContent`, not `innerHTML`.
- Not available in the sandbox (the worker has no copy of the app's strings); sandboxed plugins can still register translations for strings the host shows, such as command titles.

## Lifecycle

- `activate(ctx)` runs when the plugin loads (startup, install, or re-enable).
- Everything registered through `ctx` is removed automatically on unload.
- `deactivate()` runs on unload too; use it only for teardown that doesn't go through a `ctx` disposer.

## Sandboxed plugins

Plugins run sandboxed by default: a `manifest.json` without a `sandbox` flag (or with `"sandbox": true`) runs in an isolated worker instead of the app context. Declaring `"sandbox": false` opts out into full trust; Glyph shows users a separate full-access warning they must explicitly accept before the plugin runs (persisted per plugin), and updates that request new permissions ask again. Only declare `"sandbox": false` when your plugin genuinely needs the main-context APIs listed below.

```json
{
  "id": "com.you.fetcher",
  "name": "Fetcher",
  "version": "1.0.0",
  "apiVersion": "0.17.0",
  "sandbox": true,
  "permissions": ["network:api.example.com"]
}
```

Inside the sandbox:

- There is no DOM and no Tauri access; the plugin talks to the host only through the plugin API.
- `fetch` works only for hosts covered by your `network:<host>` permissions (the exact host or a subdomain of it). `XMLHttpRequest`, `WebSocket`, and `importScripts` are removed.
- The available API subset is: `ctx.commands`, `ctx.ui.addStyles`, `ctx.exporters`, `ctx.documents`, `ctx.workspace` (still requires `workspace:read`), `ctx.assets`, `ctx.spellcheck`, `ctx.settings`, `ctx.notify`, and `ctx.registerTranslations`.
- Not available: `ctx.i18n`, which needs the app's strings.
- Not available: `ctx.markdown` and the DOM-mount APIs (`addStatusBarItem`, `addSidebarPanel`, `addSettingsPanel`), because they cannot cross the worker boundary.

Prefer the sandbox (the default) when your plugin needs network access or doesn't touch the UI; users can trust it with less.

## Not available yet

No shell or `invoke` access; filesystem access only through the permission-gated `ctx.workspace`. In the full-trust (`"sandbox": false`) context there is no network gating, which is exactly why that mode requires an explicit user grant. More capabilities are tracked on the [roadmap](https://github.com/hamidfzm/glyph/issues/109).
 