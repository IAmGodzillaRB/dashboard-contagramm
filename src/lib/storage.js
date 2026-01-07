function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('sales-roi-dashboard', 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('kv')) {
        db.createObjectStore('kv')
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function idbGet(key) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readonly')
    const store = tx.objectStore('kv')
    const req = store.get(key)

    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

async function idbSet(key, value) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite')
    const store = tx.objectStore('kv')
    const req = store.put(value, key)

    req.onsuccess = () => resolve(true)
    req.onerror = () => reject(req.error)
  })
}

async function idbRemove(key) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite')
    const store = tx.objectStore('kv')
    const req = store.delete(key)

    req.onsuccess = () => resolve(true)
    req.onerror = () => reject(req.error)
  })
}

function ensureWindowStorage() {
  if (typeof window === 'undefined') return null

  const existing = window.storage
  if (existing && typeof existing.get === 'function' && typeof existing.set === 'function') return existing

  // Polyfill: si `window.storage` no existe en el runtime, lo creamos usando IndexedDB.
  window.storage = {
    async get({ key }) {
      return idbGet(key)
    },
    async set({ key }, value) {
      await idbSet(key, value)
      return true
    },
    async remove({ key }) {
      await idbRemove(key)
      return true
    },
  }

  return window.storage
}

export async function storageGet({ shared = false, key }) {
  const storage = ensureWindowStorage()
  if (!storage) return null
  return storage.get({ shared, key })
}

export async function storageSet({ shared = false, key }, value) {
  const storage = ensureWindowStorage()
  if (!storage) return false
  return storage.set({ shared, key }, value)
}

export async function storageRemove({ shared = false, key }) {
  const storage = ensureWindowStorage()
  if (!storage) return false
  if (typeof storage.remove === 'function') return storage.remove({ shared, key })
  return storage.set({ shared, key }, null)
}
