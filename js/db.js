let db;

const req = indexedDB.open('BirdsAuditMobile_v1', 1);
req.onupgradeneeded = e => {
  const d = e.target.result;
  if (!d.objectStoreNames.contains('audits')) d.createObjectStore('audits', { keyPath: ['Store', 'Year', 'Week'] });
  if (!d.objectStoreNames.contains('actions')) d.createObjectStore('actions', { keyPath: 'ActionID', autoIncrement: true });
  if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings', { keyPath: 'id' });
  if (!d.objectStoreNames.contains('questionBank')) d.createObjectStore('questionBank', { keyPath: 'id' });
  if (!d.objectStoreNames.contains('history')) d.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
};
req.onsuccess = e => {
  db = e.target.result;
  console.log('[DB] Ready');
  if (typeof onDBReady === 'function') onDBReady();
};

const idbGetAll = s => new Promise(res => { const r = db.transaction(s).objectStore(s).getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => res([]); });
const idbGet = (s, k) => new Promise(res => { const r = db.transaction(s).objectStore(s).get(k); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); });
const idbAdd = (s, v) => new Promise(res => { try { const r = db.transaction(s, 'readwrite').objectStore(s).add(v); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } });
const idbPut = (s, v) => new Promise(res => { const r = db.transaction(s, 'readwrite').objectStore(s).put(v); r.onsuccess = () => res(true); r.onerror = () => res(false); });
const idbClear = s => new Promise(res => { const r = db.transaction(s, 'readwrite').objectStore(s).clear(); r.onsuccess = () => res(true); r.onerror = () => res(false); });
