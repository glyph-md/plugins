// German (Germany) spell-check dictionary for Glyph. Hunspell data comes from
// igerman98 (https://www.j3e.de/ispell/igerman98/), GPL-2.0; see LICENSE.
// The dictionary ships as package assets and loads lazily: nothing is read
// until the user picks the language in Settings -> Editor -> Spell Check.
export default {
  activate(ctx) {
    ctx.spellcheck.registerDictionary({
      language: "de",
      label: "Deutsch (German)",
      load: async () => ({
        aff: await ctx.assets.readText("assets/de.aff"),
        dic: await ctx.assets.readText("assets/de.dic"),
      }),
    });
  },
};
