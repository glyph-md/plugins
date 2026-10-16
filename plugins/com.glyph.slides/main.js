// Slides for Glyph: present the open document fullscreen, or export it as a
// self-contained reveal.js deck. Top-level horizontal rules (`---`) separate
// slides. reveal.js (MIT, https://revealjs.com) ships as package assets; see
// LICENSE.

const REVEAL_JS = "assets/reveal.js";
const REVEAL_CSS = "assets/reveal.css";

// No URL hash: inside Glyph it would rewrite the app's own location.
const REVEAL_OPTIONS = { hash: false, respondToHashChanges: false, slideNumber: "c/t" };

// Slides wear the app's markdown styles and theme colors, sized for a slide.
const SLIDE_CSS = `
.reveal-viewport { background: var(--color-surface); color: var(--color-text-primary); }
.reveal .controls, .reveal .progress { color: var(--color-accent); }
.reveal .slides { text-align: start; }
.reveal .slides > section > .markdown-body {
  max-width: none;
  padding: 0;
  font-size: 28px;
  line-height: 1.4;
}
.reveal .markdown-body img, .reveal .markdown-body svg { max-height: 520px; }
`;

/** Group a document's top-level nodes into slides at every <hr>, dropping empty ones. */
export function groupSlides(nodes) {
  const slides = [[]];
  for (const node of nodes) {
    if (node.nodeName === "HR") slides.push([]);
    else slides[slides.length - 1].push(node);
  }
  return slides.filter((slide) => slide.some((node) => node.textContent.trim() || node.nodeType === 1));
}

/** The `.reveal` markup for slides given as HTML strings. */
export function deckMarkup(slides) {
  const sections = slides
    .map((html) => `<section><div class="markdown-body" dir="auto">${html}</div></section>`)
    .join("\n");
  return `<div class="reveal"><div class="slides">\n${sections}\n</div></div>`;
}

const escapeHtml = (text) =>
  text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Inlined text must not close its own element early.
const inlineScript = (js) => js.replace(/<\/script/gi, "<\\/script");
const inlineStyle = (css) => css.replace(/<\/style/gi, "<\\/style");

/** A standalone deck: app styles, reveal.js, and the slides in one HTML file. */
export function deckHtml({ slides, title, css, dark, revealJs, revealCss }) {
  return `<!doctype html>
<html lang="en"${dark ? ' class="dark"' : ""}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${inlineStyle(css)}</style>
<style>${inlineStyle(revealCss)}</style>
<style>${SLIDE_CSS}</style>
</head>
<body>
${deckMarkup(slides)}
<script>${inlineScript(revealJs)}</script>
<script>Reveal.initialize(${JSON.stringify(REVEAL_OPTIONS)});</script>
</body>
</html>
`;
}

/** Split rendered document HTML into one HTML string per slide. */
function splitSlides(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  return groupSlides(Array.from(template.content.childNodes)).map((nodes) => {
    const slide = document.createElement("div");
    slide.append(...nodes);
    return slide.innerHTML;
  });
}

let revealClass;

// reveal.js is a UMD script: run it once as a classic script from a blob URL
// (allowed by the app's CSP), take the global it defines, and remove it again.
function loadReveal(ctx) {
  revealClass ??= ctx.assets.readText(REVEAL_JS).then(
    (source) =>
      new Promise((resolve, reject) => {
        const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
        const script = document.createElement("script");
        const done = () => {
          script.remove();
          URL.revokeObjectURL(url);
        };
        script.onload = () => {
          done();
          const Reveal = globalThis.Reveal;
          delete globalThis.Reveal;
          resolve(Reveal);
        };
        script.onerror = () => {
          done();
          revealClass = undefined;
          reject(new Error("reveal.js failed to load"));
        };
        script.src = url;
        document.head.append(script);
      }),
  );
  return revealClass;
}

async function startSlideShow(ctx) {
  const html = await ctx.documents.getRenderedHtml();
  const slides = html == null ? [] : splitSlides(html);
  if (slides.length === 0) {
    ctx.notify("Open a document to start a slide show.");
    return;
  }
  const [Reveal, revealCss] = await Promise.all([loadReveal(ctx), ctx.assets.readText(REVEAL_CSS)]);
  ctx.ui.openOverlay({
    id: "slides.show",
    label: "Slide show",
    mount(el, registerCleanup) {
      registerCleanup(ctx.ui.addStyles(`${revealCss}\n${SLIDE_CSS}`));
      el.innerHTML = deckMarkup(slides);
      // The window is already fullscreen, so reveal.js's own F shortcut is off.
      const deck = new Reveal(el.firstElementChild, {
        ...REVEAL_OPTIONS,
        embedded: true,
        keyboard: { 70: null },
      });
      deck.initialize();
      registerCleanup(() => deck.destroy());
    },
  });
}

export default {
  activate(ctx) {
    ctx.exporters.register({
      id: "slides.revealjs",
      label: "Slides (reveal.js)",
      extension: "html",
      async build(bodyHtml, doc) {
        const [revealJs, revealCss] = await Promise.all([
          ctx.assets.readText(REVEAL_JS),
          ctx.assets.readText(REVEAL_CSS),
        ]);
        return deckHtml({ ...doc, slides: splitSlides(bodyHtml), revealJs, revealCss });
      },
    });

    ctx.commands.register({
      id: "slides.start",
      title: "Start Slide Show",
      menu: "view",
      run: () => startSlideShow(ctx),
    });
  },
};
