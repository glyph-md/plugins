# Recipes

One worked example per contribution point. Each snippet is a complete `main.js` (or the relevant part of one); pair it with a `manifest.json` from [Getting Started](getting-started.md). Full signatures are in the [API Reference](api-reference.md).

## Command palette entry

```js
export default {
  activate(ctx) {
    ctx.commands.register({
      id: "demo.hello",
      title: "Demo: Say Hello",
      run: () => ctx.notify("Hello!"),
    });
  },
};
```

## Status bar item

`mount` gets a container element; register teardown via `registerCleanup`.

```js
export default {
  activate(ctx) {
    ctx.ui.addStatusBarItem({
      id: "demo.clock",
      mount(el, registerCleanup) {
        const tick = () => { el.textContent = new Date().toLocaleTimeString(); };
        tick();
        const timer = setInterval(tick, 1000);
        registerCleanup(() => clearInterval(timer));
      },
    });
  },
};
```

## Sidebar panel

```js
export default {
  activate(ctx) {
    ctx.ui.addSidebarPanel({
      id: "demo.panel",
      title: "Scratch",
      mount(el) {
        el.textContent = "Anything you render here appears under the Outline.";
      },
    });
  },
};
```

## Settings panel with persisted settings

`ctx.settings` is hydrated before `activate`, so `get` is synchronous.

```js
export default {
  activate(ctx) {
    ctx.ui.addSettingsPanel({
      id: "demo.settings",
      mount(el) {
        const input = document.createElement("input");
        input.value = ctx.settings.get("greeting") ?? "Hello";
        input.onchange = () => ctx.settings.set("greeting", input.value);
        el.append(input);
      },
    });
  },
};
```

## Injected styles

Theme tweaks and custom CSS ship as plugins; styles are removed on unload.

```js
export default {
  activate(ctx) {
    ctx.ui.addStyles(`
      .markdown-body h1 { letter-spacing: -0.02em; }
      .markdown-body blockquote { border-left-color: var(--color-accent); }
    `);
  },
};
```

## Fenced code-block renderer

Render ```` ```graphviz ```` blocks (any language tag you register) with your own component. The `render` value is a React-style function component; return DOM-building code via the host's React (see [Bundling](bundling.md) for JSX setups), or keep it dependency-free:

```js
export default {
  activate(ctx) {
    ctx.markdown.registerFencedRenderer("rot13", ({ code }) =>
      code.replace(/[a-z]/gi, (c) =>
        String.fromCharCode((c.charCodeAt(0) - (c < "a" ? 65 : 97) + 13) % 26 + (c < "a" ? 65 : 97)),
      ),
    );
  },
};
```

## remark / rehype plugin

Standard unified plugins slot into the pipeline after the built-ins.

```js
function remarkUppercaseHeadings() {
  return (tree) => {
    for (const node of tree.children) {
      if (node.type === "heading") {
        for (const child of node.children) {
          if (child.type === "text") child.value = child.value.toUpperCase();
        }
      }
    }
  };
}

export default {
  activate(ctx) {
    ctx.markdown.registerRemarkPlugin(remarkUppercaseHeadings);
  },
};
```

## Exporter

The host prepares the rendered HTML, asks for a save location, and writes the file; you only turn HTML into contents. Appears in the palette as "Export: Plain HTML…".

```js
export default {
  activate(ctx) {
    ctx.exporters.register({
      id: "demo.plain-html",
      label: "Plain HTML",
      extension: "html",
      build: async (bodyHtml) => `<!doctype html><body>${bodyHtml}</body>`,
    });
  },
};
```

## Translations

Ship your own strings per locale; they deep-merge into the host's i18n.

```js
export default {
  activate(ctx) {
    ctx.registerTranslations("en", "demo", { greet: "Hello" });
    ctx.registerTranslations("de", "demo", { greet: "Hallo" });
    ctx.registerTranslations("fa", "demo", { greet: "سلام" });
  },
};
```

## Workspace reads (permission-gated)

Requires `"permissions": ["workspace:read"]` in the manifest; the user consents at install.

```js
export default {
  activate(ctx) {
    ctx.commands.register({
      id: "demo.count-files",
      title: "Demo: Count Workspace Files",
      run: async () => {
        const files = await ctx.workspace.listFiles();
        ctx.notify(`${files.length} markdown files in this workspace`);
      },
    });
  },
};
```

## Spell-check dictionary

Add a language to Settings → Editor → Spell Check. `load` is lazy: it runs only when the user picks the language. (Real Hunspell dictionaries are large; ship them as packaged assets once hamidfzm/glyph#407 lands.)

```js
export default {
  activate(ctx) {
    ctx.spellcheck.registerDictionary({
      language: "xx",
      label: "Demo language",
      load: async () => ({ aff: "SET UTF-8\n", dic: "2\nhello\nworld\n" }),
    });
  },
};
```

## Sandboxed network plugin

Set `"sandbox": true` and declare the hosts you call; `fetch` is fenced to them and the plugin runs in a worker with no DOM. See [the API reference](api-reference.md#sandboxed-plugins) for the available ctx subset.

```json
{
  "id": "demo.quote",
  "name": "Quote of the Day",
  "version": "1.0.0",
  "apiVersion": "0.16.0",
  "sandbox": true,
  "permissions": ["network:zenquotes.io"]
}
```

```js
export default {
  activate(ctx) {
    ctx.commands.register({
      id: "demo.quote",
      title: "Demo: Quote of the Day",
      run: async () => {
        const res = await fetch("https://zenquotes.io/api/today");
        const [q] = await res.json();
        ctx.notify(`${q.q}: ${q.a}`);
      },
    });
  },
};
```
