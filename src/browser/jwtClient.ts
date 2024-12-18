import { createEventEmitter } from "vuesix/src/utils/eventEmitter"

type JwtRunnerOptions = {
  onUpdate: (refreshToken: string) => Promise<{ accessToken: string, refreshToken: string }>
  debug?: boolean
}

type Events = {
  "onAuthorized": () => void
  "onTokenUpdate": (accessToken: string) => void
  "onFailed": (e: Error) => void
}


/** Цели этого класса:
* Запоминать refreshToken и accessToken в localStorage
* Запускать таймер, который будет делать запрос на обновление токена и обновлять refreshToken и accessToken
*/
export class JwtClient {

  status: "pending" | "not-active" | "active" = "pending"
  private _events = createEventEmitter<Events>()
  private refreshTokenKey = "refreshToken"
  private refreshTokenUpdateKey = "refreshToken-update"
  private accessTokenKey = "accessToken"

  private onUpdate: JwtRunnerOptions["onUpdate"]
  private debug = false

  constructor(options: JwtRunnerOptions) {
    this.onUpdate = options.onUpdate
    
    this.debug = options.debug ?? false
  }

  private updateAccessTokenTimeout: ReturnType<typeof setTimeout> | null = null
  private updateAccessTokenTimer(accessToken: string) {
    const payload = JSON.parse(atob(accessToken.split(".")[1]))
    if (this.updateAccessTokenTimeout !== null) clearTimeout(this.updateAccessTokenTimeout)

    const nextUpdate = Math.max(payload.exp*1000 - Date.now() - 10000, 0)
    if (this.debug) {
      console.info(`Set update token timer for ${Math.trunc(nextUpdate/1000)}s`)
    }
    this.updateAccessTokenTimeout = setTimeout(this.updateTokens.bind(this), Math.max(nextUpdate, 0))
  }

  async updateTokens() {
    const lastUpdate = window.localStorage.getItem(this.refreshTokenUpdateKey)
    
    if (lastUpdate && parseInt(lastUpdate) + 5000 > Date.now()) {
      await new Promise(res => setTimeout(res, parseInt(lastUpdate)+5000 - Date.now()))
      const newRefreshToken = window.localStorage.getItem(this.refreshTokenKey)
      const newAccessToken = window.localStorage.getItem(this.accessTokenKey)

      this.onSuccess(newAccessToken!)
      return { newRefreshToken, newAccessToken }
    }

    try {
      const currentRefreshToken = window.localStorage.getItem(this.refreshTokenKey)
      if (!currentRefreshToken) {
        throw new Error("Refresh token is not stored")
      }

      window.localStorage.setItem(this.refreshTokenUpdateKey, Date.now().toString())
      const { accessToken, refreshToken } = await this.onUpdate(currentRefreshToken)
      
      window.localStorage.setItem(this.refreshTokenKey, refreshToken)    
      window.localStorage.setItem(this.accessTokenKey, accessToken)  
  
      this.onSuccess(accessToken)
      return { refreshToken, accessToken }
    } catch(e: any) {
      this.onFailed(e)
    }
  }

  private onSuccess(accessToken: string) {
    this._events.dispatch("onTokenUpdate", accessToken)
    this.updateAccessTokenTimer(accessToken)
    if (this.status !== "active") {
      this.status = "active"
      this._events.dispatch("onAuthorized")
    }
  }

  private onFailed(e: Error) {
    this.status = "not-active"
    this._events.dispatch("onFailed", e)
  }

  async start() {
    const accessToken = window.localStorage.getItem(this.accessTokenKey)
    if (!accessToken || !accessToken.includes(".")) {
      this.status = "not-active"
      return
    }
    
    const payload = JSON.parse(atob(accessToken.split(".")[1]))
    if (payload.exp*1000 - 10000 < Date.now()) {
      await this.updateTokens()
    } else {
      this.onSuccess(accessToken)
    }
  }

  stop() {
    if (this.updateAccessTokenTimeout !== null) {
      clearTimeout(this.updateAccessTokenTimeout)
    }
  }

  setTokens({ refreshToken, accessToken }: { refreshToken: string, accessToken: string }) {
    window.localStorage.setItem(this.refreshTokenKey, refreshToken)
    window.localStorage.setItem(this.accessTokenKey, accessToken)
    this.updateAccessTokenTimer(accessToken)
    this.onSuccess(accessToken)
  }

  clearTokens() {
    window.localStorage.removeItem(this.refreshTokenKey)
    window.localStorage.removeItem(this.accessTokenKey)
    this.stop()
  }

  addEventListener = this._events.addEventListener.bind(this._events)
  removeEventListener = this._events.removeEventListener.bind(this._events)
}