import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { loadHunspell } from "./assets/hunspell.js";
import plugin, { countWords, createChecker, declareUtf8 } from "./main.js";

// A tiny dictionary exercising what German dictionaries rely on: compound
// begin/middle/end parts, a part valid only inside a compound, a suffix allowed
// inside a compound, and a homonym whose plain entry must survive a
// compound-only twin.
const AFF = [
  "SET UTF-8",
  "TRY esianrtolcdugmphbyfvkwqxz",
  "COMPOUNDBEGIN B",
  "COMPOUNDMIDDLE M",
  "COMPOUNDEND E",
  "ONLYINCOMPOUND O",
  "COMPOUNDPERMITFLAG P",
  "COMPOUNDMIN 1",
  "SFX S Y 1",
  "SFX S 0 s/P .",
  "SFX D Y 1",
  "SFX D 0 ed .",
].join("\n");
const DIC = ["7", "sun/BE", "flower/E", "field/ME", "stone/BO", "walk/E", "walk/BO", "work/BSD"].join(
  "\n",
);

const engine = await loadHunspell(readFileSync(new URL("./assets/hunspell.wasm", import.meta.url)));

function withChecker(aff, dic, run) {
  const checker = createChecker(engine, aff, dic);
  try {
    run(checker);
  } finally {
    checker.dispose();
  }
}

test("accepts compounds built from begin, middle and end parts", () => {
  withChecker(AFF, DIC, (checker) => {
    assert.ok(checker.correct("sunflower"));
    assert.ok(checker.correct("sunfieldflower"));
    // "flower" may only end a compound.
    assert.ok(!checker.correct("flowersun"));
  });
});

test("flags a compound-only part on its own but accepts it inside a compound", () => {
  withChecker(AFF, DIC, (checker) => {
    assert.ok(!checker.correct("stone"));
    assert.ok(checker.correct("stoneflower"));
  });
});

test("keeps a homonym's plain entry valid next to its compound-only twin", () => {
  withChecker(AFF, DIC, (checker) => {
    assert.ok(checker.correct("walk"));
    assert.ok(checker.correct("walkflower"));
  });
});

test("allows inside a compound only the suffixes that permit it", () => {
  withChecker(AFF, DIC, (checker) => {
    assert.ok(checker.correct("worksflower"));
    assert.ok(checker.correct("worked"));
    assert.ok(!checker.correct("workedflower"));
  });
});

test("suggests the correction and accepts an added word", () => {
  withChecker(AFF, DIC, (checker) => {
    assert.ok(checker.suggest("flowr").includes("flower"));
    assert.ok(!checker.correct("glyph"));
    checker.add("glyph");
    assert.ok(checker.correct("glyph"));
  });
});

test("reads the text as given whatever encoding the affix file declares", () => {
  const bom = String.fromCharCode(0xfeff);
  for (const aff of ["", "SET ISO8859-1\nTRY eéc", `${bom}SET ISO8859-15\n`]) {
    withChecker(aff, "2\nécole\nfiancé\n", (checker) => {
      // Capitalizing and suggesting both read the characters, not just bytes.
      assert.ok(checker.correct("École"), JSON.stringify(aff));
      assert.ok(checker.suggest("fiance").includes("fiancé"), JSON.stringify(aff));
    });
  }
  assert.equal(declareUtf8(`${bom}SET ISO8859-1\nTRY e`), "SET UTF-8\n\nTRY e");
});

test("sizes a dictionary by its words, not by the count it claims", () => {
  assert.equal(countWords("536000000\nword\n"), "2\nword\n");
  assert.equal(countWords("1"), "1\n");
  // Taken at its word, this count would hold the shared heap at 2 GB.
  withChecker("", "536000000\nword\n", (checker) => assert.ok(checker.correct("word")));
  assert.ok(engine.heapBytes() < 64 * 1024 * 1024, `heap is ${engine.heapBytes()} bytes`);
  withChecker(AFF, DIC, (checker) => assert.ok(checker.correct("sunflower")));
});

test("survives malformed dictionaries without breaking the next one", () => {
  const noise = String.fromCharCode(0, 0xffff, 0xd800);
  const malformed = [
    ["", ""],
    [noise, `not a count\n${String.fromCharCode(0)}`],
    ["", "999999999\nword\n"],
    ["FLAG num\n", "2\nword/99999999\nother/0,70000,-5\n"],
    ["AF 2\nAF A\nAF B\n", "2\nword/7\nother/-1\n"],
    ["COMPOUNDRULE 1\nCOMPOUNDRULE (((((\n", "1\na/(\n"],
    ["PFX A Y 999999\n", "1\nword/A\n"],
  ];
  for (const [aff, dic] of malformed) withChecker(aff, dic, (checker) => checker.suggest("word"));
  withChecker(AFF, DIC, (checker) => {
    assert.ok(checker.correct("sunflower"));
    assert.ok(!checker.correct("flowersun"));
  });
});

// Node cannot import a blob URL, so the plugin's import of its bundle is
// pointed at the file on disk.
function fakeContext({ failFirstRead = false } = {}) {
  const reads = [];
  let failNext = failFirstRead;
  const read = (path) => {
    reads.push(path);
    if (failNext) {
      failNext = false;
      return Promise.reject(new Error("asset missing"));
    }
    return Promise.resolve(readFileSync(new URL(path, import.meta.url)));
  };
  const ctx = {
    assets: {
      readText: async (path) => (await read(path)).toString("utf8"),
      readBinary: async (path) => new Uint8Array(await read(path)),
    },
    spellcheck: {
      registerEngine(engine) {
        ctx.engine = engine;
        return () => {};
      },
    },
  };
  return { ctx, reads };
}

async function withBundleImports(run) {
  const { createObjectURL, revokeObjectURL } = URL;
  URL.createObjectURL = () => new URL("./assets/hunspell.js", import.meta.url).href;
  URL.revokeObjectURL = () => {};
  try {
    await run();
  } finally {
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
  }
}

test("registers an engine that loads once, on the first dictionary", async () => {
  await withBundleImports(async () => {
    const { ctx, reads } = fakeContext();
    plugin.activate(ctx);
    assert.deepEqual(reads, []);

    const checkers = await Promise.all([ctx.engine.create(AFF, DIC), ctx.engine.create(AFF, DIC)]);
    assert.deepEqual(reads.sort(), ["assets/hunspell.js", "assets/hunspell.wasm"]);
    assert.ok(checkers.every((checker) => checker.correct("sunflower")));
    for (const checker of checkers) checker.dispose();
  });
});

test("loads the engine again after a failed read", async () => {
  await withBundleImports(async () => {
    const { ctx } = fakeContext({ failFirstRead: true });
    plugin.activate(ctx);
    await assert.rejects(ctx.engine.create(AFF, DIC), /asset missing/);

    const checker = await ctx.engine.create(AFF, DIC);
    assert.ok(checker.correct("sunflower"));
    checker.dispose();
  });
});
