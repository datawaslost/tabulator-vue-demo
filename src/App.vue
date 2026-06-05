<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { TabulatorFull as Tabulator } from 'tabulator-tables'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import { applyPlugin } from 'jspdf-autotable'

applyPlugin(jsPDF)

const tableEl = ref(null)
const globalSearch = ref('')
const statusFilter = ref('')
const exportFormat = ref('csv')
const activeSort = ref('Date descending')
const selectedReceipt = ref(null)

let table = null

const transactions = [
  {
    id: 'TX-1042',
    date: '2026-05-30',
    student: 'Maya Chen',
    exam: 'Computer Science Placement Exam',
    method: 'ACH',
    status: 'Paid',
    amount: 185.0,
  },
  {
    id: 'TX-1043',
    date: '2026-05-29',
    student: 'Noah Patel',
    exam: 'Business Analytics Certification',
    method: 'Card',
    status: 'Pending',
    amount: 260.0,
  },
  {
    id: 'TX-1044',
    date: '2026-05-28',
    student: 'Isabella Garcia',
    exam: 'Nursing Entrance Exam',
    method: 'Scholarship',
    status: 'Paid',
    amount: 125.0,
  },
  {
    id: 'TX-1045',
    date: '2026-05-27',
    student: 'Liam Brooks',
    exam: 'Architecture Portfolio Review',
    method: 'Card',
    status: 'Refunded',
    amount: -95.0,
  },
  {
    id: 'TX-1046',
    date: '2026-05-26',
    student: 'Ava Thompson',
    exam: 'Biology Lab Practical',
    method: 'Wire',
    status: 'Paid',
    amount: 150.0,
  },
  {
    id: 'TX-1047',
    date: '2026-05-25',
    student: 'Ethan Wilson',
    exam: 'Economics Qualifying Exam',
    method: 'Cash',
    status: 'Failed',
    amount: 75.0,
  },
  {
    id: 'TX-1048',
    date: '2026-05-24',
    student: 'Sophia Nguyen',
    exam: 'Design Studio Assessment',
    method: 'ACH',
    status: 'Pending',
    amount: 210.0,
  },
  {
    id: 'TX-1049',
    date: '2026-05-23',
    student: 'Jackson Rivera',
    exam: 'Mechanical Engineering Fundamentals',
    method: 'Scholarship',
    status: 'Paid',
    amount: 325.0,
  },
  {
    id: 'TX-1050',
    date: '2026-05-22',
    student: 'Amelia Carter',
    exam: 'Psychology Methods Exam',
    method: 'Card',
    status: 'Paid',
    amount: 140.0,
  },
  {
    id: 'TX-1051',
    date: '2026-05-21',
    student: 'Lucas Kim',
    exam: 'Computer Science Placement Exam',
    method: 'ACH',
    status: 'Failed',
    amount: 185.0,
  },
  {
    id: 'TX-1052',
    date: '2026-05-20',
    student: 'Charlotte Hayes',
    exam: 'English Composition Exam',
    method: 'Wire',
    status: 'Pending',
    amount: 110.0,
  },
  {
    id: 'TX-1053',
    date: '2026-05-19',
    student: 'Benjamin Foster',
    exam: 'Chemistry Lab Practical',
    method: 'Card',
    status: 'Paid',
    amount: 135.0,
  },
  {
    id: 'TX-1054',
    date: '2026-05-18',
    student: 'Harper Allen',
    exam: 'Music Theory Placement',
    method: 'Cash',
    status: 'Refunded',
    amount: -80.0,
  },
  {
    id: 'TX-1055',
    date: '2026-05-17',
    student: 'Daniel Morgan',
    exam: 'Data Science Capstone Exam',
    method: 'ACH',
    status: 'Paid',
    amount: 375.0,
  },
  {
    id: 'TX-1056',
    date: '2026-05-16',
    student: 'Mia Sullivan',
    exam: 'Public Health Board Prep',
    method: 'Card',
    status: 'Pending',
    amount: 195.0,
  },
  {
    id: 'TX-1057',
    date: '2026-05-15',
    student: 'Henry Ortiz',
    exam: 'Political Science Comprehensive',
    method: 'Wire',
    status: 'Paid',
    amount: 225.0,
  },
  {
    id: 'TX-1058',
    date: '2026-05-14',
    student: 'Ella Reed',
    exam: 'Theater Audition Review',
    method: 'ACH',
    status: 'Failed',
    amount: 95.0,
  },
  {
    id: 'TX-1059',
    date: '2026-05-13',
    student: 'Owen Murphy',
    exam: 'Civil Engineering Fundamentals',
    method: 'Scholarship',
    status: 'Paid',
    amount: 325.0,
  },
]

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

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
    table.clearFilter()
    return
  }

  table.setFilter(
    (data, params) => {
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
  globalSearch.value = ''
  statusFilter.value = ''
  table?.clearHeaderFilter()
  table?.clearFilter(true)
}

function sortBy(field, dir, label) {
  table?.setSort(field, dir)
  activeSort.value = label
}

function viewReceipt(transaction) {
  selectedReceipt.value = transaction
}

function closeReceipt() {
  selectedReceipt.value = null
}

function handleEscape(event) {
  if (event.key === 'Escape') {
    closeReceipt()
  }
}

function downloadTable() {
  if (!table) return

  const format = exportFormat.value
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

  table.download(format, `campus-exam-payments.${format}`, exportOptions[format])
}

onMounted(() => {
  table = new Tabulator(tableEl.value, {
    data: transactions,
    dependencies: {
      XLSX,
      jspdf: { jsPDF },
    },
    layout: 'fitColumns',
    responsiveLayout: false,
    pagination: true,
    paginationSize: 8,
    paginationSizeSelector: [8, 12, 18],
    movableColumns: true,
    initialSort: [{ column: 'date', dir: 'desc' }],
    placeholder: 'No transactions match the current filters.',
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
          return '<button class="row-action" type="button">Receipt</button>'
        },
        cellClick(event, cell) {
          event.stopPropagation()
          viewReceipt(cell.getRow().getData())
        },
        width: 112,
      },
    ],
  })

  document.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleEscape)
  table?.destroy()
  table = null
})
</script>

<template>
  <main class="page-shell">
    <section class="hero">
      <div>
        <p class="eyebrow">Vue 3 + Tabulator</p>
        <h1>Tabulator Table Demo</h1>
        <p class="hero-copy">
          A single-page Vue demo showing Tabulator sorting, column filtering, global
          filtering, pagination, row actions, movable columns, and downloads.
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
