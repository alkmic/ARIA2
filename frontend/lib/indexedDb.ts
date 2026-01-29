const DB_NAME = "aria-demo";
const STORE_NAME = "pitches";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export async function savePitchLocal(record: {
  id: string;
  hcp_id: string;
  created_at: string;
  content_json: string;
  channel: string;
  length_label: string;
  word_limit: number;
}) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listPitchesLocal(): Promise<
  {
    id: string;
    hcp_id: string;
    created_at: string;
    content_json: string;
    channel: string;
    length_label: string;
    word_limit: number;
  }[]
> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as unknown as []);
    request.onerror = () => reject(request.error);
  });
}
