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
})
