/* ═══════════════════════════════════════════════════════════════
   DOCUFLOW — ENTERPRISE DMS
   JavaScript: State · Navigation · Storage · UI Logic
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────────────────────
   LOCAL STORAGE HELPERS
────────────────────────────────────────────────────────────── */
const STORE_KEY = 'docuflow_docs';

function getDocs() {
  return JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
}

function saveDocs(docs) {
  localStorage.setItem(STORE_KEY, JSON.stringify(docs));
}

/* ──────────────────────────────────────────────────────────────
   STATE
────────────────────────────────────────────────────────── */
let currentScreen   = 'dashboard';
let filterActive    = false;
let selectedFileIdx = 0;

/** Files currently attached in the Upload form (key = slot id) */
const uploadedFiles = {};

/* ──────────────────────────────────────────────────────────────
   DOCUMENT SLOT DEFINITIONS
────────────────────────────────────────────────────────── */
const DOC_SLOTS = [
  { id: 'rfc',      name: 'RFC',               type: 'PDF, JPG (MAX. 5MB)',  hint: 'Registro Federal de Contribuyentes', icon: 'file'   },
  { id: 'acta',     name: 'Acta Constitutiva', type: 'PDF (MAX. 20MB)',       hint: 'Documento notariado completo',       icon: 'doc'    },
  { id: 'id_rep',   name: 'ID Representante',  type: 'Frente y Vuelta',       hint: 'Identificación oficial vigente',     icon: 'id'     },
  { id: 'propuesta',name: 'Propuesta Comercial',type: 'PDF',                  hint: 'Adjuntar última cotización',         icon: 'doc'    },
  { id: 'cedula',   name: 'Cédula Fiscal',      type: 'CSF',                  hint: 'Situación Fiscal Actual',            icon: 'doc'    },
  { id: 'poderes',  name: 'Poderes Legales',    type: 'OPCIONAL',             hint: 'Documento de Poderes',               icon: 'stamp'  },
  { id: 'otros',    name: 'Otros',              type: 'ADICIONALES',          hint: 'Cualquier otro documento',           icon: 'folder' },
];

/* ──────────────────────────────────────────────────────────────
   ICON SVG BUILDERS
────────────────────────────────────────────────────────── */
const ICON_SVG = {
  file: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2">
           <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
           <polyline points="14 2 14 8 20 8"/>
         </svg>`,
  doc:  `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2">
           <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
           <polyline points="14 2 14 8 20 8"/>
           <line x1="16" y1="13" x2="8" y2="13"/>
           <line x1="16" y1="17" x2="8" y2="17"/>
         </svg>`,
  id:   `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2">
           <rect x="2" y="7" width="20" height="14" rx="2"/>
           <path d="M16 3v4M8 3v4M2 11h20"/>
           <circle cx="9" cy="16" r="2"/>
           <path d="M13 15h4M13 18h4"/>
         </svg>`,
  stamp:`<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2">
           <path d="M18 16v2a2 2 0 01-2 2H8a2 2 0 01-2-2v-2"/>
           <path d="M12 12v4"/>
           <path d="M7 10l5-8 5 8"/>
         </svg>`,
  folder:`<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2">
            <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
            <line x1="12" y1="11" x2="12" y2="17"/>
            <line x1="9"  y1="14" x2="15" y2="14"/>
          </svg>`,
  delete:`<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>`,
  file_sm:`<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
             <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
             <polyline points="14 2 14 8 20 8"/>
           </svg>`,
};

/* ──────────────────────────────────────────────────────────────
   NAVIGATION
────────────────────────────────────────────────────────── */
const ALL_SCREENS = ['dashboard', 'legal', 'rh', 'explorer', 'upload', 'settings'];

/** Map screen name → sidebar nav id */
const NAV_MAP = {
  dashboard: 'nav-dashboard',
  legal:     'nav-legal',
  rh:        'nav-rh',
  explorer:  'nav-explorer',
  settings:  'nav-settings',
  upload:    'nav-legal',   // upload belongs to legal module
};

function navigate(screen) {
  currentScreen = screen;

  // Show / hide screens
  ALL_SCREENS.forEach(s => {
    const el = document.getElementById('screen-' + s);
    if (!el) return;
    el.style.display = (s === screen) ? (s === 'explorer' ? 'grid' : 'block') : 'none';
  });

  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navId = NAV_MAP[screen];
  if (navId) document.getElementById(navId)?.classList.add('active');

  // Screen-specific init
  if (screen === 'upload')   renderDocSlots();
  if (screen === 'explorer') renderFileTable();

  window.scrollTo(0, 0);
}

/* ──────────────────────────────────────────────────────────────
   LOGIN
────────────────────────────────────────────────────────── */
function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  const valid = (email.includes('@') && pass.length >= 3)
             || (email === 'admin'   && pass === 'admin');

  if (valid) {
    const loginScreen = document.getElementById('login-screen');
    loginScreen.style.opacity = '0';
    setTimeout(() => {
      loginScreen.style.display = 'none';
      document.getElementById('app-shell').classList.add('visible');
      updateStats();
    }, 300);
  } else {
    document.getElementById('login-error').style.display = 'block';
  }
}

/* ──────────────────────────────────────────────────────────────
   DASHBOARD — LIVE STATS
────────────────────────────────────────────────────────── */
function updateStats() {
  const docs = getDocs();
  document.getElementById('stat-total').textContent    = (12482 + docs.length).toLocaleString();
  document.getElementById('stat-uploaded').textContent = 156 + docs.length;
}

/* ──────────────────────────────────────────────────────────────
   GLOBAL SEARCH
────────────────────────────────────────────────────────── */
function handleSearch(value) {
  if (value.length < 2) return;
  const q       = value.toLowerCase();
  const docs    = getDocs();
  const matches = docs.filter(d => d.name.toLowerCase().includes(q));
  if (matches.length > 0) {
    showToast(`${matches.length} doc(s) encontrado(s): ${matches[0].name}`);
  }
}

/* ──────────────────────────────────────────────────────────────
   LEGAL — TABLE FILTER
────────────────────────────────────────────────────────── */
function filterTable() {
  filterActive = !filterActive;
  document.querySelectorAll('#negotiations-body tr').forEach(row => {
    if (filterActive) {
      row.style.display = row.querySelector('.ficha-status--uploaded') ? '' : 'none';
    } else {
      row.style.display = '';
    }
  });
  showToast(filterActive ? 'Filtro: Solo fichas subidas' : 'Filtro eliminado');
}

/* ──────────────────────────────────────────────────────────────
   LEGAL — CHAT
────────────────────────────────────────────────────────── */
function sendMsg() {
  const input    = document.getElementById('chat-input');
  const text     = input.value.trim();
  if (!text) return;

  const container = document.getElementById('chat-messages');
  const msgEl     = document.createElement('div');
  msgEl.className = 'chat-msg chat-msg--sent';
  msgEl.innerHTML = `${text}<div class="chat-msg-meta">Admin - Ahora</div>`;
  container.appendChild(msgEl);

  input.value = '';
  container.scrollTop = container.scrollHeight;
}

/* ──────────────────────────────────────────────────────────────
   DOCUMENT EXPLORER — FILE TABLE
────────────────────────────────────────────────────────── */
/** Static seed data already in HTML; extra rows come from localStorage */
const STATIC_FILES = [
  { name: 'MSA_Global_Logistics_2024.pdf',     ext: 'PDF',  created: 'Jan 12, 2024', modified: '2 hours ago'  },
  { name: 'Employment_Agreement_Template.docx', ext: 'DOCX', created: 'Feb 5, 2024',  modified: 'Yesterday'    },
  { name: 'Budget_Projections_Q308.xlsx',       ext: 'XLSX', created: 'Mar 1, 2024',  modified: '4 days ago'   },
];

function renderFileTable() {
  const docs  = getDocs();
  if (docs.length === 0) return;

  const tbody = document.getElementById('file-table-body');

  // Avoid duplicating rows on repeated visits
  tbody.querySelectorAll('.dynamic-row').forEach(r => r.remove());

  docs.forEach((doc, i) => {
    const tr = document.createElement('tr');
    tr.className = 'dynamic-row';
    tr.style.cursor = 'pointer';
    tr.onclick = () => selectFile(STATIC_FILES.length + i);
    tr.innerHTML = `
      <td><input type="checkbox"></td>
      <td>
        <div class="file-name-cell">
          <div class="file-icon file-icon--pdf">PDF</div>
          <div>${doc.name}</div>
        </div>
      </td>
      <td class="td-muted">PDF File</td>
      <td class="td-muted td-sm">Admin User</td>
      <td class="td-muted td-sm">${doc.date}</td>
      <td class="td-muted td-sm">${doc.size}</td>
    `;
    tbody.appendChild(tr);
  });
}

function selectFile(index) {
  selectedFileIdx = index;
  const file = STATIC_FILES[index] || { ext: 'PDF', created: '—', modified: '—' };

  document.getElementById('det-ext').textContent      = file.ext;
  document.getElementById('det-created').textContent  = file.created;
  document.getElementById('det-modified').textContent = file.modified;

  // Highlight selected row
  document.querySelectorAll('.file-table tr').forEach((row, i) => {
    if (i > 0) row.style.background = (i - 1 === index) ? 'var(--surface-cont)' : '';
  });
}

function selectFolder(name) {
  document.querySelectorAll('.lib-item').forEach(el => el.classList.remove('lib-item--active'));

  // Match by first 4 chars of lowercase name (legal, rh--, prov, arch)
  const key = name.toLowerCase().slice(0, 4);
  document.getElementById('lib-' + key)?.classList.add('lib-item--active');
  document.getElementById('folder-breadcrumb').textContent = name;
}

/* ──────────────────────────────────────────────────────────────
   UPLOAD FORM — DOC SLOTS
────────────────────────────────────────────────────────── */
function renderDocSlots() {
  const grid = document.getElementById('doc-grid');
  if (!grid) return;

  grid.innerHTML = DOC_SLOTS.map(slot => {
    const hasFile   = Boolean(uploadedFiles[slot.id]);
    const slotClass = `doc-slot${hasFile ? ' doc-slot--has-file' : ''}`;
    const bodyClass = `doc-slot-body${hasFile ? ' doc-slot-body--has-file' : ''}`;
    const hintHTML  = hasFile
      ? 'Archivo listo'
      : 'Arrastra y suelta o <strong>haz clic</strong>';

    const fileRowHTML = hasFile ? `
      <div class="doc-file-row">
        ${ICON_SVG.file_sm}
        <span class="doc-file-name">${uploadedFiles[slot.id]}</span>
        <span class="doc-file-del" onclick="removeFile(event, '${slot.id}')">
          ${ICON_SVG.delete}
        </span>
      </div>` : '';

    return `
      <div class="${slotClass}" id="slot-${slot.id}" onclick="triggerUpload('${slot.id}')">
        <div class="doc-slot-header">
          <span class="doc-slot-name">${slot.name}</span>
          <span class="doc-slot-type">${slot.type}</span>
        </div>
        <div class="${bodyClass}">
          ${ICON_SVG[slot.icon] || ICON_SVG.file}
          <div class="doc-slot-hint">${hintHTML}</div>
          <div class="doc-slot-sub">${slot.hint}</div>
        </div>
        ${fileRowHTML}
        <input type="file" class="hidden-file" id="file-${slot.id}"
               onchange="fileChosen('${slot.id}', this)">
      </div>`;
  }).join('');
}

function triggerUpload(slotId) {
  document.getElementById('file-' + slotId)?.click();
}

function fileChosen(slotId, input) {
  const file = input.files?.[0];
  if (!file) return;

  uploadedFiles[slotId] = file.name;

  // Persist to localStorage
  const docs = getDocs();
  docs.push({
    id:    Date.now(),
    name:  file.name,
    folder:'Legal',
    size:  (file.size / 1024 / 1024).toFixed(2) + ' MB',
    date:  new Date().toLocaleDateString('es-MX'),
    owner: 'Admin User',
  });
  saveDocs(docs);

  updateStats();
  renderDocSlots();
  showToast(`Archivo "${file.name}" cargado correctamente`);
}

function removeFile(event, slotId) {
  event.stopPropagation();
  delete uploadedFiles[slotId];
  renderDocSlots();
}

function submitForm() {
  const count = Object.keys(uploadedFiles).length;
  if (count === 0) {
    showToast('Adjunta al menos un documento para continuar');
    return;
  }
  showToast(`Expediente enviado correctamente (${count} doc${count > 1 ? 's' : ''})`);
  setTimeout(() => navigate('legal'), 1200);
}

/* ──────────────────────────────────────────────────────────────
   TOAST NOTIFICATION
────────────────────────────────────────────────────────── */
let toastTimer = null;

function showToast(message, duration = 2800) {
  const toast   = document.getElementById('toast');
  const msgSpan = document.getElementById('toast-msg');
  msgSpan.textContent = message;
  toast.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

/* ──────────────────────────────────────────────────────────────
   DRAG & DROP (upload screen)
────────────────────────────────────────────────────────── */
document.addEventListener('dragover', e => e.preventDefault());

document.addEventListener('drop', e => {
  e.preventDefault();
  const file = e.dataTransfer.files?.[0];
  if (!file) return;

  const slot = e.target.closest('.doc-slot');
  if (!slot) return;

  const slotId = slot.id.replace('slot-', '');
  uploadedFiles[slotId] = file.name;

  const docs = getDocs();
  docs.push({
    id:    Date.now(),
    name:  file.name,
    folder:'Legal',
    size:  (file.size / 1024 / 1024).toFixed(2) + ' MB',
    date:  new Date().toLocaleDateString('es-MX'),
    owner: 'Admin User',
  });
  saveDocs(docs);

  updateStats();
  renderDocSlots();
  showToast(`"${file.name}" adjuntado correctamente`);
});

/* ──────────────────────────────────────────────────────────────
   KEYBOARD SHORTCUTS
────────────────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  // Enter on login screen → submit
  const loginScreen = document.getElementById('login-screen');
  if (e.key === 'Enter' && loginScreen && loginScreen.style.display !== 'none') {
    doLogin();
  }
});
