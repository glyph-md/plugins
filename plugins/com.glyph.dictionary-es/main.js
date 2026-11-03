// Spanish spell-check dictionary for Glyph. Hunspell data comes from RLA-ES
// (https://github.com/sbosio/rla-es), distributed here under MPL-1.1; see
// LICENSE. The dictionary ships as package assets and loads lazily: nothing is
// read until the user picks the language in Settings -> Editor -> Spell Check.
export default {
  activate(ctx) {
    ctx.spellcheck.registerDictionary({
      language: "es",
      label: "Español (Spanish)",
      load: async () => ({
        aff: await ctx.assets.readText("assets/es.aff"),
        dic: await ctx.assets.readText("assets/es.dic"),
      }),
    });
  },
};
