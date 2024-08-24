import { expect, it, vi } from 'vitest'
import { JwtServer } from '../src/backend/jwtServer'
import { JwtClient } from '../src/browser/jwtClient'
import { LocalStorageMock } from './localStorageMock'

it("encode and decode", async () => {
  
  vi.useFakeTimers()
  
  const server = new JwtServer({ secret: "my-secret", expirationTime: 30 * 1000 })

  const token = await server.encode({ id: 1 })

  const _decoded = await server.verifyAndDecode(token)
  delete _decoded.exp
  expect(_decoded).toEqual({ id: 1 })
  
  await vi.advanceTimersByTimeAsync(35 * 1000)

  await expect(async () => await server.verifyAndDecode(token)).rejects.toThrowError()
})

it("test jwtClient", async () => {

  vi.useFakeTimers()
  
  globalThis.window = {
    localStorage: new LocalStorageMock()
  } as any
  
  const server = new JwtServer({ secret: "my-secret", expirationTime: 40 * 1000 })

  const updateTokens = vi.fn(async (refreshToken: string) => {
    const accessToken = await server.encode({ id: 1 })
    return { accessToken, refreshToken: "uniqueToken" }
  })

  const client = new JwtClient({
    onUpdate: updateTokens
  })

  await client.start()
  expect(client.status).toBe("not-active")
  
  expect(updateTokens).toBeCalledTimes(0)

  const startAccessToken = await server.encode({ id: 1 })
  client.setTokens({ refreshToken: "uniqueToken", accessToken: startAccessToken })

  expect(client.status).toBe("active")
  expect(updateTokens).toBeCalledTimes(0)

  await vi.advanceTimersByTimeAsync(40 * 1000)

  expect(updateTokens).toBeCalledTimes(1)

  await vi.advanceTimersByTimeAsync(40 * 1000)

  expect(updateTokens).toBeCalledTimes(2)
})

it("test concurrent jwtClients", async () => {

  vi.useFakeTimers()
  
  globalThis.window = {
    localStorage: new LocalStorageMock()
  } as any
  
  const server = new JwtServer({ secret: "my-secret", expirationTime: 60 * 1000 })

  const updateTokens = vi.fn(async (refreshToken: string) => {
    const accessToken = await server.encode({ id: 1 })
    return { accessToken, refreshToken: "uniqueToken" }
  })

  const client = new JwtClient({
    onUpdate: updateTokens
  })
  const client2 = new JwtClient({
    onUpdate: updateTokens
  })

  await client.start()
  
  expect(updateTokens).toBeCalledTimes(0)

  const startAccessToken = await server.encode({ id: 1 })
  client.setTokens({ refreshToken: "uniqueToken", accessToken: startAccessToken })
  expect(updateTokens).toBeCalledTimes(0)

  await client2.start()
  expect(client2.status).toBe("active")

  expect(updateTokens).toBeCalledTimes(0)

  await vi.advanceTimersByTimeAsync(60 * 1000)

  expect(updateTokens).toBeCalledTimes(1)

  await vi.advanceTimersByTimeAsync(60 * 1000)

  expect(updateTokens).toBeCalledTimes(2)

  await vi.advanceTimersByTimeAsync(60 * 1000)

  expect(updateTokens).toBeCalledTimes(3)
})