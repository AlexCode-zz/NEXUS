export class CompositionStorage {
  constructor() {
    this.storageKey = 'nexus_compositions';
    this.dbName = 'NexusCompositionsDB';
    this.dbVersion = 1;
    this.db = null;
    this.initDB();
  }

  initDB() {
    if (!window.indexedDB) {
      console.warn('IndexedDB no disponible, usando localStorage');
      return;
    }

    const request = indexedDB.open(this.dbName, this.dbVersion);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('compositions')) {
        const store = db.createObjectStore('compositions', { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('world', 'world', { unique: false });
        store.createIndex('date', 'date', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      this.db = event.target.result;
    };

    request.onerror = (event) => {
      console.error('Error al abrir IndexedDB:', event.target.error);
    };
  }

  async saveComposition(composition) {
    if (!composition.id) {
      composition.id = Date.now().toString();
    }
    composition.date = new Date().toISOString();

    if (this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['compositions'], 'readwrite');
        const store = transaction.objectStore('compositions');
        const request = store.put(composition);

        request.onsuccess = () => resolve(composition.id);
        request.onerror = (event) => reject(event.target.error);
      });
    } else {
      // Fallback a localStorage
      let compositions = JSON.parse(localStorage.getItem(this.storageKey)) || [];
      compositions.push(composition);
      localStorage.setItem(this.storageKey, JSON.stringify(compositions));
      return Promise.resolve(composition.id);
    }
  }

  async getCompositions() {
    if (this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['compositions'], 'readonly');
        const store = transaction.objectStore('compositions');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
      });
    } else {
      // Fallback a localStorage
      return Promise.resolve(JSON.parse(localStorage.getItem(this.storageKey)) || []);
    }
  }

  async getComposition(id) {
    if (this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['compositions'], 'readonly');
        const store = transaction.objectStore('compositions');
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
      });
    } else {
      // Fallback a localStorage
      const compositions = JSON.parse(localStorage.getItem(this.storageKey)) || [];
      return Promise.resolve(compositions.find(c => c.id === id));
    }
  }

  async deleteComposition(id) {
    if (this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['compositions'], 'readwrite');
        const store = transaction.objectStore('compositions');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
      });
    } else {
      // Fallback a localStorage
      let compositions = JSON.parse(localStorage.getItem(this.storageKey)) || [];
      compositions = compositions.filter(c => c.id !== id);
      localStorage.setItem(this.storageKey, JSON.stringify(compositions));
      return Promise.resolve();
    }
  }

  exportToJSON(composition) {
    const exportData = {
      version: '1.0',
      type: 'nexus-composition',
      data: composition
    };
    return JSON.stringify(exportData, null, 2);
  }

  importFromJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.type !== 'nexus-composition' || !parsed.data) {
        throw new Error('Formato de composición no válido');
      }
      return parsed.data;
    } catch (e) {
      console.error('Error al importar JSON:', e);
      throw e;
    }
  }
}
