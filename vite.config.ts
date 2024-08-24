import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [ dts({ rollupTypes: true }) ],
  build: {
    minify: false,
    sourcemap: true,
    lib: {
      entry: {
        backend: "src/backend/jwtServer.ts",
        browser: "src/browser/jwtClient.ts"
      },
      formats: [ "cjs", "es" ],
    },
    rollupOptions: {
      external: [
        /^node:/
      ],
    }
  },
})