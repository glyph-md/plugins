import assert from "node:assert/strict";
import { test } from "node:test";
import plugin, {
  COMPRESSED,
  chunk,
  findDrawing,
  isObsidianDrawing,
  PLAIN,
  remarkObsidianDrawing,
  saveOnClose,
} from "./main.js";

const heading = (text, depth = 2) => ({ type: "heading", depth, children: [{ type: "text", value: text }] });
const code = (lang, value = "data") => ({ type: "code", lang, value });
const paragraph = (text) => ({ type: "paragraph", children: [{ type: "text", value: text }] });
const yaml = (value) => ({ type: "yaml", value });

// Base64 stands in for LZ-string: the formats only care that encode and
// decode invert each other and what happens to whitespace around them.
const fakeLib = {
  compressToBase64: (text) => Buffer.from(text).toString("base64"),
  decompressFromBase64: (text) => Buffer.from(text, "base64").toString(),
};

test("chunk splits into lines of 256 with a blank line between", () => {
  const text = "a".repeat(600);
  assert.equal(chunk(text), `${"a".repeat(256)}\n\n${"a".repeat(256)}\n\n${"a".repeat(88)}`);
  assert.equal(chunk(""), "");
});

test("the compressed format round-trips a scene through Obsidian's chunked text", () => {
  const scene = JSON.stringify({ type: "excalidraw", elements: [{ id: "x".repeat(400) }] });
  const stored = COMPRESSED.encode(fakeLib, scene);
  assert.match(stored, /\n\n/);
  assert.equal(COMPRESSED.decode(fakeLib, stored), scene);
});

test("the compressed format reads a drawing Obsidian wrapped differently", () => {
  const scene = '{"elements":[]}';
  const stored = fakeLib.compressToBase64(scene).replace(/(.{4})/g, "$1\n");
  assert.equal(COMPRESSED.decode(fakeLib, stored), scene);
});

test("the compressed format rejects text that does not decode", () => {
  assert.throws(() => COMPRESSED.decode({ decompressFromBase64: () => null }, "garbage"));
});

test("the plain format passes scene JSON through", () => {
  assert.equal(PLAIN.decode(fakeLib, "{}"), "{}");
  assert.equal(PLAIN.encode(fakeLib, "{}"), "{}");
});

test("isObsidianDrawing reads the excalidraw-plugin frontmatter key", () => {
  assert.equal(isObsidianDrawing("excalidraw-plugin: parsed\ntags: [excalidraw]"), true);
  assert.equal(isObsidianDrawing("tags: [excalidraw]\nexcalidraw-plugin:raw"), true);
  assert.equal(isObsidianDrawing("title: Notes\nplugin: excalidraw-plugin"), false);
});

test("findDrawing takes the first json or compressed-json block under Drawing", () => {
  const drawing = code("compressed-json");
  const children = [
    heading("Text Elements"),
    code("json"),
    heading("Drawing"),
    paragraph("%%"),
    drawing,
    code("json"),
  ];
  assert.equal(findDrawing(children), drawing);
});

test("findDrawing ignores code under other headings and other languages", () => {
  assert.equal(findDrawing([heading("Notes"), code("json")]), null);
  assert.equal(findDrawing([heading("Drawing"), code("js")]), null);
  assert.equal(findDrawing([heading("Drawing"), heading("Other"), code("json")]), null);
});

test("an Obsidian drawing renders as its drawing alone", () => {
  const front = yaml("excalidraw-plugin: parsed");
  const drawing = code("compressed-json", "N4Ig");
  const tree = {
    children: [front, paragraph("Switch to EXCALIDRAW VIEW"), heading("Text Elements"), heading("Drawing"), drawing],
  };
  remarkObsidianDrawing()(tree);
  assert.deepEqual(tree.children, [front, drawing]);
  assert.equal(drawing.lang, "excalidraw-compressed");
  assert.equal(drawing.value, "N4Ig");
});

test("an uncompressed Obsidian drawing renders through the plain renderer", () => {
  const drawing = code("json", "{}");
  const tree = { children: [yaml("excalidraw-plugin: raw"), heading("Drawing"), drawing] };
  remarkObsidianDrawing()(tree);
  assert.equal(drawing.lang, "excalidraw");
});

test("other notes keep every node", () => {
  const plain = { children: [yaml("title: Notes"), heading("Drawing"), code("json")] };
  const withoutFrontmatter = { children: [heading("Drawing"), code("compressed-json")] };
  const withoutDrawing = { children: [yaml("excalidraw-plugin: parsed"), paragraph("text")] };
  for (const tree of [plain, withoutFrontmatter, withoutDrawing]) {
    const before = structuredClone(tree);
    remarkObsidianDrawing()(tree);
    assert.deepEqual(tree, before);
  }
});

function closeSave(saved, copy) {
  const calls = { code: [], copied: [], notes: [] };
  const done = saveOnClose({
    updateCode: async (code) => {
      calls.code.push(code);
      return saved;
    },
    code: "encoded",
    scene: "scene",
    copy: async (text) => {
      calls.copied.push(text);
      if (!copy) throw new Error("clipboard denied");
    },
    notify: (message) => calls.notes.push(message),
    t: (key) => key,
  });
  return { done, calls };
}

test("a drawing saved as its editor closes needs nothing else", async () => {
  const { done, calls } = closeSave(true, true);
  await done;
  assert.deepEqual(calls, { code: ["encoded"], copied: [], notes: [] });
});

test("a refused save puts the drawing on the clipboard and says so", async () => {
  const { done, calls } = closeSave(false, true);
  await done;
  assert.deepEqual(calls.copied, ["scene"]);
  assert.deepEqual(calls.notes, ["notSavedCopied"]);
});

test("a refused save the clipboard also refuses still tells the user", async () => {
  const { done, calls } = closeSave(false, false);
  await done;
  assert.deepEqual(calls.notes, ["notSaved"]);
});

test("activate registers both renderers, the file type, and the Obsidian transform", () => {
  const renderers = [];
  const fileTypes = [];
  const remark = [];
  const translations = {};
  plugin.activate({
    registerTranslations: (locale, ns, resources) => {
      translations[locale] = { ns, resources };
    },
    ui: { addStyles: () => () => {} },
    markdown: {
      registerFencedRenderer: (language, render, options) => renderers.push({ language, render, options }),
      registerRemarkPlugin: (plugin) => remark.push(plugin),
    },
    documents: { registerFileType: (type) => fileTypes.push(type) },
  });

  assert.deepEqual(
    renderers.map((r) => r.language),
    ["excalidraw", "excalidraw-compressed"],
  );
  for (const r of renderers) {
    assert.equal(typeof r.render.mount, "function");
    assert.equal(typeof r.options.renderStatic, "function");
  }
  assert.deepEqual(fileTypes, [{ extensions: ["excalidraw"], language: "excalidraw" }]);
  assert.deepEqual(remark, [remarkObsidianDrawing]);

  const keys = Object.keys(translations.en.resources).sort();
  for (const [locale, { ns, resources }] of Object.entries(translations)) {
    assert.equal(ns, "com.glyph.excalidraw");
    assert.deepEqual(Object.keys(resources).sort(), keys, `${locale} has the same keys as en`);
  }
});
