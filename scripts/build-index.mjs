// Generate index.json and docs/plugin-catalog.md from plugins/*/plugin.json.
// Run from the repo root: node scripts/build-index.mjs
// Both outputs are generated files: don't hand-edit them. CI regenerates them
// on every merge to main and rejects PRs that modify them directly.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const CATEGORY_LABELS = {
  themes: "Themes",
  markdown: "Markdown",
  exporters: "Exporters",
  tools: "Tools",
  integrations: "Integrations",
  language: "Language",
  ai: "AI",
};

const root = fileURLToPath(new URL("..", import.meta.url));
const pluginDirs = readdirSync(join(root, "plugins"), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const entries = pluginDirs.map((dir) => {
  const reg = JSON.parse(readFileSync(join(root, "plugins", dir, "plugin.json"), "utf8"));
  if (reg.id !== dir) {
    throw new Error(`plugins/${dir}/plugin.json declares id "${reg.id}"; the folder name must equal the id`);
  }
  const { $schema, ...entry } = reg;
  return entry;
});

// index.json: the aggregate the app fetches. Same URL as always.
const index = {
  $schema: "https://raw.githubusercontent.com/glyph-md/plugins/main/index.schema.json",
  plugins: entries,
};
writeFileSync(join(root, "index.json"), `${JSON.stringify(index, null, 2)}\n`);

// index/<category>.json shards + index/meta.json: clients that outgrow the
// aggregate can fetch one category (or just the counts) instead of everything.
mkdirSync(join(root, "index"), { recursive: true });
const meta = { categories: {} };
for (const category of Object.keys(CATEGORY_LABELS)) {
  const shard = entries.filter((e) => e.category === category);
  meta.categories[category] = shard.length;
  writeFileSync(
    join(root, "index", `${category}.json`),
    `${JSON.stringify({ plugins: shard }, null, 2)}\n`,
  );
}
writeFileSync(join(root, "index", "meta.json"), `${JSON.stringify(meta, null, 2)}\n`);

// docs/plugin-catalog.md: grouped by category, one blurb per plugin linking
// its folder README (the full catalog page).
const byCategory = new Map();
for (const e of entries) {
  const list = byCategory.get(e.category) ?? [];
  list.push(e);
  byCategory.set(e.category, list);
}
let catalog = `# Plugin Catalog

<!-- GENERATED FILE: do not edit. Run \`node scripts/build-index.mjs\` after changing any plugins/<id>/plugin.json. -->

Every published plugin, grouped by category. Each entry links the plugin's own README (its catalog page, kept next to its registration in \`plugins/<id>/\`).
`;
for (const [category, list] of [...byCategory.entries()].sort()) {
  catalog += `\n## ${CATEGORY_LABELS[category] ?? category}\n`;
  for (const e of list) {
    const badges = [
      e.official ? "official" : null,
      e.sandbox ? "sandboxed" : null,
      e.permissions?.length ? `permissions: ${e.permissions.join(", ")}` : "no permissions",
    ]
      .filter(Boolean)
      .join(" · ");
    catalog += `\n### [${e.name}](../plugins/${e.id}/README.md)\n\n\`${e.id}\` v${e.version} · ${badges}\n\n${e.description ?? ""}\n`;
  }
}
writeFileSync(join(root, "docs", "plugin-catalog.md"), catalog);
console.log(`generated index.json + category shards (${entries.length} plugins) and docs/plugin-catalog.md`);
