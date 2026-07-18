let db;
let _dbFailed = false;

const req = indexedDB.open('BirdsAuditMobile_v2', 2);
req.onupgradeneeded = e => {
  const d = e.target.result;
  if (!d.objectStoreNames.contains('audits')) d.createObjectStore('audits', { keyPath: ['Store', 'Year', 'Week'] });
  if (!d.objectStoreNames.contains('actions')) d.createObjectStore('actions', { keyPath: 'ActionID', autoIncrement: true });
  if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings', { keyPath: 'id' });
  if (!d.objectStoreNames.contains('questionBank')) d.createObjectStore('questionBank', { keyPath: 'id' });
  if (!d.objectStoreNames.contains('history')) d.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
  if (!d.objectStoreNames.contains('training_audits')) d.createObjectStore('training_audits', { keyPath: ['Store', 'Year', 'Week'] });
};
req.onsuccess = e => {
  db = e.target.result;
  console.log('[DB] Ready');
  if (typeof onDBReady === 'function') onDBReady();
};
req.onerror = e => {
  console.error('[DB] Failed to open:', e.target.error);
  _dbFailed = true;
  if (typeof onDBReady === 'function') onDBReady();
};
req.onblocked = () => {
  console.warn('[DB] Open blocked — close other tabs using this app');
};

const idbGetAll = s => { if (!db) return Promise.resolve([]); try { return new Promise(res => { const r = db.transaction(s).objectStore(s).getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => res([]); }); } catch(e) { return Promise.resolve([]); } };
const idbGet = (s, k) => { if (!db) return Promise.resolve(null); try { return new Promise(res => { const r = db.transaction(s).objectStore(s).get(k); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); }); } catch(e) { return Promise.resolve(null); } };
const idbAdd = (s, v) => { if (!db) return Promise.resolve(null); try { return new Promise(res => { const r = db.transaction(s, 'readwrite').objectStore(s).add(v); r.onsuccess = () => res(r.result); r.onerror = () => res(null); }); } catch(e) { return Promise.resolve(null); } };
const idbPut = (s, v) => { if (!db) return Promise.resolve(false); try { return new Promise(res => { const r = db.transaction(s, 'readwrite').objectStore(s).put(v); r.onsuccess = () => res(true); r.onerror = () => res(false); }); } catch(e) { return Promise.resolve(false); } };
const idbClear = s => { if (!db) return Promise.resolve(false); try { return new Promise(res => { const r = db.transaction(s, 'readwrite').objectStore(s).clear(); r.onsuccess = () => res(true); r.onerror = () => res(false); }); } catch(e) { return Promise.resolve(false); } };
