export function safeRandomId(prefix = "id") {
  const cryptoObj = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return cryptoObj.randomUUID();
  }
  const rand = Math.random().toString(16).slice(2);
  return `${prefix}-${Date.now()}-${rand}`;
}

