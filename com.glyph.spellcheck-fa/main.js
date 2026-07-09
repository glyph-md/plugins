// Persian (Farsi) spell-check dictionary for Glyph.
//
// Registers فارسی in Settings → Editor → Spell Check. The Hunspell dictionary
// is the Lilak project's, published as `dictionary-fa` (Apache-2.0) in the
// wooorm/dictionaries collection, fetched from jsDelivr the first time the
// language is selected; Glyph caches the parsed checker for the session.
// Pinned to an exact version so the fetched content never changes under us.
const DICTIONARY_BASE = "https://cdn.jsdelivr.net/npm/dictionary-fa@2.0.0";

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.text();
}

export default {
  activate(ctx) {
    ctx.spellcheck.registerDictionary({
      language: "fa",
      label: "فارسی (Persian)",
      async load() {
        const [aff, dic] = await Promise.all([
          fetchText(`${DICTIONARY_BASE}/index.aff`),
          fetchText(`${DICTIONARY_BASE}/index.dic`),
        ]);
        return { aff, dic };
      },
    });
  },
};
