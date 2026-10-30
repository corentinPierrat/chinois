export function createStorage(backend = globalThis.localStorage) {
  return {
    load(key, fallback) {
      try {
        const raw = backend.getItem(key);
        if (raw === null || raw === undefined) return fallback;
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    save(key, value) {
      try {
        backend.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
  };
}

const storage = createStorage();
export default storage;
export const { load, save } = storage;
