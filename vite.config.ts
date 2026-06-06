import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all envs regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        // jspdf optionally imports canvg for SVG; slip PDF only uses images + text
        canvg: path.resolve(dirname, 'src/utils/canvg-stub.ts'),
      },
    },
    optimizeDeps: {
      exclude: ['jspdf'],
    },
    server: {
      host: true,
      port: 3000,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'https://simakfresh.ae/',
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            // Prevent the proxy from buffering request bodies (fixes multipart/form-data corruption)
            proxy.on('proxyReq', (proxyReq, req) => {
              // If the request has a content-length, trust it and don't re-process
              if (req.headers['content-length']) {
                proxyReq.setHeader('content-length', req.headers['content-length']);
              }
            });
          },
        }
      }
    }
  }
})
