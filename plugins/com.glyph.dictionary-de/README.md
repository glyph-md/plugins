# German Dictionary

German (Germany) spell-check dictionary: adds Deutsch to Settings → Editor → Spell Check. Hunspell data comes from [igerman98](https://www.j3e.de/ispell/igerman98/index_en.html) (GPL-2.0, see LICENSE) and ships as package assets, loaded lazily through `ctx.assets` only when the language is selected.

Install the [Hunspell](../com.glyph.hunspell) plugin from the marketplace with it (Glyph 0.28.0 or later): Glyph's built-in checker ignores the compound rules this dictionary relies on and underlines Fußball, Rechtschreibprüfung and every other compound.

- **Permissions**: none
- **Sandbox**: yes
- **Package**: [release zip](https://github.com/glyph-md/plugins/releases/tag/com.glyph.dictionary-de-v1.0.0)
