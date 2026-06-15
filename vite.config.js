import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // GitHub Pages serves project sites from /<repo-name>/ rather than from the domain
  // root. Keep this in sync with the repository name used for deployment. If this app
  // is deployed at the domain root or behind a custom domain, change base to '/'.
  base: '/tabulator-vue-demo/',

  // The Vue plugin lets Vite compile .vue single-file components, including the
  // <script setup> syntax used in src/App.vue.
  plugins: [vue()],

  build: {
    // Some dependencies used by PDF/XLSX export ship modern syntax such as optional
    // chaining and logical assignment. Lowering the production target makes the
    // GitHub Pages build friendlier to older Safari/WebKit browsers that otherwise
    // throw parser-level SyntaxError messages before Vue can run.
    target: 'es2018',
  },
})
