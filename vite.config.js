import { defineConfig } from 'vite'
import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // GitHub Pages serves project sites from /<repo-name>/ rather than from the domain
  // root. Keep this in sync with the repository name used for deployment. If this app
  // is deployed at the domain root or behind a custom domain, change base to '/'.
  base: '/tabulator-vue-demo/',

  // The Vue plugin lets Vite compile .vue single-file components, including the
  // <script setup> syntax used in src/App.vue. The legacy plugin adds a second,
  // transpiled "nomodule" build for Safari/WebKit versions that can download ES
  // modules but still fail to parse some syntax produced by modern dependencies.
  plugins: [
    vue(),
    legacy({
      targets: ['defaults', 'safari >= 12', 'ios_saf >= 12'],
      modernPolyfills: true,
    }),
  ],
})
