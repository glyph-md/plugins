# Writing Glyph Plugins

Glyph plugins are small JavaScript modules that extend the app: add command-palette commands, status bar items, notifications, translations, and markdown rendering. They run in the app's webview through a single capability object (`ctx`), never with direct filesystem or shell access.

## Pages

- **[Getting Started](getting-started.md)** — scaffold from the template, build, install locally.
- **[API Reference](api-reference.md)** — everything on `ctx` (v1).
- **[Bundling](bundling.md)** — write many files, ship one `main.js`.
- **[Publishing](publishing.md)** — manifest, releases, and the marketplace.

## At a glance

A plugin is a folder with two files:

```
my-plugin/
├── manifest.json   # id, name, version, apiVersion
└── main.js         # pre-built ES module, default-exports { activate }
```

```js
export default {
  activate(ctx) {
    ctx.commands.register({
      id: "my.hello",
      title: "My Plugin: Hello",
      run: () => ctx.notify("Hello!"),
    });
  },
};
```

Install it in Glyph via the command palette (`Cmd/Ctrl+K`) → **Manage Plugins…** → **Install from folder…**, or publish it to the [marketplace](https://github.com/glyph-md/plugins) so others can one-click install.

Start from the **[plugin template](https://github.com/glyph-md/plugin-template)** (click *Use this template*) — it has the build, types, and a working sample wired up.
