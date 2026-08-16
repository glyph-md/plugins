// Smoke test for scripts/release-official.mjs: the real script, run end to end
// against a throwaway repo whose `gh` is a stub, so packaging, digests and the
// registration rewrite are exercised for real while nothing can reach GitHub.
//
// POSIX only (the gh stub is a shell script, and packaging needs Info-ZIP
// `zip`), so it skips on Windows and runs for real on the CI runner.
// Run from the repo root: node --test

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const scriptsDir = fileURLToPath(new URL(".", import.meta.url));
const hasZip = spawnSync("zip", ["-h"]).error === undefined;
const skip =
  process.platform === "win32"
    ? "POSIX only: the gh stub is a shell script"
    : !hasZip && "Info-ZIP `zip` is not installed";

const MANIFEST = {
  id: "com.example.demo",
  name: "Demo",
  version: "1.1.0",
  apiVersion: "0.16.0",
  sandbox: false,
  files: ["main.js"],
};
const REGISTRATION = {
  id: "com.example.demo",
  name: "Demo",
  version: "1.1.0",
  apiVersion: "0.16.0",
  sandbox: false,
  category: "tools",
  official: true,
  packageUrl: "https://github.com/glyph-md/plugins/releases/download/com.example.demo-v1.0.0/com.example.demo.zip",
  sha256: "0".repeat(64),
};

const temps = [];
after(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

/** A repo containing the real scripts, a gh stub, and the given plugin folders. */
function setupRepo(plugins) {
  const dir = mkdtempSync(join(tmpdir(), "release-official-"));
  temps.push(dir);
  cpSync(scriptsDir, join(dir, "scripts"), { recursive: true });

  for (const [id, { manifest, registration, files = { "main.js": "export function activate() {}\n" } }] of Object.entries(plugins)) {
    const folder = join(dir, "plugins", id);
    mkdirSync(folder, { recursive: true });
    if (manifest) writeFileSync(join(folder, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    writeFileSync(join(folder, "plugin.json"), `${JSON.stringify(registration, null, 2)}\n`);
    for (const [rel, body] of Object.entries(files)) writeFileSync(join(folder, rel), body);
  }

  const git = (...args) => execFileSync("git", args, { cwd: dir, stdio: "ignore" });
  git("init", "-q");
  git("-c", "user.email=t@example.com", "-c", "user.name=t", "commit", "-q", "--allow-empty", "-m", "fixture");

  // Records every call so a test can assert what the script asked GitHub for;
  // `release view` fails by default, meaning "no such release yet".
  const bin = join(dir, "bin");
  mkdirSync(bin);
  writeFileSync(
    join(bin, "gh"),
    '#!/bin/sh\nprintf "%s\\n" "$@" >> "$GH_LOG"\n[ "$1 $2" = "release view" ] && exit "${GH_VIEW_EXIT:-1}"\nexit 0\n',
  );
  chmodSync(join(bin, "gh"), 0o755);
  return dir;
}

function release(dir, env = {}) {
  const ghLog = join(dir, "gh.log");
  const result = spawnSync(process.execPath, [join(dir, "scripts", "release-official.mjs")], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${join(dir, "bin")}:${process.env.PATH}`, GH_LOG: ghLog, ...env },
  });
  return { ...result, gh: existsSync(ghLog) ? readFileSync(ghLog, "utf8").split("\n") : [] };
}

const readRegistration = (dir, id) =>
  JSON.parse(readFileSync(join(dir, "plugins", id, "plugin.json"), "utf8"));

describe("release-official", { skip }, () => {
  it("packages the plugin, creates the release, and rewrites packageUrl and sha256", () => {
    const dir = setupRepo({ "com.example.demo": { manifest: MANIFEST, registration: REGISTRATION } });
    const { status, stdout, gh } = release(dir);
    assert.equal(status, 0, stdout);

    const zip = join(dir, "dist", "com.example.demo.zip");
    const entries = execFileSync("unzip", ["-Z1", zip], { encoding: "utf8" }).split("\n").filter(Boolean);
    assert.deepEqual(entries.sort(), ["main.js", "manifest.json"]);

    const sha256 = createHash("sha256").update(readFileSync(zip)).digest("hex");
    const reg = readRegistration(dir, "com.example.demo");
    assert.equal(reg.sha256, sha256);
    assert.equal(
      reg.packageUrl,
      "https://github.com/glyph-md/plugins/releases/download/com.example.demo-v1.1.0/com.example.demo.zip",
    );
    assert.ok(gh.includes("create"), "gh release create was not called");
    assert.ok(gh.includes("com.example.demo-v1.1.0"), "the release was not tagged with the new version");
    assert.match(stdout, /releases created/);
  });

  it("fails on a manifest/registration version mismatch instead of releasing", () => {
    const dir = setupRepo({
      "com.example.demo": { manifest: MANIFEST, registration: { ...REGISTRATION, version: "1.0.0" } },
    });
    const { status, stderr, gh } = release(dir);
    assert.equal(status, 1);
    assert.match(stderr, /manifest\.json version 1\.1\.0 != plugin\.json version 1\.0\.0/);
    assert.ok(!gh.includes("create"), "a mismatched plugin must not be released");
    assert.equal(readRegistration(dir, "com.example.demo").version, "1.0.0");
  });

  it("fails when the manifest declares a file the folder does not have", () => {
    const dir = setupRepo({
      "com.example.demo": {
        manifest: { ...MANIFEST, files: ["main.js", "assets/data.dic"] },
        registration: REGISTRATION,
      },
    });
    const { status, stderr, gh } = release(dir);
    assert.equal(status, 1);
    assert.match(stderr, /declared file assets\/data\.dic is missing/);
    assert.ok(!gh.includes("create"), "an incomplete package must not be released");
  });

  it("skips a version whose release already exists on the remote", () => {
    const dir = setupRepo({ "com.example.demo": { manifest: MANIFEST, registration: REGISTRATION } });
    const { status, stdout, gh } = release(dir, { GH_VIEW_EXIT: "0" });
    assert.equal(status, 0, stdout);
    assert.match(stdout, /nothing to release/);
    assert.ok(!gh.includes("create"), "an already-released version must not be re-released");
    assert.equal(readRegistration(dir, "com.example.demo").packageUrl, REGISTRATION.packageUrl);
  });

  it("skips a version already tagged locally without asking GitHub", () => {
    const dir = setupRepo({ "com.example.demo": { manifest: MANIFEST, registration: REGISTRATION } });
    execFileSync("git", ["tag", "com.example.demo-v1.1.0"], { cwd: dir, stdio: "ignore" });
    const { status, stdout, gh } = release(dir);
    assert.equal(status, 0, stdout);
    assert.match(stdout, /nothing to release/);
    assert.deepEqual(gh, []);
  });

  it("ignores community registrations, which have no source here", () => {
    const dir = setupRepo({
      "com.example.community": { registration: { ...REGISTRATION, id: "com.example.community", official: undefined } },
    });
    const { status, stdout, gh } = release(dir);
    assert.equal(status, 0, stdout);
    assert.match(stdout, /nothing to release/);
    assert.deepEqual(gh, []);
  });
});
