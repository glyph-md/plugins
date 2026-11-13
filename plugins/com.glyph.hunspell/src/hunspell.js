import { Hunspell } from "hunspell-wasm";
import createModule from "hunspell-wasm/wasm/hunspell.js";

// The plugin imports this bundle from a blob URL, where the engine cannot find
// its .wasm next to itself, so it is handed the bytes, and `locateFile` keeps
// it from resolving a path against the blob URL at all.
export async function loadHunspell(wasmBinary) {
  const module = await createModule({ wasmBinary, locateFile: (file) => file });
  return {
    create: (aff, dic) => new Hunspell(module, aff, dic),
    // Every dictionary shares this one heap, which never shrinks.
    heapBytes: () => module.HEAPU8.length,
  };
}
