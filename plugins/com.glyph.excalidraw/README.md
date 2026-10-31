# Excalidraw

View and edit [Excalidraw](https://excalidraw.com) drawings inside Glyph.

- **`.excalidraw` files** open as the drawing.
- **` ```excalidraw ` blocks** holding a scene (the JSON of an `.excalidraw` file) render as the drawing in the note. An empty block is a blank drawing to start from.
- **Obsidian Excalidraw notes** (`.excalidraw.md`, with `excalidraw-plugin` in the frontmatter) show their drawing in place of the text Obsidian keeps around it.

Drawings follow the light or dark theme, open zoomable on click, and print and export on white paper. Hover a drawing and press **Edit** to open the Excalidraw editor over the app; **Done**, the close button, or Escape saves it back in the format it came from (Obsidian notes stay compressed, and nothing else in the note changes). Undo in the note takes the edit back. If the note changed or closed while the editor was open, nothing is overwritten: the editor stays open and **Done** becomes **Copy and close**, which puts the drawing on the clipboard.

Everything ships inside the package, fonts included, so drawings render offline. Two parts of Excalidraw are left out to keep it small: the CJK hand-drawn font (CJK text uses a system font) and converting Mermaid to a drawing (Glyph renders ` ```mermaid ` blocks itself).

- **Permissions**: none
- **Sandbox**: no. Drawings render into the document and the editor draws over the app, which needs the main context.
- **Requires**: Glyph 0.26.0 or later to view drawings, 0.28.0 or later to edit them

## Building

`main.js` is written by hand. `assets/excalidraw.js` is built from `src/` with esbuild:

```bash
npm ci --ignore-scripts
npm run build
npm test
```

Excalidraw, React, lz-string, and DOMPurify are bundled; see LICENSE for their notices.
