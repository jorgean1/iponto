const STATE_URL = 'http://localhost:3077/api/state';
const PUNCH_TYPES = new Set(['entrada', 'saída para almoço', 'retorno do almoço', 'saída']);
const TAB_PATTERNS = [
  'http://localhost:3077/*',
  'https://controledeprojetos.crptecnologia.com.br/Lancamentos*'
];

function latestSuccess(events = []) {
  return events.find(event => event.status === 'success' && PUNCH_TYPES.has(event.type));
}

async function reloadIpontoTabs() {
  const tabs = await chrome.tabs.query({ url: TAB_PATTERNS });
  await Promise.allSettled(tabs.map(tab => chrome.tabs.reload(tab.id, { bypassCache: true })));
  return tabs.length;
}

async function checkState({ initialize = false } = {}) {
  const checkedAt = new Date().toISOString();
  try {
    const response = await fetch(STATE_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const state = await response.json();
    const event = latestSuccess(state.events);
    const saved = await chrome.storage.local.get('lastEventId');
    let reloaded = 0;
    if (!initialize && event?.id && saved.lastEventId && event.id !== saved.lastEventId) {
      reloaded = await reloadIpontoTabs();
    }
    await chrome.storage.local.set({
      lastEventId: event?.id || saved.lastEventId || '',
      latestSuccess: event || null,
      checkedAt,
      connected: true,
      error: '',
      lastReloadCount: reloaded
    });
    return { connected: true, checkedAt, latestSuccess: event || null, reloaded };
  } catch (error) {
    const status = { connected: false, checkedAt, error: error.message };
    await chrome.storage.local.set(status);
    return status;
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.alarms.create('iponto-check', { periodInMinutes: 0.5 });
  await checkState({ initialize: true });
});

chrome.runtime.onStartup.addListener(() => checkState());
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'iponto-check') checkState();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'status') {
    checkState().then(sendResponse);
    return true;
  }
  if (message?.type === 'refresh-now') {
    reloadIpontoTabs().then(reloaded => sendResponse({ ok: true, reloaded })).catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  return false;
});

// Complementa o alarme de 30 segundos enquanto o service worker estiver ativo.
setInterval(checkState, 5000);
checkState();
