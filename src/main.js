import { createApp } from 'vue'

// Load Tabulator's base theme before the local stylesheet. The local styles in
// styles.css intentionally override parts of this theme for the demo's visual design,
// while still relying on Tabulator's structural table, header, footer, and pagination
// styles.
import 'tabulator-tables/dist/css/tabulator_semanticui.min.css'

// App-wide styles for layout, controls, Tabulator overrides, and the receipt modal.
import './styles.css'
import App from './App.vue'

// Vue owns the surrounding application shell. App.vue then creates the Tabulator
// instance after mount so Tabulator can control only the table container.
createApp(App).mount('#app')
