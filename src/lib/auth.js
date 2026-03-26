const AUTH_KEY = "rajd-admin-auth";
const SESSION_MS = 15 * 60 * 1000;

function toBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(base64) {
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

async function deriveBits(password, salt) {
  const encoder = new TextEncoder();
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  return crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 120000,
      hash: "SHA-256"
    },
    material,
    256
  );
}

export async function setupAdminPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hashBuffer = await deriveBits(password, salt);
  const payload = {
    salt: toBase64(salt),
    hash: toBase64(hashBuffer),
    createdAt: new Date().toISOString()
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(payload));
}

export function hasAdminPassword() {
  return Boolean(localStorage.getItem(AUTH_KEY));
}

export async function verifyAdminPassword(password) {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) {
    return false;
  }

  const payload = JSON.parse(raw);
  const salt = fromBase64(payload.salt);
  const hashBuffer = await deriveBits(password, salt);
  return toBase64(hashBuffer) === payload.hash;
}

export function createSession() {
  const expiresAt = Date.now() + SESSION_MS;
  sessionStorage.setItem("rajd-admin-session", String(expiresAt));
  return expiresAt;
}

export function clearSession() {
  sessionStorage.removeItem("rajd-admin-session");
}

export function getSessionExpiry() {
  const raw = sessionStorage.getItem("rajd-admin-session");
  return raw ? Number(raw) : 0;
}

export function hasValidSession() {
  return getSessionExpiry() > Date.now();
}
