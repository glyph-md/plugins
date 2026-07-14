// Package and release official plugins whose version has no release yet.
// Run by .github/workflows/release-plugins.yml on pushes to main.
//
// For every plugins/<id>/ with "official": true, if the tag <id>-v<version>
// does not exist: build a zip of manifest.json + the manifest-declared files
// (entries use forward slashes), create the release with the zip attached,
// and rewrite the registration's packageUrl + sha256 to match. The workflow
// then regenerates the index and commits everything in one bot commit, so a
// maintainer only ever edits source + versions; packaging, digests, and the
// index take care of themselves.

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const repo = process.env.GITHUB_REPOSITORY ?? "glyph-md/plugins";
const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], ...opts });

const existingTags = new Set(
  run("git", ["tag", "--list"], { cwd: root }).split("\n").filter(Boolean),
);

let releasedAny = false;
for (const dir of readdirSync(join(root, "plugins"), { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const folder = join(root, "plugins", dir.name);
  const reg = JSON.parse(readFileSync(join(folder, "plugin.json"), "utf8"));
  if (!reg.official) continue;

  const manifest = JSON.parse(readFileSync(join(folder, "manifest.json"), "utf8"));
  if (manifest.version !== reg.version) {
    throw new Error(`${reg.id}: manifest.json version ${manifest.version} != plugin.json version ${reg.version}`);
  }
  const tag = `${reg.id}-v${reg.version}`;
  if (existingTags.has(tag) || tagExistsOnRemote(tag)) continue;

  const files = manifest.files ?? [manifest.main ?? "main.js"];
  for (const rel of files) {
    if (!existsSync(join(folder, rel))) throw new Error(`${reg.id}: declared file ${rel} is missing`);
  }

  // bsdtar is not on ubuntu runners by default; Info-ZIP `zip` keeps forward
  // slashes and stores paths relative to the plugin folder.
  mkdirSync(join(root, "dist"), { recursive: true });
  const zipPath = join(root, "dist", `${reg.id}.zip`);
  run("zip", ["-X", "-q", zipPath, "manifest.json", ...files], { cwd: folder });

  const sha256 = createHash("sha256").update(readFileSync(zipPath)).digest("hex");
  run("gh", [
    "release", "create", tag,
    "--repo", repo,
    "--title", `${reg.name} v${reg.version}`,
    "--notes", `Automated package release for ${reg.id} v${reg.version}. sha256: ${sha256}`,
    zipPath,
  ]);

  reg.packageUrl = `https://github.com/${repo}/releases/download/${tag}/${reg.id}.zip`;
  reg.sha256 = sha256;
  writeFileSync(join(folder, "plugin.json"), `${JSON.stringify(reg, null, 2)}\n`);
  console.log(`released ${tag} (${sha256})`);
  releasedAny = true;
}

function tagExistsOnRemote(tag) {
  try {
    run("gh", ["release", "view", tag, "--repo", repo, "--json", "tagName"]);
    return true;
  } catch {
    return false;
  }
}

console.log(releasedAny ? "releases created" : "nothing to release");
