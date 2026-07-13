# Glyph Plugin Docs

Glyph plugins are small JavaScript modules that extend the app: command-palette commands, status bar items, sidebar and settings panels, markdown rendering, exporters, styles, translations, and notifications. They run through a single capability object (`ctx`), never with direct filesystem or shell access, and can opt into a network-fenced worker sandbox.

## Where to go

**I want to write a plugin**
1. [Getting Started](getting-started.md): scaffold from the template, build, install locally
2. [Recipes](recipes.md): a worked example for every contribution point
3. [API Reference](api-reference.md): everything on `ctx`, with per-version markers
4. [Bundling](bundling.md): write many files, ship one `main.js`

**I want to publish or install plugins**
- [Publishing](publishing.md): manifest, releases, sha256, the marketplace index
- [Plugin Catalog](plugin-catalog.md): what's published and what each plugin asks for (generated; each plugin's own README is its page)

**I want to improve the plugin system itself**
- [Contributing](contributing.md): host code map, how to propose API surface, gates
- [Ecosystem](ecosystem.md): the three repos and how versions flow between them

## At a glance

A plugin is a folder with two files:

```
my-plugin/
├── manifest.json   # id, name, version, apiVersion (+ files, permissions, sandbox)
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

Start from the **[plugin template](https://github.com/glyph-md/plugin-template)** (click *Use this template*): it has the build, types, and a working sample wired up.
