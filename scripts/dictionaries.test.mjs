// Word lists for the official dictionaries, checked with the engine the app runs
// them on: Hunspell compiled to WebAssembly, pinned in package.json to the
// version Glyph ships. A dictionary update that stops accepting common words or
// stops suggesting the obvious fix fails here before it is released. Each one
// must also list its LICENSE, since the release zip carries only the files its
// manifest declares and every dictionary's license requires shipping the text.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createHunspellFromStrings } from "hunspell-wasm";

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

function asset(language, extension) {
  const url = new URL(
    `../plugins/com.glyph.dictionary-${language}/assets/${language}.${extension}`,
    import.meta.url,
  );
  return readFileSync(url, "utf8");
}

for (const [language, list] of Object.entries(LISTS)) {
  test(`com.glyph.dictionary-${language} checks and corrects its word list`, async () => {
    const hunspell = await createHunspellFromStrings(asset(language, "aff"), asset(language, "dic"));
    try {
      for (const word of list.correct) {
        assert.ok(hunspell.testSpelling(word), `${word} should be accepted`);
      }
      for (const [typo, fix] of Object.entries(list.corrections)) {
        assert.ok(!hunspell.testSpelling(typo), `${typo} should be flagged`);
        const suggestions = hunspell.getSpellingSuggestions(typo);
        assert.ok(suggestions.includes(fix), `${typo} should suggest ${fix}, got ${suggestions}`);
      }
      for (const typo of list.flagged) {
        assert.ok(!hunspell.testSpelling(typo), `${typo} should be flagged`);
        assert.ok(hunspell.getSpellingSuggestions(typo).length > 0, `${typo} has no suggestions`);
      }
    } finally {
      hunspell.dispose();
    }
  });

  test(`com.glyph.dictionary-${language} packages its LICENSE`, () => {
    const manifest = JSON.parse(
      readFileSync(new URL(`../plugins/com.glyph.dictionary-${language}/manifest.json`, import.meta.url), "utf8"),
    );
    assert.ok(manifest.files.includes("LICENSE"), "manifest.json files must list LICENSE");
  });
}
