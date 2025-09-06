// Focus Blocker – MV3 Service Worker
const RULE_ID_BASE = 1000;           // Reserve 1000-1999 for our dynamic rules
const RULE_ID_RANGE = 1000;

const DEFAULTS = {
  enabled: true,
  startTime: "08:00",
  endTime: "18:00",
  // 0=Sun ... 6=Sat; default Mon-Fri
  days: [1, 2, 3, 4, 5],
  blockedDomains: ["tiktok.com", "twitter.com", "instagram.com"],
  snoozeUntil: 0
};

// ---- Small Promise helpers for chrome.* callback APIs ----
const api = {
  storageGet: (keys) =>
    new Promise((resolve) => chrome.storage.sync.get(keys, resolve)),
  storageSet: (items) =>
    new Promise((resolve) => chrome.storage.sync.set(items, resolve)),
  getDynamicRules: () =>
    new Promise((resolve) => chrome.declarativeNetRequest.getDynamicRules(resolve)),
  updateDynamicRules: (ops) =>
    new Promise((resolve) => chrome.declarativeNetRequest.updateDynamicRules(ops, resolve)),
};

// ---- Time / schedule helpers ----
function parseHHMM(str) {
  const [h, m] = (str || "00:00").split(":").map((n) => parseInt(n, 10));
  return (h * 60) + (m || 0);
}

function withinTimeWindow(nowMins, startMins, endMins) {
  if (startMins === endMins) return true;       // 24h block
  if (startMins < endMins) {
    // Same-day window: 08:00–18:00
    return nowMins >= startMins && nowMins < endMins;
  } else {
    // Wraps past midnight: 22:00–06:00
    return nowMins >= startMins || nowMins < endMins;
  }
}

function isWithinSchedule(settings) {
  const now = new Date();
  const today = now.getDay(); // 0..6
  if (!settings.days?.includes(today)) return false;

  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = parseHHMM(settings.startTime);
  const endMins = parseHHMM(settings.endTime);

  return withinTimeWindow(nowMins, startMins, endMins);
}

// ---- DNR rules management ----
async function clearOurRules() {
  const existing = await api.getDynamicRules();
  const toRemove = existing
    .filter(r => r.id >= RULE_ID_BASE && r.id < RULE_ID_BASE + RULE_ID_RANGE)
    .map(r => r.id);
  if (toRemove.length) {
    await api.updateDynamicRules({ removeRuleIds: toRemove, addRules: [] });
  }
}

function buildRules(blockedDomains = []) {
  return blockedDomains.map((domain, i) => ({
    id: RULE_ID_BASE + i,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { extensionPath: "/blocked.html" }
    },
    condition: {
      urlFilter: `||${domain}^`,
      resourceTypes: ["main_frame"]
    }
  }));
}

async function applyRulesIfNeeded() {
  const data = await api.storageGet(DEFAULTS);
  const settings = { ...DEFAULTS, ...data };

  // Snooze overrides everything
  if (settings.snoozeUntil && Date.now() < settings.snoozeUntil) {
    await clearOurRules();
    return;
  }

  if (settings.enabled && isWithinSchedule(settings) && settings.blockedDomains?.length) {
    const addRules = buildRules(settings.blockedDomains);
    // Replace everything in our reserved range
    const existing = await api.getDynamicRules();
    const toRemove = existing
      .filter(r => r.id >= RULE_ID_BASE && r.id < RULE_ID_BASE + RULE_ID_RANGE)
      .map(r => r.id);
    await api.updateDynamicRules({ removeRuleIds: toRemove, addRules });
  } else {
    await clearOurRules();
  }
}

// ---- Event wiring ----
chrome.runtime.onInstalled.addListener(async () => {
  // Seed defaults if missing
  const current = await api.storageGet(Object.keys(DEFAULTS));
  const merged = { ...DEFAULTS, ...current };
  await api.storageSet(merged);

  // Tick every minute
  chrome.alarms.create("focus-tick", { periodInMinutes: 1 });
  await applyRulesIfNeeded();
});

chrome.runtime.onStartup.addListener(async () => {
  chrome.alarms.create("focus-tick", { periodInMinutes: 1 });
  await applyRulesIfNeeded();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "focus-tick") {
    await applyRulesIfNeeded();
  }
});

// Re-evaluate whenever settings change
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === "sync") {
    await applyRulesIfNeeded();
  }
});
