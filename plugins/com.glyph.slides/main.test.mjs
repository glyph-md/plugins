import assert from "node:assert/strict";
import { test } from "node:test";
import { deckHtml, deckMarkup, groupSlides } from "./main.js";

const el = (name, text = "x") => ({ nodeName: name, nodeType: 1, textContent: text });
const text = (value) => ({ nodeName: "#text", nodeType: 3, textContent: value });

test("groupSlides splits at every top-level rule and drops empty slides", () => {
  const h1 = el("H1");
  const p = el("P");
  const img = el("IMG", "");
  const slides = groupSlides([
    el("HR"),
    h1,
    text("\n"),
    p,
    el("HR"),
    text("\n"),
    el("HR"),
    img,
    el("HR"),
  ]);
  assert.deepEqual(slides, [[h1, text("\n"), p], [img]]);
});

test("groupSlides keeps a document without rules as one slide", () => {
  const p = el("P");
  assert.deepEqual(groupSlides([p]), [[p]]);
  assert.deepEqual(groupSlides([]), []);
});

test("deckMarkup wraps each slide in a markdown-styled section", () => {
  const markup = deckMarkup(["<h1>A</h1>", "<p>B</p>"]);
  assert.match(markup, /^<div class="reveal"><div class="slides">/);
  assert.equal(markup.match(/<section><div class="markdown-body" dir="auto">/g).length, 2);
});

test("deckHtml is self-contained and cannot be closed early by its inlined text", () => {
  const html = deckHtml({
    slides: ["<p>Hi</p>"],
    title: 'Q&A <"talk">',
    css: "a::after { content: '</style>' }",
    dark: true,
    revealJs: "var s = '</script>';",
    revealCss: ".reveal {}",
  });
  assert.match(html, /<html lang="en" class="dark">/);
  assert.match(html, /<title>Q&amp;A &lt;&quot;talk&quot;&gt;<\/title>/);
  assert.equal(html.match(/<\/script>/g).length, 2);
  assert.equal(html.match(/<\/style>/g).length, 3);
  assert.match(html, /Reveal\.initialize\(\{"hash":false/);
  assert.doesNotMatch(html, /<link |<script src=/);
});

test("deckHtml follows a light theme", () => {
  const html = deckHtml({ slides: [], title: "", css: "", dark: false, revealJs: "", revealCss: "" });
  assert.match(html, /<html lang="en">/);
});
