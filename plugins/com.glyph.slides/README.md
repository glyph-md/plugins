# Slides

Present a document as slides inside Glyph, or export it as a slide deck. Every horizontal rule (`---`) in the document starts a new slide.

- **Slide Show**: View > Start Slide Show (or the command palette). The window goes fullscreen; arrow keys move between slides and Escape ends the show.
- **Export**: File > Export > Slides (reveal.js) writes one self-contained HTML file that opens offline in any browser.

Slides keep the document's look: math, highlighted code, tables, alerts, and diagrams render as they do in Glyph, in the current light or dark theme. Slides are drawn with [reveal.js](https://revealjs.com) (MIT, see LICENSE), which ships inside the package.

- **Permissions**: none
- **Sandbox**: no. The slide show draws over the app, which needs the main context.
- **Requires**: Glyph 0.26.0 or later
