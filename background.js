const LOCK_RULE_ID = 1001;
const LOGIN_URL = chrome.runtime.getURL("login.html");

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

  if (message?.type === "UNLOCK") {
    unlockProfile(sender.tab?.id)
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
