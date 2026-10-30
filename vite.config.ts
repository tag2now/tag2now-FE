import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const BUILD_ID = Date.now().toString(36)

// Writes the build ID beside index.html, so an open tab can ask whether a newer
// build has been deployed since it loaded. The dev server answers its own ID,
// which is why the check never fires in dev or E2E.
function versionFile(buildId: string): Plugin {
  const body = JSON.stringify({ buildId })
  return {
    name: 'version-file',
    configureServer(server) {
      server.middlewares.use('/version.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(body)
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: body })
    },
  }
}

export default defineConfig({
  plugins: [react(), versionFile(BUILD_ID)],
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor',
              test: /node_modules\/react/
            }
          ]
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src')
    }
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: process.env.BE === 'local' ? 'http://127.0.0.1:8000' : 'https://match.tag2now.click/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
