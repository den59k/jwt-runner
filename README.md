# Jwt Runner

This package is designed for full-stack developers, who also not know with deal with jwt on frontend

## Using:

On Server:
```
import { JwtServer } from 'jwt-runner'

const server = new JwtServer({ secret: "my-secret" })

const accessToken = await server.encode({ userId: 1 })

...


const payload = await server.verifyAndDecode(accessToken)

```

On Client:
```
import { JwtClient } from 'jwt-runner/browser'

const jwtClient = new JwtClient({
  onUpdate: async (refreshToken) => {
    // Make request to server for update access and refresh tokens
    return { accessToken, refreshToken }
  }
})

// If the tokens have been stored before, jwtClient.start() will pull them from localStorage
await jwtClient.start()

jwtClient.setTokens({ accessToken, refreshToken })

// The client will then automatically update the tokens as needed

```