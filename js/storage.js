const kind = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);

export function createStorage(backend) {
  const get = () => {
    try {
      return backend === undefined ? globalThis.localStorage : backend;
    } catch {
      return undefined;
    }
  };
  return {
    load(key, fallback) {
      try {
        const raw = get().getItem(key);
        if (raw === null || raw === undefined) return fallback;
        const v = JSON.parse(raw);
        if (v === null) return fallback;
        if (fallback !== null && fallback !== undefined && kind(v) !== kind(fallback)) return fallback;
        return v;
      } catch {
        return fallback;
      }
    },
    save(key, value) {
      try {
        get().setItem(key, JSON.stringify(value));
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
