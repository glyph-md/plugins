// Persian (Farsi) spell-check dictionary for Glyph. Hunspell data comes from
// the Lilak project (https://github.com/b00f/lilak), Apache-2.0; see LICENSE.
// The dictionary ships as package assets and loads lazily: nothing is read
// until the user picks the language in Settings -> Editor -> Spell Check.
export default {
  activate(ctx) {
    ctx.spellcheck.registerDictionary({
      language: "fa",
      label: "فارسی (Persian)",
      load: async () => ({
        aff: await ctx.assets.readText("assets/fa.aff"),
        dic: await ctx.assets.readText("assets/fa.dic"),
      }),
    });
  },
};
