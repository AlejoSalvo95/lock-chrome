const LOCK_RULE_ID = 1001;
const LOGIN_URL = chrome.runtime.getURL("login.html");
const PASSWORD_KEY = "passwordCredential";
const PBKDF2_ITERATIONS = 310000;

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function derivePasswordHash(password, salt, iterations = PBKDF2_ITERATIONS) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    keyMaterial,
    256
  );
  return new Uint8Array(bits);
}

function hashesMatch(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

async function getPasswordCredential() {
  const result = await chrome.storage.local.get(PASSWORD_KEY);
  return result[PASSWORD_KEY] || null;
}

async function savePassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePasswordHash(password, salt);
  await chrome.storage.local.set({
    [PASSWORD_KEY]: {
      salt: bytesToBase64(salt),
      hash: bytesToBase64(hash),
      iterations: PBKDF2_ITERATIONS
    }
  });
}

async function verifyPassword(password) {
  const credential = await getPasswordCredential();
  if (!credential) return false;
  const candidate = await derivePasswordHash(
    password,
    base64ToBytes(credential.salt),
    credential.iterations
  );
  return hashesMatch(candidate, base64ToBytes(credential.hash));
}

function isWebUrl(url = "") {
  return /^https?:\/\//i.test(url);
}

async function setLockedState(locked) {
  await chrome.storage.session.set({ locked });
}

async function isLocked() {
  const { locked } = await chrome.storage.session.get("locked");
  return locked !== false;
}

async function installBlockingRule() {
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [LOCK_RULE_ID],
    addRules: [
      {
        id: LOCK_RULE_ID,
        priority: 1,
        action: {
          type: "redirect",
          redirect: { extensionPath: "/login.html" }
        },
        condition: {
          regexFilter: "^https?://",
          resourceTypes: ["main_frame"]
        }
      }
    ]
  });
}

async function removeBlockingRule() {
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [LOCK_RULE_ID]
  });
}

async function lockProfile() {
  await setLockedState(true);
  await installBlockingRule();

  const tabs = await chrome.tabs.query({});
  const originalTabs = {};

  for (const tab of tabs) {
    if (!tab.id || !isWebUrl(tab.url)) continue;

    originalTabs[String(tab.id)] = tab.url;

    try {
      await chrome.tabs.update(tab.id, { url: LOGIN_URL });
    } catch (_) {
      // Algunas pestañas especiales pueden no permitir actualización.
    }
  }

  await chrome.storage.session.set({ originalTabs });

  const loginTabs = await chrome.tabs.query({ url: LOGIN_URL });
  if (loginTabs.length === 0) {
    await chrome.tabs.create({ url: LOGIN_URL });
  }
}

async function unlockProfile(currentLoginTabId) {
  await removeBlockingRule();
  await setLockedState(false);

  const { originalTabs = {} } = await chrome.storage.session.get("originalTabs");

  for (const [tabIdString, url] of Object.entries(originalTabs)) {
    const tabId = Number(tabIdString);

    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.url === LOGIN_URL) {
        await chrome.tabs.update(tabId, { url });
      }
    } catch (_) {
      // La pestaña pudo haberse cerrado mientras el perfil estaba bloqueado.
    }
  }

  const loginTabs = await chrome.tabs.query({ url: LOGIN_URL });

  for (const tab of loginTabs) {
    if (!tab.id) continue;

    const wasOriginalTab = Object.prototype.hasOwnProperty.call(
      originalTabs,
      String(tab.id)
    );

    if (!wasOriginalTab && tab.id !== currentLoginTabId) {
      try {
        await chrome.tabs.remove(tab.id);
      } catch (_) {}
    }
  }

  // Si la pestaña desde la que se inició sesión no era una pestaña restaurada,
  // la cerramos al final.
  if (
    currentLoginTabId &&
    !Object.prototype.hasOwnProperty.call(originalTabs, String(currentLoginTabId))
  ) {
    try {
      await chrome.tabs.update(currentLoginTabId, {
        url: "https://studio.youtube.com/channel/"
      });
    } catch (_) {}
  }

  await chrome.storage.session.remove("originalTabs");
}

chrome.runtime.onInstalled.addListener(() => {
  lockProfile();
});

chrome.runtime.onStartup.addListener(() => {
  lockProfile();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "CHECK_LOCK") {
    isLocked().then((locked) => sendResponse({ locked }));
    return true;
  }

  if (message?.type === "PASSWORD_STATUS") {
    getPasswordCredential()
      .then((credential) => sendResponse({ configured: Boolean(credential) }))
      .catch((error) => sendResponse({ configured: false, error: error.message }));
    return true;
  }

  if (message?.type === "SET_PASSWORD") {
    (async () => {
      if (await getPasswordCredential()) {
        throw new Error("La contraseña ya está configurada.");
      }
      if (typeof message.password !== "string" || message.password.length < 6) {
        throw new Error("Usá al menos 6 caracteres.");
      }
      await savePassword(message.password);
      await unlockProfile(sender.tab?.id);
    })()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "UNLOCK") {
    (async () => {
      if (!(await verifyPassword(message.password))) {
        throw new Error("Contraseña incorrecta.");
      }
      await unlockProfile(sender.tab?.id);
    })()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "CHANGE_PASSWORD") {
    (async () => {
      if (!(await verifyPassword(message.currentPassword))) {
        throw new Error("La contraseña actual es incorrecta.");
      }
      if (typeof message.newPassword !== "string" || message.newPassword.length < 6) {
        throw new Error("Usá al menos 6 caracteres.");
      }
      await savePassword(message.newPassword);
    })()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});

// Si se abre una pestaña nueva mientras el perfil está bloqueado,
// la enviamos directamente al login.
chrome.tabs.onCreated.addListener(async (tab) => {
  if (!tab.id) return;

  if (await isLocked()) {
    try {
      await chrome.tabs.update(tab.id, { url: LOGIN_URL });
    } catch (_) {}
  }
});
