// Original documents stay on this device; packet metadata alone is shared.
function openStore() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('clinic-lab-sources', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('documents');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function storeLabSource(userId, id, file) {
  if (!userId) return;
  const db = await openStore();
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('documents', 'readwrite');
      transaction.objectStore('documents').put(file, `${userId}:${id}`);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { db.close(); }
}
export async function loadLabSource(userId, id) {
  if (!userId || !id) return null;
  const db = await openStore();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('documents').objectStore('documents').get(`${userId}:${id}`);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}

export const storeLabTrace = (userId, runId, trace) => storeLabSource(userId, `trace:${runId}`, trace);
export const loadLabTrace = (userId, runId) => runId ? loadLabSource(userId, `trace:${runId}`) : Promise.resolve(null);

export async function appendLabTraceEvent(userId, runId, event) {
  if (!userId || !runId) return;
  const db = await openStore();
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('documents', 'readwrite');
      const store = transaction.objectStore('documents'), key = `${userId}:trace:${runId}`;
      const request = store.get(key);
      request.onsuccess = () => {
        const trace = request.result || { runId, captureUnavailable: true };
        store.put({ ...trace, saveEvents: [...(trace.saveEvents || []), event] }, key);
      };
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { db.close(); }
}

export async function deleteLabSource(userId, id) {
  if (!userId || !id) return;
  const db = await openStore();
  try { await new Promise((resolve, reject) => {
    const transaction = db.transaction("documents", "readwrite");
    transaction.objectStore("documents").delete(`${userId}:${id}`);
    transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error);
  }); } finally { db.close(); }
}
