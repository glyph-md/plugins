// Unit tests for the registration/manifest parity check.
// Run from the repo root: node --test

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkAll, checkPlugin, manifestFiles } from "./check-plugins.mjs";
import { fileURLToPath } from "node:url";

const ID = "com.example.demo";
const reg = { id: ID, version: "1.2.0", apiVersion: "0.16.0", official: true };
const manifest = { id: ID, version: "1.2.0", apiVersion: "0.16.0", files: ["main.js"] };
const allPresent = () => true;

describe("checkPlugin", () => {
  it("passes when the registration and the manifest agree", () => {
    assert.deepEqual(checkPlugin(ID, reg, manifest, allPresent), []);
  });

  it("catches the version mismatch that broke the release job", () => {
    const problems = checkPlugin(ID, reg, { ...manifest, version: "1.1.0" }, allPresent);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /manifest\.json version 1\.1\.0 != plugin\.json version 1\.2\.0/);
  });

  it("catches an apiVersion mismatch", () => {
    const problems = checkPlugin(ID, reg, { ...manifest, apiVersion: "0.17.0" }, allPresent);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /apiVersion 0\.17\.0 != plugin\.json apiVersion 0\.16\.0/);
  });

  it("catches a manifest that opts out of the sandbox without saying so in the registration", () => {
    const problems = checkPlugin(ID, reg, { ...manifest, sandbox: false }, allPresent);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /full trust but plugin\.json advertises sandboxed/);
  });

  it("treats an absent sandbox key as sandboxed on both sides", () => {
    assert.deepEqual(checkPlugin(ID, { ...reg, sandbox: true }, manifest, allPresent), []);
    assert.deepEqual(
      checkPlugin(ID, { ...reg, sandbox: false }, { ...manifest, sandbox: false }, allPresent),
      [],
    );
  });

  it("catches an id that does not match the folder name", () => {
    const problems = checkPlugin("com.example.other", reg, manifest, allPresent);
    assert.equal(problems.length, 2);
    assert.ok(problems.every((p) => p.startsWith("com.example.other: ")));
  });

  it("catches a declared file that is not in the folder", () => {
    const problems = checkPlugin(ID, reg, { ...manifest, files: ["main.js", "assets/x.dic"] }, (f) =>
      f === "main.js",
    );
    assert.deepEqual(problems, [`${ID}: declared file assets/x.dic is missing`]);
  });

  it("reports every problem at once instead of stopping at the first", () => {
    const broken = { ...manifest, version: "9.9.9", apiVersion: "0.1.0", sandbox: false };
    assert.equal(checkPlugin(ID, reg, broken, allPresent).length, 3);
  });
});

describe("manifestFiles", () => {
  it("prefers files, falls back to main, then to main.js", () => {
    assert.deepEqual(manifestFiles({ files: ["a.js", "b.dic"], main: "a.js" }), ["a.js", "b.dic"]);
    assert.deepEqual(manifestFiles({ main: "index.js" }), ["index.js"]);
    assert.deepEqual(manifestFiles({}), ["main.js"]);
  });
});

describe("checkAll", () => {
  it("finds no problems in this repo", () => {
    assert.deepEqual(checkAll(fileURLToPath(new URL("..", import.meta.url))), []);
  });
});
