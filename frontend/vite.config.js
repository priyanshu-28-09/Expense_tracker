import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, pathToFileURL } from 'node:url'

const esToolkitCompatModules = {
  'es-toolkit/compat/range': ['math/range', 'range'],
  'es-toolkit/compat/get': ['object/get', 'get'],
  'es-toolkit/compat/omit': ['object/omit', 'omit'],
  'es-toolkit/compat/maxBy': ['math/maxBy', 'maxBy'],
  'es-toolkit/compat/sumBy': ['math/sumBy', 'sumBy'],
  'es-toolkit/compat/sortBy': ['array/sortBy', 'sortBy'],
  'es-toolkit/compat/throttle': ['function/throttle', 'throttle'],
  'es-toolkit/compat/minBy': ['math/minBy', 'minBy'],
  'es-toolkit/compat/last': ['array/last', 'last'],
  'es-toolkit/compat/isPlainObject': ['predicate/isPlainObject', 'isPlainObject'],
  'es-toolkit/compat/uniqBy': ['array/uniqBy', 'uniqBy'],
}

const esToolkitCompatPlugin = {
  name: 'es-toolkit-compat-esm',
  enforce: 'pre',
  resolveId(source) {
    return esToolkitCompatModules[source] ? `\0es-toolkit-compat:${source}` : null
  },
  load(id) {
    const prefix = '\0es-toolkit-compat:'
    if (!id.startsWith(prefix)) return null
    const [modulePath, exportName] = esToolkitCompatModules[id.slice(prefix.length)]
    const target = fileURLToPath(new URL(`./node_modules/es-toolkit/dist/compat/${modulePath}.mjs`, import.meta.url))
    return `export { ${exportName} as default } from ${JSON.stringify(pathToFileURL(target).href)}`
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [esToolkitCompatPlugin, react()],
  optimizeDeps: {
    rolldownOptions: {
      plugins: [esToolkitCompatPlugin],
    },
  },
})
