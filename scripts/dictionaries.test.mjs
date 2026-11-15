// Word lists for the official dictionaries, checked with the Hunspell plugin's
// engine exactly as it ships (its built bundle, WebAssembly and text handling),
// which German's compound words need. A dictionary update that stops accepting
// common words or stops suggesting the obvious fix fails here before it is
// released. Each one
// must also list its LICENSE, since the release zip carries only the files its
// manifest declares and every dictionary's license requires shipping the text.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { loadHunspell } from "../plugins/com.glyph.hunspell/assets/hunspell.js";
import { createChecker } from "../plugins/com.glyph.hunspell/main.js";

const LISTS = {
  de: {
    correct: [
      "gehen",
      "ging",
      "Häuser",
      "Straße",
      "Fußball",
      "Kindergarten",
      "Haustür",
      "Bundesregierung",
      "Arbeitszimmer",
      "Rechtschreibprüfung",
    ],
    corrections: { Hauz: "Haus", Strasse: "Straße", Fusball: "Fußball" },
    flagged: ["gehn"],
  },
  es: {
    correct: ["canción", "niño", "había", "comiéndoselo", "dámelo", "corazón", "estábamos"],
    corrections: { cancion: "canción", corazon: "corazón" },
    flagged: [],
  },
  fa: {
    correct: ["سلام", "کتاب", "خانه", "دانشگاه", "می‌روم", "کتاب‌ها", "کتابخانه", "دانشجو"],
    corrections: { کتاپ: "کتاب", سلاام: "سلام" },
    flagged: [],
  },
};

const engine = await loadHunspell(
  readFileSync(new URL("../plugins/com.glyph.hunspell/assets/hunspell.wasm", import.meta.url)),
);

function asset(language, extension) {
  const url = new URL(
    `../plugins/com.glyph.dictionary-${language}/assets/${language}.${extension}`,
    import.meta.url,
  );
  return readFileSync(url, "utf8");
}

for (const [language, list] of Object.entries(LISTS)) {
  test(`com.glyph.dictionary-${language} checks and corrects its word list`, async () => {
    const checker = createChecker(engine, asset(language, "aff"), asset(language, "dic"));
    try {
      for (const word of list.correct) {
        assert.ok(checker.correct(word), `${word} should be accepted`);
      }
      for (const [typo, fix] of Object.entries(list.corrections)) {
        assert.ok(!checker.correct(typo), `${typo} should be flagged`);
        const suggestions = checker.suggest(typo);
        assert.ok(suggestions.includes(fix), `${typo} should suggest ${fix}, got ${suggestions}`);
      }
      for (const typo of list.flagged) {
        assert.ok(!checker.correct(typo), `${typo} should be flagged`);
        assert.ok(checker.suggest(typo).length > 0, `${typo} has no suggestions`);
      }
    } finally {
      checker.dispose();
    }
  });

  test(`com.glyph.dictionary-${language} packages its LICENSE`, () => {
    const manifest = JSON.parse(
      readFileSync(new URL(`../plugins/com.glyph.dictionary-${language}/manifest.json`, import.meta.url), "utf8"),
    );
    assert.ok(manifest.files.includes("LICENSE"), "manifest.json files must list LICENSE");
  });
}
