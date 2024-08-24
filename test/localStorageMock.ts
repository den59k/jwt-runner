export class LocalStorageMock {
  private _map = new Map()
  getItem(key: string) {
    return this._map.get(key) ?? null
  }
  setItem(key: string, value: string ) {
    this._map.set(key, value)
  }
}