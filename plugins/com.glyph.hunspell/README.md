# Hunspell

Checks spelling with [Hunspell](https://github.com/hunspell/hunspell), compiled to WebAssembly, in place of Glyph's built-in spell checker. The built-in one reads the common dictionary rules but not compounding, so German, which builds words from parts (Fußball, Rechtschreibprüfung), needs this plugin. Every installed dictionary is checked with it, English included.

The engine loads the first time a dictionary is checked, not when the plugin starts. Disabling or removing the plugin switches every dictionary back to the built-in checker.

- **Permissions**: none
- **Sandbox**: no. The editor checks each word as it paints, so the engine has to answer at once, from the main context.
- **Requires**: Glyph 0.28.0 or later

## Building

`main.js` is written by hand. `assets/hunspell.js` is built from `src/` with esbuild, and `assets/hunspell.wasm` is copied from the `hunspell-wasm` package:

```bash
npm ci --ignore-scripts
npm run build
npm test
```

Hunspell and hunspell-wasm ship under MPL 1.1, and the Emscripten runtime in `assets/hunspell.js` under MIT; see LICENSE.
