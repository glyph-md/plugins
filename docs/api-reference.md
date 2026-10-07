# API Reference (0.26.0)

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

**API 0.26:** add `menu: "view"` to also list it in the native **View** menu (desktop), after the built-in view commands. The menu shows `title` as is and finds the command again by your plugin's id plus the command `id`, so ids need only be unique within your plugin. A title over 100 characters, or one with tabs or other control characters, stays in the palette but is not listed in the menu.

```ts
ctx.commands.register({ id: "my.present", title: "Start Slide Show", menu: "view", run: present });
```

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

### Files panel blocks (API 0.26)

`location: "files"` puts the panel in the Files panel instead, below the file tree, as a block. The host draws the heading the user collapses it with and the divider that resizes it, and remembers both; you fill the body. Unlike a panel below the Outline, a block shows whether or not the open note has headings (it needs an open workspace, since the Files panel does).

```ts
ctx.ui.addSidebarPanel({
  id: "my.links",
  title: "Links",
  location: "files",
  frame: { min: 80, naturalMax: 160 },   // optional height bounds, in pixels
  mountHeading(el) { el.textContent = "3"; },   // optional: what follows the title
  mount(el) { el.textContent = "three links"; },
});
```

- `frame.min` is the smallest height the divider allows (default 56). `frame.naturalMax` caps how far the block grows on its own before it scrolls; once the user drags the divider, their height wins. Both must be finite and not negative, or `addSidebarPanel` throws.
- `mountHeading` fills the rest of the heading row after the title: a count, a small button. It follows the same `mount` contract and stays visible while the block is collapsed.
- A collapsed block keeps your body mounted but hidden, so your state survives. The block element around both of your mounts carries `data-collapsed` (it is an ancestor, not the `el` you are handed), which lets your stylesheet hide heading controls that act on the body: `[data-collapsed] .my-sort { display: none }`.
- `title` is read when the panel is added. To follow a language switch, dispose the panel and add it again from `ctx.i18n.onLanguageChange`; the saved height and collapsed state are keyed by your plugin and panel id, so they carry over.
- The tags and backlinks core plugins are built this way.

## `ctx.ui.filterFileTree` (API 0.26)

List a set of workspace files in place of the file tree, under a heading of your own, until you dispose it. This is what the tags core plugin does when a tag is picked.

```ts
const remove = ctx.ui.filterFileTree({
  label: "#project (3)",
  paths,                       // workspace files, in the order to list them
  onClear: () => remove(),     // the user pressed the list's clear button
});
```

- One filter shows at a time: the newest. Disposing it brings back the one before it, or the tree.
- The host draws the list (paths relative to the workspace root, the open document highlighted) and opens the file a user clicks. The clear button only calls `onClear`; removing the filter is up to you, so your own state stays the source of truth.
- `label` must be a string, `paths` an array of strings, and `onClear` a function; anything else throws. The host keeps its own copy of `paths`, so register again to change them.
- Each path is absolute (as `ctx.vault` returns them) or relative to the workspace root, the same as `ctx.navigation.openFile` takes. A path outside the workspace throws, as does a call with no workspace open: the list only ever shows workspace files.
- A filter belongs to the workspace it was built for. Dispose it from `ctx.workspace.onChange`, and rebuild it from `ctx.vault.onChange` if its paths can go stale.
- Not available in the sandbox.

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

## `ctx.ui.openOverlay` (API 0.26)

Show content over the whole app, with the window taken fullscreen: slide shows, focus modes. Same `mount` contract as the panels, plus a `label` that names the overlay for screen readers. Only one overlay is open at a time; opening another closes the first.

```ts
const close = ctx.ui.openOverlay({
  id: "my.show",
  label: "Slide show",
  mount(el, registerCleanup) {
    el.textContent = "Slide 1";
    const handleKey = (e) => { if (e.key === "ArrowRight") next(); };
    document.addEventListener("keydown", handleKey);
    registerCleanup(() => document.removeEventListener("keydown", handleKey));
  },
});
```

- The host keeps its own ways out, so a bug in your overlay does not strand the user in a fullscreen layer: Escape closes the overlay before your own key handlers see it, and the host draws a small close button in the top corner (top right in left-to-right layouts). Leave both alone; do not cover the button or handle Escape yourself. Closing (by either, by the returned disposer, or by unloading the plugin) runs your cleanups and restores the window.
- The overlay takes keyboard focus before `mount` runs; focus something of your own in `mount` if you need to. Focus returns to where it was on close.
- If `mount` throws, the overlay closes instead of leaving an empty screen.

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

Contribute an export format. The host runs the shared pipeline (prepares the rendered document, asks for a save location with a derived filename, writes the file); your plugin only turns HTML into file contents (string or `Uint8Array`). It appears in the command palette as "Export: <label>…" and (API 0.26) in the native **File > Export** menu as "<label>…", under the built-in formats. The menu finds the exporter again by your plugin's id plus the exporter `id`, and skips a label over 99 characters or with control characters.

```ts
ctx.exporters.register({
  id: "my.slides",
  label: "reveal.js slides",
  extension: "html",
  async build(bodyHtml, { title, css, dark }) {
    return `<!doctype html><html${dark ? ' class="dark"' : ""}><head><title>${title}</title><style>${css}</style></head><body><div class="markdown-body">${bodyHtml}</div></body></html>`;
  },
});
```

**API 0.26:** `build` receives a second argument with what a standalone file needs to look like the app: `title` (from the frontmatter title, the first `# heading`, or the file name; escape it before putting it in markup), `css` (every style rule the app applies, so `.markdown-body` content, highlighted code, math, and alerts render as in the app), and `dark` (whether the app is in its dark theme; the app's dark colors apply under `html.dark`). Older hosts pass only `bodyHtml`.

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
- Registered extensions are offered by **Open File**.

### `ctx.documents.getRenderedHtml` (API 0.26)

The active document's rendered HTML, exactly as exporters receive it in `build` (app-only buttons stripped, images inlined), once diagrams and math have finished rendering. Resolves to `null` when no document is rendered: an empty window, a tab showing only the editor, or a canvas.

```ts
const html = await ctx.documents.getRenderedHtml();
if (html === null) ctx.notify("Open a document first.");
```

Not available in the sandbox: a sandboxed plugin sees document content only through an export the user runs, so it cannot read whatever is open at will. The workspace file tree, relative links, drag and drop, and the operating system's "open with" still cover only the document types built into Glyph.

### `ctx.documents.getActive` (API 0.26)

The document in the active tab, or `null` when no document tab is active.

```ts
const active = ctx.documents.getActive();
// { path: "/vault/Notes/Plan.md", text: "# Plan\n...", selection: "" }

ctx.documents.onActiveChange(() => refresh());   // returns a disposer; removed on unload too
```

- `path` is absolute, except for a new document not saved yet, which reports its placeholder name. `text` includes unsaved edits; it is `null` while the document is still loading and for documents with no text (an image), and `""` for an empty one. `selection` is the text selected in the window, read when you access it.
- It needs no permission, and it also reports a loose file opened from outside the workspace: a plugin in the app context can read the window anyway.
- `onActiveChange` fires when another document becomes active, or none. Typing in the active document does not fire it; call `getActive()` when you need the current text.
- Not available in the sandbox: a sandboxed plugin sees document content only through an export the user runs.

## `ctx.workspace`

Read-only, mediated access to the opened workspace. Requires the plugin manifest to declare the `workspace:read` permission (shown to the user in the install consent prompt). Paths are workspace-relative; anything absolute or escaping the root is rejected, and calls fail when no workspace is open.

```ts
const files = await ctx.workspace.listFiles();      // absolute paths of workspace markdown files
const text  = await ctx.workspace.readFile("sub/notes.md");
```

**API 0.26:** `ctx.workspace.getRoot()` returns the absolute path of the opened workspace, or `null` when none is open, and `ctx.workspace.onChange(listener)` runs when the workspace opens, closes, or changes. Both need `workspace:read`, and neither is available in the sandbox.

## `ctx.vault` (API 0.26)

Read-only queries over the workspace index: the same index behind the graph, backlinks, and tags. Requires the `workspace:read` permission. Paths are absolute, and every query rejects when no workspace is open.

```ts
const { nodes, edges } = await ctx.vault.graph();        // notes and the resolved links between them
const links = await ctx.vault.backlinks(notePath);        // [{ source, line, snippet }]
const tags  = await ctx.vault.tags();                     // [{ tag, count }]
const files = await ctx.vault.pathsWithTag("project");    // files with the tag or one nested under it
const { truncated } = await ctx.vault.status();           // true when the workspace was too large to index whole

ctx.vault.onChange(() => refresh());   // returns a disposer; removed on unload too
```

- A graph node is `{ id, label, degree, orphan }`, where `id` is the note's path; an edge is `{ source, target }` of node ids.
- A backlink's `line` is the 1-based source line of the link and `snippet` that line's text. Hand `source` and `line` to `ctx.navigation.openFile` to jump there.
- Tag counts include nested tags: `project` counts the files tagged `project/glyph` too, and `pathsWithTag("project")` lists them.
- `onChange` fires after the index changes: a saved edit, a rename, a file added or removed, another workspace. Answers are a snapshot, so ask again from the listener. A slower answer can arrive after a newer one; keep a request counter and drop the stale ones.
- Answers are yours to keep and change: the graph and tag lists are copies, not the objects the app draws from.
- A very large workspace is indexed only in part. `status()` says so; when `truncated` is true, every other answer covers only what was indexed, so say that in whatever you draw from it.
- Not available in the sandbox.

## `ctx.navigation` (API 0.26)

```ts
ctx.navigation.openFile("/vault/Notes/Plan.md");
ctx.navigation.openFile("Notes/Plan.md", { line: 12 });
```

Opens a workspace file in a tab, or switches to its tab when it is already open. `path` is absolute (as `ctx.vault` and `ctx.workspace.listFiles` return them) or relative to the workspace root; a path outside the workspace throws, as does a call with no workspace open. It needs no permission. Not available in the sandbox.

`line` is a 1-based source line: once the note's tab is open and rendered, the viewer scrolls to the block covering it and flashes it. It has no effect when the note is already open in another window (that window is raised instead) or when the tab shows no rendered view of the line (the editor alone, or a split view with scroll sync off).

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
- Not available: `ctx.markdown` and the DOM-mount APIs (`addStatusBarItem`, `addSidebarPanel`, `addSettingsPanel`, `openOverlay`), because they cannot cross the worker boundary.
- Not available: `ctx.documents.getRenderedHtml`, so a sandboxed plugin reads document content only from an export the user runs.
- Not available: the app state APIs (`ctx.ui.filterFileTree`, `ctx.documents.getActive` and `onActiveChange`, `ctx.workspace.getRoot` and `onChange`, `ctx.vault`, `ctx.navigation`). Calling one throws an error that names it.

Prefer the sandbox (the default) when your plugin needs network access or doesn't touch the UI; users can trust it with less.

## Not available yet

No shell or `invoke` access; filesystem access only through the permission-gated `ctx.workspace`. In the full-trust (`"sandbox": false`) context there is no network gating, which is exactly why that mode requires an explicit user grant. More capabilities are tracked on the [roadmap](https://github.com/hamidfzm/glyph/issues/109).
 