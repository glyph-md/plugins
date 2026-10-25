// The part of the plugin that needs Excalidraw: built into
// assets/excalidraw.js by build.mjs and imported by main.js on the first
// drawing. Scenes cross this boundary as JSON text in Excalidraw's file format.

import {
  Excalidraw,
  exportToSvg,
  MainMenu,
  restore,
  serializeAsJSON,
} from "@excalidraw/excalidraw";
import DOMPurify from "dompurify";
// The editor's stylesheet, with its UI font inlined (see build.mjs).
import editorCss from "excalidraw-editor-css";
import { createRoot } from "react-dom/client";

export { compressToBase64, decompressFromBase64 } from "lz-string";

const SVG_NS = "http://www.w3.org/2000/svg";

// Keeps Excalidraw's top-right controls clear of the overlay's close button.
const OVERLAY_CSS = `
.glyph-excalidraw-editor { position: absolute; inset: 0; }
.glyph-excalidraw-editor .layer-ui__wrapper__top-right { margin-inline-end: 2.75rem; }
.glyph-excalidraw-done {
  height: 2.25rem;
  padding: 0 0.875rem;
  border: none;
  border-radius: var(--border-radius-lg, 0.5rem);
  background: var(--color-primary);
  color: var(--color-surface-lowest, #fff);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.glyph-excalidraw-done:hover { background: var(--color-primary-darker); }
`;

/** A scene from Excalidraw JSON, upgraded to the current format; empty text is a blank drawing. */
function parseScene(text) {
  const data = text.trim() === "" ? { elements: [] } : JSON.parse(text);
  if (!Array.isArray(data?.elements)) throw new Error("not an Excalidraw scene");
  // A file is image data the scene carries. Anything else (a URL) would be
  // fetched the moment the drawing shows it.
  const files = Object.fromEntries(
    Object.entries(data.files ?? {}).filter(
      ([, file]) => typeof file?.dataURL === "string" && file.dataURL.startsWith("data:image/"),
    ),
  );
  return restore({ ...data, files }, null, null);
}

function serialize({ elements, appState, files }) {
  return serializeAsJSON(elements, appState, files, "local");
}

// Excalidraw places each image with <use> pointing at a <symbol>. Sanitizers
// drop <use> (Glyph's exports too), so each one becomes the symbol's content,
// drawn in place.
function inlineSymbols(svg) {
  for (const use of svg.querySelectorAll("use")) {
    const href = use.getAttribute("href") ?? use.getAttribute("xlink:href") ?? "";
    const symbol = svg.querySelector(`symbol[id="${CSS.escape(href.slice(1))}"]`);
    const group = document.createElementNS(SVG_NS, "g");
    const placed = document.createElementNS(SVG_NS, "svg");
    for (const { name, value } of use.attributes) {
      if (["x", "y", "width", "height"].includes(name)) placed.setAttribute(name, value);
      else if (name !== "href" && name !== "xlink:href") group.setAttribute(name, value);
    }
    for (const name of ["viewBox", "preserveAspectRatio"]) {
      const value = symbol?.getAttribute(name);
      if (value) placed.setAttribute(name, value);
    }
    placed.append(...[...(symbol?.childNodes ?? [])].map((node) => node.cloneNode(true)));
    group.append(placed);
    use.replaceWith(group);
  }
  for (const symbol of svg.querySelectorAll("symbol")) symbol.remove();
}

/** The drawing as sanitized SVG markup on a transparent background, "" when it has nothing in it. */
export async function sceneToSvg(text, dark) {
  const { elements, appState, files } = parseScene(text);
  const visible = elements.filter((element) => !element.isDeleted);
  if (visible.length === 0) return "";
  const svg = await exportToSvg({
    elements: visible,
    appState: { ...appState, exportBackground: false, exportWithDarkMode: dark },
    files,
    exportPadding: 10,
  });
  inlineSymbols(svg);
  // The scene is document content. A link becomes an anchor that would
  // navigate the app's own window, and an embed renders through
  // foreignObject, so both go; the shapes and their labels stay.
  return DOMPurify.sanitize(svg.outerHTML, { FORBID_TAGS: ["foreignObject", "a"] });
}

/**
 * Open the editor in `el` with the scene in `text`. `changedScene()` is the
 * drawing as JSON when it differs from what was opened, else null.
 */
export function mountEditor(el, { text, dark, langCode, doneLabel, onDone }) {
  const initial = parseScene(text);
  // Replaced by the editor's own first view of the scene, which can differ
  // from the parsed one (bindings repaired) without the user changing it.
  let before = serialize(initial);
  let loaded = false;

  const style = document.createElement("style");
  style.textContent = editorCss + OVERLAY_CSS;
  const host = document.createElement("div");
  host.className = "glyph-excalidraw-editor";
  el.append(style, host);

  let api = null;
  const root = createRoot(host);
  const render = (label) =>
    root.render(
      <Excalidraw
        initialData={{ ...initial, scrollToContent: true }}
        excalidrawAPI={(instance) => {
          api = instance;
        }}
        onChange={(elements, appState, files) => {
          if (loaded) return;
          loaded = true;
          before = serialize({ elements, appState, files });
        }}
        // A link would navigate the app's own window, losing its unsaved work.
        onLinkOpen={(_element, event) => event.preventDefault()}
        theme={dark ? "dark" : "light"}
        langCode={langCode}
        autoFocus
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            export: false,
            saveAsImage: false,
            toggleTheme: false,
          },
        }}
        renderTopRightUI={() => (
          <button type="button" className="glyph-excalidraw-done" onClick={onDone}>
            {label}
          </button>
        )}
      >
        <MainMenu>
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
        </MainMenu>
      </Excalidraw>,
    );
  render(doneLabel);

  // A text label still being typed is finished through its blur, while the
  // scene is alive: unmounting under it makes Excalidraw throw.
  const finishTextEditing = () => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && host.contains(active)) active.blur();
  };

  return {
    changedScene() {
      finishTextEditing();
      if (!api) return null;
      const after = serialize({
        elements: api.getSceneElements(),
        appState: api.getAppState(),
        files: api.getFiles(),
      });
      return after === before ? null : after;
    },
    setDoneLabel: render,
    unmount() {
      finishTextEditing();
      root.unmount();
      style.remove();
      host.remove();
    },
  };
}
