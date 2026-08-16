// Check plugins/<id>/plugin.json (the registration index.json is built from)
// against plugins/<id>/manifest.json (what ships inside the release zip).
//
// The release job packages the manifest but publishes the registration, so
// drift between the two either breaks the release outright (version) or ships a
// catalog entry that misdescribes the package (apiVersion, sandbox). This runs
// standalone from validate.yml on every PR and is imported by
// release-official.mjs, so a mismatch fails the PR instead of the post-merge
// release job, which cannot be fixed by re-running it.
//
// Run from the repo root: node scripts/check-plugins.mjs

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Files the release zip carries next to manifest.json. */
export function manifestFiles(manifest) {
  return manifest.files ?? [manifest.main ?? "main.js"];
}

// Absent means sandboxed on both sides; only an explicit false opts into full
// trust, which the marketplace has to warn about before the download starts.
const sandboxed = (o) => o.sandbox !== false;

/** Problems with a registration on its own, prefixed with the folder name. */
export function checkRegistration(id, reg) {
  return reg.id === id
    ? []
    : [`${id}: plugin.json declares id "${reg.id}"; the folder name must equal the id`];
}

/**
 * Problems with one plugin folder, each prefixed with the folder name; an empty
 * array means the registration and the manifest agree. `hasFile(rel)` reports
 * whether a manifest-declared file exists in the folder.
 */
export function checkPlugin(id, reg, manifest, hasFile) {
  const problems = checkRegistration(id, reg);
  const bad = (msg) => problems.push(`${id}: ${msg}`);

  if (manifest.id !== id) bad(`manifest.json declares id "${manifest.id}"; the folder name must equal the id`);
  if (manifest.version !== reg.version) {
    bad(`manifest.json version ${manifest.version} != plugin.json version ${reg.version}`);
  }
  if (manifest.apiVersion !== reg.apiVersion) {
    bad(`manifest.json apiVersion ${manifest.apiVersion} != plugin.json apiVersion ${reg.apiVersion}`);
  }
  if (sandboxed(manifest) !== sandboxed(reg)) {
    bad(
      `manifest.json runs ${sandboxed(manifest) ? "sandboxed" : "full trust"} but plugin.json advertises ` +
        `${sandboxed(reg) ? "sandboxed" : "full trust"}; the marketplace consent prompt reads the registration`,
    );
  }
  for (const rel of manifestFiles(manifest)) {
    if (!hasFile(rel)) bad(`declared file ${rel} is missing`);
  }
  return problems;
}

/** Every problem across plugins/, in folder order. */
export function checkAll(root) {
  const problems = [];
  for (const dir of readdirSync(join(root, "plugins"), { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const folder = join(root, "plugins", dir.name);
    const reg = JSON.parse(readFileSync(join(folder, "plugin.json"), "utf8"));
    const manifestPath = join(folder, "manifest.json");
    if (!existsSync(manifestPath)) {
      // Community plugins are packaged in their own repos and register only a
      // packageUrl; official plugins keep their source, and its manifest, here.
      if (reg.official) problems.push(`${dir.name}: official plugin has no manifest.json`);
      problems.push(...checkRegistration(dir.name, reg));
      continue;
    }
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    problems.push(...checkPlugin(dir.name, reg, manifest, (rel) => existsSync(join(folder, rel))));
  }
  return problems;
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) {
  const problems = checkAll(fileURLToPath(new URL("..", import.meta.url)));
  for (const problem of problems) console.error(problem);
  if (problems.length) process.exit(1);
  console.log("plugin registrations and manifests agree");
}
