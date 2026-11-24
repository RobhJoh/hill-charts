const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
const LENGTH = 10;

/**
 * A random id of 10 lowercase letters and digits (about 51 bits). It never
 * contains "-", so URLs of the form `/p/<id>-<namn>` split unambiguously at
 * the first "-".
 */
export function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(LENGTH));
  let id = "";
  // 252 is the largest multiple of 36 below 256; rejecting bytes above it
  // keeps every character equally likely.
  for (const byte of bytes) id += byte < 252 ? ALPHABET[byte % 36] : "";
  return id.length === LENGTH ? id : id + randomId().slice(id.length);
}
