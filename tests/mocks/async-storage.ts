const memoryStore: Record<string, string> = {};

const AsyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    return memoryStore[key] || null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    memoryStore[key] = value;
  },
  removeItem: async (key: string): Promise<void> => {
    delete memoryStore[key];
  },
  clear: async (): Promise<void> => {
    for (const k in memoryStore) {
      delete memoryStore[k];
    }
  },
};

export default AsyncStorage;
