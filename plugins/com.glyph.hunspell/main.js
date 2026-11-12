// Checks every spell-check dictionary with Hunspell, compiled to WebAssembly,
// in place of Glyph's built-in checker, which skips compound words. The engine
// loads on the first dictionary checked, not when the plugin starts.

const LIBRARY = "assets/hunspell.js";
const WASM = "assets/hunspell.wasm";

const BYTE_ORDER_MARK = 0xfeff;

// Glyph hands over decoded text and the engine reads it back as UTF-8, so the
// affix file's own SET line, or Hunspell's ISO-8859-1 default when it has
// none, would misread every non-ASCII letter.
export function declareUtf8(aff) {
  const text = aff.charCodeAt(0) === BYTE_ORDER_MARK ? aff.slice(1) : aff;
  return `SET UTF-8\n${text.replace(/^SET\b.*$/gm, "")}`;
}

// Hunspell sizes its word table from the .dic's first line before it reads a
// word, so a few bytes claiming 500 million words would hold the engine's
// memory at its 2 GB ceiling. Count the lines that are there instead, without
// splitting millions of them into an array first.
export function countWords(dic) {
  const newline = dic.indexOf("\n");
  const words = newline === -1 ? "" : dic.slice(newline + 1);
  let lines = 1;
  for (let at = words.indexOf("\n"); at !== -1; at = words.indexOf("\n", at + 1)) lines++;
  return `${lines}\n${words}`;
}

// Glyph frees a checker once its dictionary or this engine is replaced, and
// never calls it again.
export function createChecker(engine, aff, dic) {
  const hunspell = engine.create(declareUtf8(aff), countWords(dic));
  return {
    correct: (word) => hunspell.testSpelling(word),
    suggest: (word) => hunspell.getSpellingSuggestions(word),
    add: (word) => hunspell.addWord(word),
    dispose: () => hunspell.dispose(),
  };
}

async function importLibrary(source) {
  const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
  try {
    return await import(/* @vite-ignore */ url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default {
  activate(ctx) {
    // One engine for every dictionary; a failed load is dropped so the next
    // dictionary tries again.
    let engine;
    const loadEngine = () => {
      engine ??= Promise.all([ctx.assets.readText(LIBRARY), ctx.assets.readBinary(WASM)])
        .then(async ([source, wasm]) => (await importLibrary(source)).loadHunspell(wasm))
        .catch((err) => {
          engine = undefined;
          throw err;
        });
      return engine;
    };

    ctx.spellcheck.registerEngine({
      async create(aff, dic) {
        return createChecker(await loadEngine(), aff, dic);
      },
    });
  },
};
