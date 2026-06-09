<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { TabulatorFull as Tabulator } from 'tabulator-tables'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import { applyPlugin } from 'jspdf-autotable'

// Tabulator's PDF downloader expects jsPDF to have the autoTable plugin installed.
// Importing jspdf-autotable is not enough by itself in this module-based setup; calling
// applyPlugin mutates the jsPDF constructor so Tabulator can call doc.autoTable(...)
// during PDF export.
applyPlugin(jsPDF)

// Vue owns the page-level controls and modal state. Tabulator owns the table DOM.
// The ref below is the bridge between the two: Vue renders an empty div, then
// Tabulator mounts its grid into that div in onMounted().
const tableEl = ref(null)
const globalSearch = ref('')
const statusFilter = ref('')
const exportFormat = ref('csv')
const activeSort = ref('Date descending')
const selectedReceipt = ref(null)

// Keep the Tabulator instance outside Vue reactivity. The instance is a complex
// imperative object with circular references and DOM handles, so making it reactive
// adds overhead without benefit. Vue only needs to hold simple UI state.
let table = null

// Increase or decrease this value to performance-test Tabulator with different
// client-side data sizes. The rows are generated in memory on page load so this demo
// has no backend dependency and always produces the same dataset.
const TRANSACTION_COUNT = 50000

// These lookup arrays are intentionally small. The generator combines them with
// different index multipliers to create a large but repeatable dataset with enough
// variation for sorting, filtering, pagination, and export testing.
const firstNames = [
  'Maya',
  'Noah',
  'Isabella',
  'Liam',
  'Ava',
  'Ethan',
  'Sophia',
  'Jackson',
  'Amelia',
  'Lucas',
  'Charlotte',
  'Benjamin',
  'Harper',
  'Daniel',
  'Mia',
  'Henry',
  'Ella',
  'Owen',
  'Nora',
  'Mateo',
]

const lastNames = [
  'Chen',
  'Patel',
  'Garcia',
  'Brooks',
  'Thompson',
  'Wilson',
  'Nguyen',
  'Rivera',
  'Carter',
  'Kim',
  'Hayes',
  'Foster',
  'Allen',
  'Morgan',
  'Sullivan',
  'Ortiz',
  'Reed',
  'Murphy',
  'Bennett',
  'Okafor',
]

const exams = [
  'Computer Science Placement Exam',
  'Business Analytics Certification',
  'Nursing Entrance Exam',
  'Architecture Portfolio Review',
  'Biology Lab Practical',
  'Economics Qualifying Exam',
  'Design Studio Assessment',
  'Mechanical Engineering Fundamentals',
  'Psychology Methods Exam',
  'English Composition Exam',
  'Chemistry Lab Practical',
  'Music Theory Placement',
  'Data Science Capstone Exam',
  'Public Health Board Prep',
  'Political Science Comprehensive',
  'Theater Audition Review',
  'Civil Engineering Fundamentals',
]

const methods = ['ACH', 'Card', 'Scholarship', 'Wire', 'Cash']
const statuses = ['Paid', 'Pending', 'Failed', 'Refunded']
const feeAmounts = [75, 95, 110, 125, 135, 150, 185, 195, 210, 225, 260, 325, 375]

function formatDate(date) {
  // Tabulator's date sorter handles ISO-style YYYY-MM-DD strings well, and keeping
  // dates as strings avoids timezone display differences in the rendered table.
  return date.toISOString().slice(0, 10)
}

function generateTransactions(count) {
  const startDate = new Date('2026-05-30T12:00:00Z')

  return Array.from({ length: count }, (_, index) => {
    // The modulo arithmetic below makes the fake data deterministic. This matters for
    // performance testing because a reload should not change the row distribution or
    // make a filter/sort feel faster or slower due only to random data.
    const status = statuses[index % statuses.length]
    const date = new Date(startDate)
    date.setDate(startDate.getDate() - (index % 365))

    return {
      id: `TX-${String(1042 + index).padStart(6, '0')}`,
      date: formatDate(date),
      student: `${firstNames[index % firstNames.length]} ${
        lastNames[(index * 7) % lastNames.length]
      }`,
      exam: exams[(index * 5) % exams.length],
      method: methods[(index * 3) % methods.length],
      status,
      // Refunded rows are represented as negative amounts so the amount formatter,
      // bottom sum calculation, sort order, and exports all have realistic values to
      // work with.
      amount:
        status === 'Refunded'
          ? -feeAmounts[index % feeAmounts.length]
          : feeAmounts[index % feeAmounts.length],
    }
  })
}

// Generate the full dataset once when the module loads. Tabulator receives this array
// at initialization and then applies its own client-side filtering, sorting, and
// pagination over the in-memory data.
const transactions = generateTransactions(TRANSACTION_COUNT)

// Reuse one formatter for table cells, bottom calculations, receipt modal values,
// and any future currency UI so formatting remains consistent.
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

// CSS class mapping used by both Tabulator cell formatters and the Vue receipt modal.
// Keeping the status-to-class mapping in one place avoids duplicating style decisions
// between imperative Tabulator code and declarative Vue template code.
const statusClass = {
  Paid: 'status-paid',
  Pending: 'status-pending',
  Failed: 'status-failed',
  Refunded: 'status-refunded',
}

function applyFilters() {
  if (!table) return

  const search = globalSearch.value.trim().toLowerCase()
  const status = statusFilter.value

  if (!search && !status) {
    // When both top-level controls are empty, remove only the programmatic filters.
    // Header filters are cleared separately by clearFilters(), because users may use
    // Tabulator's built-in column filters independently from these Vue controls.
    table.clearFilter()
    return
  }

  table.setFilter(
    (data, params) => {
      // This custom filter combines two concepts:
      // 1. global text search across selected fields
      // 2. exact status matching from the dropdown
      // Tabulator runs this predicate against each active row when filters change.
      const matchesSearch =
        !params.search ||
        ['id', 'student', 'exam', 'method'].some((field) =>
          String(data[field]).toLowerCase().includes(params.search),
        )
      const matchesStatus = !params.status || data.status === params.status

      return matchesSearch && matchesStatus
    },
    { search, status },
  )
}

function clearFilters() {
  // Clear Vue-controlled filters and Tabulator header filters together so the table
  // returns to its original unfiltered state from a single button.
  globalSearch.value = ''
  statusFilter.value = ''
  table?.clearHeaderFilter()
  table?.clearFilter(true)
}

function sortBy(field, dir, label) {
  // These buttons are shortcuts for common sort states. Users can still click any
  // column header directly because Tabulator's built-in header sorting remains enabled.
  table?.setSort(field, dir)
  activeSort.value = label
}

function viewReceipt(transaction) {
  // Row actions are handled from Tabulator's cellClick callback, but the modal is
  // rendered by Vue. Storing the row data here bridges the imperative table event into
  // declarative Vue rendering.
  selectedReceipt.value = transaction
}

function closeReceipt() {
  selectedReceipt.value = null
}

function handleEscape(event) {
  // The modal also closes from backdrop click and the close button. Escape support is
  // added at document level so it works regardless of which modal element has focus.
  if (event.key === 'Escape') {
    closeReceipt()
  }
}

function downloadTable() {
  if (!table) return

  const format = exportFormat.value
  // Tabulator uses the selected download type plus a format-specific options object.
  // CSV/JSON work without extra options. HTML can include styles. XLSX needs a sheet
  // name. PDF uses jspdf-autotable configuration for title, orientation, margins, and
  // basic table styling.
  const exportOptions = {
    csv: {},
    json: {},
    html: {
      style: true,
    },
    xlsx: {
      sheetName: 'Exam Payments',
    },
    pdf: {
      title: 'Campus Exam Payment History',
      orientation: 'landscape',
      autoTable: {
        margin: { top: 48, right: 24, bottom: 24, left: 24 },
        styles: {
          fontSize: 8,
          cellPadding: 4,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [29, 79, 43],
          textColor: 255,
        },
        alternateRowStyles: {
          fillColor: [248, 247, 238],
        },
      },
    },
  }

  // By default Tabulator downloads the active rows, meaning current filters/sorts are
  // reflected in the export. The Actions column is marked download:false below so UI
  // buttons do not appear in exported files.
  table.download(format, `campus-exam-payments.${format}`, exportOptions[format])
}

onMounted(() => {
  // Create the Tabulator instance only after Vue has mounted the tableEl div. Before
  // this hook runs, tableEl.value is null because the DOM node does not exist yet.
  table = new Tabulator(tableEl.value, {
    data: transactions,
    // Dependencies are passed explicitly for module bundlers. Tabulator can look for
    // window.XLSX/window.jspdf in script-tag setups, but Vite bundles dependencies as
    // modules, so registering them here makes XLSX/PDF export work reliably.
    dependencies: {
      XLSX,
      jspdf: { jsPDF },
    },
    // fitColumns uses the available table width and keeps this desktop demo from
    // scrolling horizontally at normal viewport sizes. responsiveLayout is disabled so
    // every transaction remains one row instead of collapsing columns into child rows.
    layout: 'fitColumns',
    responsiveLayout: false,
    // Pagination keeps the 50,000-row dataset usable in the browser. Tabulator still
    // holds the full data array client-side, but only renders the current page.
    pagination: true,
    paginationSize: 10,
    paginationSizeSelector: [10, 20, 50],
    movableColumns: true,
    initialSort: [{ column: 'date', dir: 'desc' }],
    placeholder: 'No transactions match the current filters.',
    // Column definitions are the contract between the data shape and Tabulator. Each
    // field maps to a property generated in generateTransactions(). Header filters are
    // Tabulator-native controls, separate from the Vue global/status filters above.
    columns: [
      {
        title: 'Transaction',
        field: 'id',
        sorter: 'string',
        headerFilter: 'input',
        width: 130,
      },
      {
        title: 'Date',
        field: 'date',
        sorter: 'date',
        headerFilter: 'input',
        width: 128,
      },
      {
        title: 'Student',
        field: 'student',
        sorter: 'string',
        headerFilter: 'input',
        minWidth: 180,
      },
      {
        title: 'Exam',
        field: 'exam',
        sorter: 'string',
        headerFilter: 'list',
        headerFilterParams: { valuesLookup: true, clearable: true },
        minWidth: 185,
      },
      {
        title: 'Method',
        field: 'method',
        sorter: 'string',
        headerFilter: 'list',
        headerFilterParams: { valuesLookup: true, clearable: true },
        width: 130,
      },
      {
        title: 'Status',
        field: 'status',
        sorter: 'string',
        headerFilter: 'list',
        headerFilterParams: { valuesLookup: true, clearable: true },
        formatter(cell) {
          // Formatters return HTML strings because Tabulator renders outside Vue's
          // template system. Keep this markup simple and avoid injecting user-provided
          // HTML here in real applications.
          const value = cell.getValue()
          return `<span class="status-pill ${statusClass[value]}">${value}</span>`
        },
        width: 112,
      },
      {
        title: 'Amount',
        field: 'amount',
        sorter: 'number',
        hozAlign: 'right',
        headerHozAlign: 'right',
        bottomCalc: 'sum',
        formatter(cell) {
          // The amount column uses semantic coloring for positive vs. refunded values.
          // The raw value remains numeric, so sorting, bottom calculations, and exports
          // still operate on numbers rather than formatted currency strings.
          const value = cell.getValue()
          const className = value < 0 ? 'amount-negative' : 'amount-positive'
          return `<span class="${className}">${currencyFormatter.format(value)}</span>`
        },
        bottomCalcFormatter(cell) {
          return currencyFormatter.format(cell.getValue())
        },
        width: 112,
      },
      {
        title: 'Actions',
        field: 'actions',
        hozAlign: 'center',
        headerHozAlign: 'center',
        headerSort: false,
        download: false,
        formatter() {
          // The action button is table UI only. It is excluded from exports with
          // download:false because exported files should contain transaction data, not
          // controls.
          return '<button class="row-action" type="button">Receipt</button>'
        },
        cellClick(event, cell) {
          // Stop propagation so the button click does not accidentally trigger any
          // future row-level click handlers. The row data is passed to Vue to open the
          // receipt modal.
          event.stopPropagation()
          viewReceipt(cell.getRow().getData())
        },
        width: 112,
      },
    ],
  })

  // Register global listeners after the table is created, and remove them in
  // onBeforeUnmount() below. This prevents stale listeners if the component is ever
  // mounted/unmounted by a router or parent app.
  document.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  // Clean up both Vue-managed global listeners and the Tabulator instance. destroy()
  // removes Tabulator's DOM/event work so hot reloads, route changes, or tests do not
  // leave orphaned table instances behind.
  document.removeEventListener('keydown', handleEscape)
  table?.destroy()
  table = null
})
</script>

<template>
  <main class="page-shell">
    <!--
      Hero area:
      - Left side introduces the demo and clarifies that it is intentionally loaded
        with 50,000 generated records for performance testing.
      - Right side contains export controls because exports operate on the table as a
        whole rather than on a specific row.
    -->
    <section class="hero">
      <div>
        <p class="eyebrow">Vue 3 + Tabulator</p>
        <h1>Tabulator Table Demo</h1>
        <p class="hero-copy">
          A single-page Vue demo showing Tabulator sorting, column filtering, global
          filtering, pagination, row actions, movable columns, downloads, and
          50,000 generated records.
        </p>
      </div>

      <div class="hero-export-card" aria-label="Export table">
        <label class="field">
          <span>Export</span>
          <select v-model="exportFormat">
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="html">HTML</option>
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="pdf">PDF</option>
          </select>
        </label>
        <button class="primary-action" type="button" @click="downloadTable">
          Download
        </button>
      </div>
    </section>

    <!--
      Top-level controls:
      These are Vue-controlled inputs that call Tabulator methods. They complement
      Tabulator's header filters, which are rendered inside the table headers.
    -->
    <section class="control-panel" aria-label="Table controls">
      <label class="field search-field">
        <span>Global filter</span>
        <input
          v-model="globalSearch"
          type="search"
          placeholder="Search student, exam, payment method..."
          @input="applyFilters"
        />
      </label>

      <label class="field">
        <span>Status</span>
        <select v-model="statusFilter" @change="applyFilters">
          <option value="">All statuses</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Pending</option>
          <option value="Failed">Failed</option>
          <option value="Refunded">Refunded</option>
        </select>
      </label>

      <div class="button-group" aria-label="Sorting shortcuts">
        <span>Sort: {{ activeSort }}</span>
        <button type="button" @click="sortBy('date', 'desc', 'Date descending')">
          Newest
        </button>
        <button type="button" @click="sortBy('amount', 'desc', 'Amount high to low')">
          Top amount
        </button>
        <button type="button" @click="sortBy('student', 'asc', 'Student A-Z')">
          Student A-Z
        </button>
      </div>

      <button class="ghost-action" type="button" @click="clearFilters">
        Clear filters
      </button>
    </section>

    <!--
      Table host:
      Vue renders only this container. Tabulator takes over the element referenced by
      tableEl and imperatively renders headers, rows, pagination, and footer controls.
    -->
    <section class="table-card">
      <div class="table-card-header">
        <div>
          <h2>Transaction History</h2>
          <p>
            Use the header inputs for column-level filtering. Click column headers to
            sort directly in the Tabulator grid.
          </p>
        </div>
      </div>

      <div ref="tableEl" class="transaction-table"></div>
    </section>

    <!--
      Receipt modal:
      Teleport moves the modal to <body> so it is not clipped by the table card or
      affected by parent stacking contexts. The modal opens when selectedReceipt has
      row data and closes when that state is reset to null.
    -->
    <Teleport to="body">
      <div
        v-if="selectedReceipt"
        class="receipt-modal-backdrop"
        role="presentation"
        @click.self="closeReceipt"
      >
        <aside
          class="receipt-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="receipt-title"
        >
          <div class="receipt-panel-header">
            <div>
              <span>Receipt preview</span>
              <h3 id="receipt-title">{{ selectedReceipt.id }}</h3>
            </div>
            <button type="button" class="receipt-close" @click="closeReceipt">
              Close
            </button>
          </div>

          <dl class="receipt-grid">
            <div>
              <dt>Student</dt>
              <dd>{{ selectedReceipt.student }}</dd>
            </div>
            <div>
              <dt>Exam</dt>
              <dd>{{ selectedReceipt.exam }}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{{ selectedReceipt.date }}</dd>
            </div>
            <div>
              <dt>Method</dt>
              <dd>{{ selectedReceipt.method }}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span :class="['status-pill', statusClass[selectedReceipt.status]]">
                  {{ selectedReceipt.status }}
                </span>
              </dd>
            </div>
          </dl>

          <div class="receipt-total">
            <span>Amount</span>
            <strong>{{ currencyFormatter.format(selectedReceipt.amount) }}</strong>
          </div>
        </aside>
      </div>
    </Teleport>
  </main>
</template>
