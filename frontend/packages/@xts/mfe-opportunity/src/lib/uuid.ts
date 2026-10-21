// crypto.randomUUID() is only exposed in a secure context (HTTPS or
// localhost) — this app is also served over plain HTTP on a bare IP (e.g.
// the AWS deploy), where Chrome hides the API entirely even though the
// underlying RNG (crypto.getRandomValues) is still available there. A
// plain function called directly at each use site, rather than a
// side-effect polyfill import, so it works regardless of which chunk
// webpack happens to split it into.
export function randomUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
