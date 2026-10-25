// Injected in place of every bare `fetch` in the bundle (esbuild `inject`).
// Excalidraw reads its fonts back with fetch to embed them in exported SVG,
// and Glyph's CSP has no `data:` in connect-src, so the inlined fonts are
// decoded here. Anything else is refused: a drawing never reaches the network.

async function offlineFetch(input) {
  const url = typeof input === "string" ? input : String(input?.url ?? input);
  if (!url.startsWith("data:")) {
    throw new TypeError("The Excalidraw plugin makes no network requests");
  }
  const comma = url.indexOf(",");
  const meta = url.slice(5, comma);
  const payload = url.slice(comma + 1);
  const body = meta.endsWith(";base64")
    ? Uint8Array.from(atob(payload), (char) => char.charCodeAt(0))
    : new TextEncoder().encode(decodeURIComponent(payload));
  return new Response(body, { headers: { "Content-Type": meta.split(";")[0] || "text/plain" } });
}

export { offlineFetch as fetch };
