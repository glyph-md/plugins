// Excalidraw for Glyph: draws ```excalidraw blocks, .excalidraw files, and
// Obsidian Excalidraw notes, and edits them in the Excalidraw editor.
// Excalidraw (MIT, https://excalidraw.com) and React ship in
// assets/excalidraw.js, built from src/ by build.mjs and loaded on the first
// drawing; see LICENSE.

const NS = "com.glyph.excalidraw";
const LIBRARY = "assets/excalidraw.js";

// An Obsidian drawing stored LZ-string compressed. The remark plugin below
// tags it so, and only inside a note marked as an Obsidian drawing.
const COMPRESSED_LANGUAGE = "excalidraw-compressed";

const STRINGS = {
  en: {
    label: "Excalidraw drawing",
    zoomHint: "Click to zoom",
    edit: "Edit",
    editLabel: "Edit drawing",
    editor: "Excalidraw editor",
    done: "Done",
    empty: "Empty drawing",
    errorTitle: "Failed to render drawing",
    notSaved: "The drawing was not saved: the note changed or closed while it was open.",
    notSavedCopied:
      "The drawing was not saved: the note changed or closed while it was open. It is on the clipboard.",
    copyAndClose: "Copy and close",
    copied: "The drawing is on the clipboard.",
    language: "en",
  },
  de: {
    label: "Excalidraw-Zeichnung",
    zoomHint: "Zum Vergrößern klicken",
    edit: "Bearbeiten",
    editLabel: "Zeichnung bearbeiten",
    editor: "Excalidraw-Editor",
    done: "Fertig",
    empty: "Leere Zeichnung",
    errorTitle: "Zeichnung konnte nicht dargestellt werden",
    notSaved:
      "Die Zeichnung wurde nicht gespeichert: Die Notiz wurde geändert oder geschlossen, während die Zeichnung offen war.",
    notSavedCopied:
      "Die Zeichnung wurde nicht gespeichert: Die Notiz wurde geändert oder geschlossen, während die Zeichnung offen war. Sie liegt in der Zwischenablage.",
    copyAndClose: "Kopieren und schließen",
    copied: "Die Zeichnung liegt in der Zwischenablage.",
    language: "de-DE",
  },
  es: {
    label: "Dibujo de Excalidraw",
    zoomHint: "Haz clic para ampliar",
    edit: "Editar",
    editLabel: "Editar dibujo",
    editor: "Editor de Excalidraw",
    done: "Listo",
    empty: "Dibujo vacío",
    errorTitle: "No se pudo mostrar el dibujo",
    notSaved: "El dibujo no se guardó: la nota cambió o se cerró mientras el dibujo estaba abierto.",
    notSavedCopied:
      "El dibujo no se guardó: la nota cambió o se cerró mientras el dibujo estaba abierto. Está en el portapapeles.",
    copyAndClose: "Copiar y cerrar",
    copied: "El dibujo está en el portapapeles.",
    language: "es-ES",
  },
  fa: {
    label: "طرح Excalidraw",
    zoomHint: "برای بزرگ‌نمایی کلیک کنید",
    edit: "ویرایش",
    editLabel: "ویرایش طرح",
    editor: "ویرایشگر Excalidraw",
    done: "تمام",
    empty: "طرح خالی",
    errorTitle: "نمایش طرح ممکن نشد",
    notSaved: "طرح ذخیره نشد: یادداشت هنگام باز بودن طرح تغییر کرد یا بسته شد.",
    notSavedCopied: "طرح ذخیره نشد: یادداشت هنگام باز بودن طرح تغییر کرد یا بسته شد. طرح در کلیپ‌بورد است.",
    copyAndClose: "کپی و بستن",
    copied: "طرح در کلیپ‌بورد است.",
    language: "fa-IR",
  },
  zh: {
    label: "Excalidraw 绘图",
    zoomHint: "点击放大",
    edit: "编辑",
    editLabel: "编辑绘图",
    editor: "Excalidraw 编辑器",
    done: "完成",
    empty: "空白绘图",
    errorTitle: "无法渲染绘图",
    notSaved: "绘图未保存：绘图打开期间，笔记已更改或已关闭。",
    notSavedCopied: "绘图未保存：绘图打开期间，笔记已更改或已关闭。绘图已复制到剪贴板。",
    copyAndClose: "复制并关闭",
    copied: "绘图已复制到剪贴板。",
    language: "zh-CN",
  },
};

const STYLES = `
.markdown-body .excalidraw-block { position: relative; margin: 0 0 1em; }
.markdown-body .excalidraw-drawing { text-align: center; overflow-x: auto; }
.markdown-body .excalidraw-drawing svg { max-width: 100%; height: auto; }
.markdown-body .excalidraw-drawing[role="button"] { cursor: zoom-in; }
.markdown-body .excalidraw-empty {
  padding: 2em 1em;
  border: 1px dashed var(--color-border);
  border-radius: var(--glyph-radius-sm, 4px);
  color: var(--color-text-tertiary);
  text-align: center;
}
.markdown-body .excalidraw-error-label {
  font-size: 0.8em;
  color: var(--color-text-tertiary);
  margin-bottom: 0.5em;
}
.markdown-body .excalidraw-edit {
  position: absolute;
  top: 0.25em;
  inset-inline-end: 0.25em;
  padding: 0.2em 0.6em;
  border: 1px solid var(--color-border);
  border-radius: var(--glyph-radius-sm, 4px);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 0.8em;
  cursor: pointer;
  opacity: 0;
}
/* The label is drawn, not written, so searching the note never finds it. */
.markdown-body .excalidraw-edit::after { content: attr(data-label); }
.markdown-body .excalidraw-block:hover .excalidraw-edit,
.markdown-body .excalidraw-edit:focus-visible { opacity: 1; }
@media (hover: none) { .markdown-body .excalidraw-edit { opacity: 1; } }
`;

/** Lines of `size` characters with a blank line between, as Obsidian writes compressed drawings. */
export function chunk(text, size = 256) {
  const lines = [];
  for (let at = 0; at < text.length; at += size) lines.push(text.slice(at, at + size));
  return lines.join("\n\n");
}

// How a block's text becomes scene JSON and back. `lib` is assets/excalidraw.js.
export const PLAIN = {
  decode: (_lib, code) => code,
  encode: (_lib, scene) => scene,
};

export const COMPRESSED = {
  decode(lib, code) {
    const scene = lib.decompressFromBase64(code.replace(/\s+/g, ""));
    if (!scene) throw new Error("not a compressed Excalidraw drawing");
    return scene;
  },
  encode: (lib, scene) => chunk(lib.compressToBase64(scene)),
};

/** Whether frontmatter text marks a note as an Obsidian Excalidraw drawing. */
export function isObsidianDrawing(frontmatter) {
  return /^excalidraw-plugin\s*:/m.test(frontmatter);
}

function textOf(node) {
  if (typeof node.value === "string") return node.value;
  return (node.children ?? []).map(textOf).join("");
}

/** The drawing block of an Obsidian drawing: the json or compressed-json block under "Drawing". */
export function findDrawing(children) {
  let underDrawing = false;
  for (const node of children) {
    if (node.type === "heading") underDrawing = textOf(node).trim() === "Drawing";
    if (underDrawing && node.type === "code" && /^(compressed-)?json$/.test(node.lang ?? "")) {
      return node;
    }
  }
  return null;
}

/**
 * remark plugin: an Obsidian drawing renders as its drawing alone, in place of
 * the boilerplate around it. The block keeps its source position, so saving it
 * rewrites only the drawing.
 */
export function remarkObsidianDrawing() {
  return (tree) => {
    const frontmatter = tree.children.find((node) => node.type === "yaml");
    if (!frontmatter || !isObsidianDrawing(frontmatter.value)) return;
    const drawing = findDrawing(tree.children);
    if (!drawing) return;
    drawing.lang = drawing.lang === "json" ? "excalidraw" : COMPRESSED_LANGUAGE;
    tree.children = [frontmatter, drawing];
  };
}

// The app's theme is the `.dark` class on <html>, which settings can set
// against the OS preference.
function isDark() {
  return document.documentElement.classList.contains("dark");
}

let library;

// The bundle is an ES module: import it from a blob URL (the app's CSP allows
// blob: scripts). A failed load is forgotten so the next drawing retries.
function loadLibrary(ctx) {
  library ??= ctx.assets
    .readText(LIBRARY)
    .then(async (source) => {
      const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
      try {
        return await import(/* @vite-ignore */ url);
      } finally {
        URL.revokeObjectURL(url);
      }
    })
    .catch((err) => {
      library = undefined;
      throw err;
    });
  return library;
}

// Rendered SVG keyed by theme, background, and scene, so a re-render (scroll,
// tab switch, an edit elsewhere in the note) skips the export. Bounded like an LRU.
const svgCache = new Map();
const SVG_CACHE_LIMIT = 50;

function renderSvg(lib, scene, dark, background = false) {
  const key = `${dark ? "dark" : "light"}:${background ? "canvas" : "clear"}:${scene}`;
  const cached = svgCache.get(key);
  if (cached) {
    svgCache.delete(key);
    svgCache.set(key, cached);
    return cached;
  }
  const pending = lib.sceneToSvg(scene, dark, background);
  pending.catch(() => {
    if (svgCache.get(key) === pending) svgCache.delete(key);
  });
  svgCache.set(key, pending);
  if (svgCache.size > SVG_CACHE_LIMIT) svgCache.delete(svgCache.keys().next().value);
  return pending;
}

/** A `data:` URL for the lightbox's <img>, which parses SVG as strict XML. */
function svgToDataUrl(svg) {
  const root = new DOMParser().parseFromString(svg, "text/html").body.querySelector("svg");
  const xml = root ? new XMLSerializer().serializeToString(root) : svg;
  return `data:image/svg+xml,${encodeURIComponent(xml)}`;
}

/**
 * Save a drawing as its editor closes without Done (Escape, the close button,
 * the window closing). A refused save keeps nothing newer from being replaced,
 * so the drawing goes to the clipboard when the system allows it, and the user
 * is told either way.
 */
export async function saveOnClose({ updateCode, code, scene, copy, notify, t }) {
  if (await updateCode(code)) return;
  try {
    await copy(scene);
    notify(t("notSavedCopied"));
  } catch {
    notify(t("notSaved"));
  }
}

// Done saves while the editor is still open, so a refused save leaves the
// drawing on screen and Done turns into a copy, made inside the click the
// clipboard asks for. The other ways out save from the cleanup.
function openEditor(ctx, lib, scene, format, updateCode) {
  const t = (key) => ctx.i18n.t(`${NS}:${key}`);
  const copy = (text) => navigator.clipboard.writeText(text);
  let editor = null;
  let settled = false;
  let refused = false;
  let close = () => {};

  const done = async () => {
    const changed = editor.changedScene();
    if (changed !== null && refused) {
      try {
        await copy(changed);
      } catch {
        ctx.notify(t("notSaved"));
        return;
      }
      ctx.notify(t("copied"));
    } else if (changed !== null) {
      const saved = await updateCode(format.encode(lib, changed));
      if (!saved) {
        refused = true;
        ctx.notify(t("notSaved"));
        editor.setDoneLabel(t("copyAndClose"));
        return;
      }
    }
    settled = true;
    close();
  };

  close = ctx.ui.openOverlay({
    id: "editor",
    label: t("editor"),
    mount(el, registerCleanup) {
      editor = lib.mountEditor(el, {
        text: scene,
        dark: isDark(),
        langCode: t("language"),
        doneLabel: t("done"),
        onDone: () => void done(),
      });
      registerCleanup(() => {
        const changed = settled ? null : editor.changedScene();
        editor.unmount();
        if (changed === null) return;
        const code = format.encode(lib, changed);
        const notify = (message) => ctx.notify(message);
        void saveOnClose({ updateCode, code, scene: changed, copy, notify, t });
      });
    },
  });
}

function createRenderer(ctx, format) {
  const t = (key) => ctx.i18n.t(`${NS}:${key}`);

  return {
    mount(el, { code, openLightbox, updateCode }, registerCleanup) {
      const block = document.createElement("div");
      block.className = "excalidraw-block";

      const drawing = document.createElement("div");
      drawing.className = "excalidraw-drawing";
      const empty = document.createElement("div");
      empty.className = "excalidraw-empty";

      const failure = document.createElement("div");
      failure.className = "excalidraw-error";
      const failureTitle = document.createElement("div");
      failureTitle.className = "excalidraw-error-label";
      const source = document.createElement("code");
      source.textContent = code;
      const pre = document.createElement("pre");
      pre.append(source);
      failure.append(failureTitle, pre);

      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "excalidraw-edit";

      // The scene JSON on screen, "" for an empty drawing, null when it failed.
      let scene = null;
      let dark = isDark();
      // A theme flip starts a newer render while an older one may still be
      // running; only the newest may touch the DOM.
      let renderSeq = 0;

      // `el` keeps its previous content until the new render is in;
      // aria-busy holds export readiness meanwhile.
      const show = (content, editable) => {
        block.replaceChildren(content);
        if (editable && updateCode) block.append(edit);
        el.replaceChildren(block);
        el.setAttribute("aria-busy", "false");
      };

      const render = async () => {
        const seq = ++renderSeq;
        if (code.trim() === "") {
          scene = "";
          show(empty, true);
          return;
        }
        el.setAttribute("aria-busy", "true");
        try {
          const lib = await loadLibrary(ctx);
          const decoded = format.decode(lib, code);
          const rendered = await renderSvg(lib, decoded, dark);
          if (seq !== renderSeq) return;
          scene = decoded;
          drawing.innerHTML = rendered;
          show(rendered === "" ? empty : drawing, true);
        } catch {
          if (seq !== renderSeq) return;
          scene = null;
          show(failure, false);
        }
      };

      const applyLabels = () => {
        failureTitle.textContent = t("errorTitle");
        empty.textContent = t("empty");
        edit.dataset.label = t("edit");
        edit.setAttribute("aria-label", t("editLabel"));
        if (openLightbox) {
          drawing.title = t("zoomHint");
          drawing.setAttribute("aria-label", t("label"));
        }
      };

      if (openLightbox) {
        // The inline render is transparent and the lightbox backdrop dark, so
        // the zoomed copy carries the scene's own canvas color behind it.
        const zoom = async () => {
          if (!scene) return;
          try {
            const lib = await loadLibrary(ctx);
            openLightbox(svgToDataUrl(await renderSvg(lib, scene, dark, true)), t("label"));
          } catch (err) {
            console.error("The Excalidraw drawing could not be zoomed:", err);
          }
        };
        drawing.setAttribute("role", "button");
        drawing.tabIndex = 0;
        drawing.addEventListener("click", zoom);
        drawing.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            zoom();
          }
        });
      }

      edit.addEventListener("click", () => {
        if (scene === null) return;
        const opened = scene;
        loadLibrary(ctx).then(
          (lib) => openEditor(ctx, lib, opened, format, updateCode),
          (err) => console.error("The Excalidraw editor failed to load:", err),
        );
      });

      const themeObserver = new MutationObserver(() => {
        if (isDark() === dark) return;
        dark = isDark();
        void render();
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });

      applyLabels();
      registerCleanup(ctx.i18n.onLanguageChange(applyLabels));
      registerCleanup(() => {
        themeObserver.disconnect();
        renderSeq++;
        el.removeAttribute("aria-busy");
      });
      void render();
    },
  };
}

// Print, PDF, and website export put drawings on white paper, so the static
// render is light, wrapped in the same class so the layout styles apply.
function renderStatic(ctx, format) {
  return async (code) => {
    if (code.trim() === "") return "";
    const lib = await loadLibrary(ctx);
    const svg = await lib.sceneToSvg(format.decode(lib, code), false);
    return svg === "" ? "" : `<div class="excalidraw-drawing">${svg}</div>`;
  };
}

export default {
  activate(ctx) {
    for (const [locale, resources] of Object.entries(STRINGS)) {
      ctx.registerTranslations(locale, NS, resources);
    }
    ctx.ui.addStyles(STYLES);
    for (const [language, format] of [
      ["excalidraw", PLAIN],
      [COMPRESSED_LANGUAGE, COMPRESSED],
    ]) {
      ctx.markdown.registerFencedRenderer(language, createRenderer(ctx, format), {
        renderStatic: renderStatic(ctx, format),
      });
    }
    ctx.documents.registerFileType({ extensions: ["excalidraw"], language: "excalidraw" });
    ctx.markdown.registerRemarkPlugin(remarkObsidianDrawing);
  },
};
