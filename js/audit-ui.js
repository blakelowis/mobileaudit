// === AUDIT UI — Mobile-first render functions ===

var _expandedCategories = {};

function renderHome() {
  var main = document.getElementById('mainView');
  main.innerHTML = `
    <div class="max-w-lg mx-auto">
      <div class="text-center py-8">
        <div class="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
        </div>
        <h1 class="text-3xl font-black outfit birds-green mb-2">Birds Audit</h1>
        <p class="text-slate-400 font-bold text-sm mb-8">Retail store audit — mobile</p>
        <button onclick="startNewAudit()" class="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-black py-5 rounded-2xl text-lg shadow-lg transition-colors">
          Start New Audit
        </button>
      </div>
      <div id="auditHistory"></div>
    </div>`;
  loadAuditHistory();
}

async function loadAuditHistory() {
  var el = document.getElementById('auditHistory');
  if (!el) return;
  var rows = await idbGetAll('history');
  var trainingRows = await idbGetAll('training_audits');
  var allRows = rows.concat(trainingRows.map(function(r) { r._isTraining = true; return r; }));
  if (!allRows.length) { el.innerHTML = ''; return; }
  allRows.sort(function(a, b) { return (b.date || '').localeCompare(a.date || ''); });
  var cards = allRows.slice(0, 20).map(function(r) {
    var rag = r.score >= 95 ? 'text-emerald-600' : r.score >= 90 ? 'text-green-600' : r.score >= 80 ? 'text-amber-600' : 'text-red-600';
    var trainingBadge = r._isTraining || r.isTraining ? ' <span class="bg-amber-100 text-amber-700 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase">Training</span>' : '';
    return '<div class="bg-white rounded-xl border border-slate-200 p-4 mb-3 flex items-center justify-between">' +
      '<div><div class="font-black text-slate-800 text-sm">' + escapeHtml(r.store) + trainingBadge + '</div>' +
      '<div class="text-xs text-slate-400 font-bold">' + escapeHtml(r.date) + ' &bull; ' + escapeHtml(r.auditor) + '</div></div>' +
      '<div class="text-2xl font-black ' + rag + '">' + (r.score != null ? r.score + '%' : '—') + '</div></div>';
  }).join('');
  el.innerHTML = '<h3 class="font-black text-slate-800 text-sm uppercase tracking-widest text-slate-400 mb-3">Recent Audits</h3>' + cards;
}

// === BREADCRUMBS ===
function renderCrumbs() {
  var html = '<div class="flex items-center gap-1.5 mb-4 text-xs font-bold overflow-x-auto whitespace-nowrap pb-1">';
  if (auditState.view === 'sectors' || auditState.view === 'meta') {
    html += '<span class="text-slate-800">Sectors</span>';
  } else if (auditState.view === 'categories') {
    html += '<button onclick="goSectors()" class="text-emerald-600 active:text-emerald-800">Sectors</button>';
    html += '<span class="text-slate-300">/</span>';
    html += '<span class="text-slate-800">' + escapeHtml(auditState.sectors[auditState.sectorId].title) + '</span>';
  } else if (auditState.view === 'questions') {
    html += '<button onclick="goSectors()" class="text-emerald-600 active:text-emerald-800">Sectors</button>';
    html += '<span class="text-slate-300">/</span>';
    html += '<button onclick="goSector(auditState.sectorId)" class="text-emerald-600 active:text-emerald-800">' + escapeHtml(auditState.sectors[auditState.sectorId].title) + '</button>';
    html += '<span class="text-slate-300">/</span>';
    var cat = auditState.sectors[auditState.sectorId].categories.find(function(c) { return c.id === auditState.categoryId; });
    html += '<span class="text-slate-800">' + escapeHtml(cat ? cat.name : '') + '</span>';
  }
  html += '</div>';
  return html;
}

// === META FORM ===
function renderMetaView() {
  var main = document.getElementById('mainView');
  var meta = auditState || {};
  var qbInfo = _auditQB ? '<span class="text-emerald-600 font-bold">Loaded (' + Object.keys(_auditQB).length + ' sectors)</span>' : '<span class="text-amber-600 font-bold">Loading...</span>';
  var isTraining = meta.isTraining || false;

  var storeFieldHTML = '';
  var emailPlaceholder = 'auto from store';
  var managerPlaceholder = 'e.g. John Smith';
  var auditorDefault = escapeHtml(meta.auditor || 'Blake Lowis');

  if (isTraining) {
    storeFieldHTML =
      '<div>' +
        '<label class="text-xs font-black text-amber-600 uppercase">Store Name (Training)</label>' +
        '<input id="trainingStoreInput" type="text" value="' + escapeHtml(meta.branchId === '__training' ? meta.storeName : '') + '" placeholder="e.g. Alvaston" class="w-full border border-amber-200 bg-amber-50 rounded-xl px-4 py-3.5 text-sm mt-1 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none">' +
      '</div>';
    emailPlaceholder = 'e.g. trainee@birdsofderby.co.uk';
    managerPlaceholder = 'Store manager name';
    auditorDefault = escapeHtml(meta.auditor || '');
  }

  main.innerHTML = `
    <div class="max-w-lg mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <button onclick="goHome()" class="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors">
          <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <h2 class="text-2xl font-black outfit birds-green uppercase">New Audit</h2>
      </div>

      <div onclick="toggleTrainingMode()" class="w-full flex items-center gap-4 ${isTraining ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-200'} rounded-2xl px-5 py-4 mb-4 cursor-pointer active:scale-[0.98] transition-all select-none">
        <div class="w-10 h-10 rounded-xl ${isTraining ? 'bg-amber-100' : 'bg-slate-200'} flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 ${isTraining ? 'text-amber-600' : 'text-slate-400'}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
        </div>
        <div class="flex-1">
          <div class="text-sm font-black ${isTraining ? 'text-amber-700' : 'text-slate-600'}">Training Mode</div>
          <div class="text-[11px] ${isTraining ? 'text-amber-500' : 'text-slate-400'}">${isTraining ? 'ON — custom store name, exported as TRAINING' : 'Tap to enable for practice audits'}</div>
        </div>
        <div class="w-12 h-7 rounded-full ${isTraining ? 'bg-amber-400' : 'bg-slate-300'} flex items-center px-0.5 transition-colors flex-shrink-0">
          <div class="w-6 h-6 rounded-full bg-white shadow transition-transform ${isTraining ? 'translate-x-5' : ''}"></div>
        </div>
      </div>

      <div class="bg-white rounded-2xl border ${isTraining ? 'border-amber-200' : 'border-slate-200'} p-5 shadow-sm mb-4">
        <h3 class="font-black ${isTraining ? 'text-amber-800' : 'text-slate-800'} mb-4">${isTraining ? 'Training Audit Details' : 'Store Details'}</h3>
        <div class="space-y-3">
          ${storeFieldHTML}
          <div>
            <label class="text-xs font-black text-slate-500 uppercase">Email ${isTraining ? '' : '*'}</label>
            <input id="metaEmail" type="email" value="${escapeHtml(meta.email || '')}" placeholder="${emailPlaceholder}" class="w-full border border-slate-200 rounded-xl px-4 py-3.5 text-sm mt-1">
          </div>
          <div>
            <label class="text-xs font-black text-slate-500 uppercase">Store Manager *</label>
            <input id="metaManager" type="text" value="${escapeHtml(meta.manager || '')}" placeholder="${managerPlaceholder}" class="w-full border border-slate-200 rounded-xl px-4 py-3.5 text-sm mt-1">
          </div>
          <div>
            <label class="text-xs font-black text-slate-500 uppercase">Auditor</label>
            <input id="metaAuditor" type="text" value="${auditorDefault}" placeholder="${isTraining ? 'Trainee name' : ''}" class="w-full border border-slate-200 rounded-xl px-4 py-3.5 text-sm mt-1">
          </div>
          <div>
            <label class="text-xs font-black text-slate-500 uppercase">Date</label>
            <input id="metaDate" type="date" value="${escapeHtml(meta.date || new Date().toISOString().slice(0, 10))}" class="w-full border border-slate-200 rounded-xl px-4 py-3.5 text-sm mt-1">
          </div>
          <div>
            <label class="text-xs font-black text-slate-500 uppercase">Summary (optional)</label>
            <textarea id="metaSummary" maxlength="300" rows="2" placeholder="Overall notes..." class="w-full border border-slate-200 rounded-xl px-4 py-3.5 text-sm mt-1">${escapeHtml(meta.summary || '')}</textarea>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-6">
        <div class="flex items-center justify-between">
          <h3 class="font-black text-slate-800">Question Bank</h3>
          <span class="text-xs">${qbInfo}</span>
        </div>
      </div>

      <button onclick="beginAudit()" id="metaStartBtn" class="w-full ${isTraining ? 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700' : 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700'} disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black py-5 rounded-2xl text-lg shadow-lg transition-colors">
        ${isTraining ? 'Start Training Audit' : 'Start Audit'}
      </button>
    </div>`;

  if (!isTraining) renderStorePickerList('');
}

window.openStorePicker = function() {
  var dd = document.getElementById('storePickerDropdown');
  var search = document.getElementById('storePickerSearch');
  dd.classList.remove('hidden');
  search.value = '';
  search.focus();
  renderStorePickerList('');
};

window.closeStorePicker = function() {
  document.getElementById('storePickerDropdown').classList.add('hidden');
};

window.filterStorePicker = function(q) {
  renderStorePickerList(q);
};

window.renderStorePickerList = function(q) {
  var el = document.getElementById('storePickerList');
  if (!el) return;
  var query = (q || '').toLowerCase();
  var filtered = query ? STORES.filter(function(s) {
    return s.name.toLowerCase().indexOf(query) > -1 || s.am.toLowerCase().indexOf(query) > -1;
  }) : STORES;
  var selected = auditState ? auditState.branchId : null;
  el.innerHTML = filtered.map(function(s) {
    var isActive = s.id === selected;
    return '<button onclick="pickStore(\'' + s.id + '\')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ' + (isActive ? 'bg-emerald-50' : 'active:bg-slate-100') + '">' +
      '<div class="flex-1 min-w-0">' +
        '<div class="text-sm font-bold ' + (isActive ? 'text-emerald-700' : 'text-slate-800') + ' truncate">' + escapeHtml(s.name) + '</div>' +
        '<div class="text-[10px] ' + (isActive ? 'text-emerald-500' : 'text-slate-400') + '">' + escapeHtml(s.am) + '</div>' +
      '</div>' +
      (isActive ? '<svg class="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>' : '') +
    '</button>';
  }).join('');
  if (!filtered.length) {
    el.innerHTML = '<div class="px-4 py-6 text-center text-sm text-slate-400 font-bold">No stores match "' + escapeHtml(q) + '"</div>';
  }
};

window.pickStore = function(id) {
  var s = STORES.find(function(x) { return x.id === id; });
  if (!s) return;
  var wasTraining = auditState ? auditState.isTraining : false;
  auditInit(s.id, s.name, s.am);
  auditState.isTraining = wasTraining;
  var label = document.getElementById('storePickerLabel');
  if (label) { label.textContent = s.name; label.className = 'text-slate-800 font-bold'; }
  var em = document.getElementById('metaEmail');
  var mg = document.getElementById('metaManager');
  if (em) em.value = auditState.email;
  if (mg) mg.placeholder = 'e.g. ' + (s.manager || 'Name');
  closeStorePicker();
};

window.toggleTrainingMode = function() {
  if (!auditState) return;
  auditState.isTraining = !auditState.isTraining;
  auditState.view = 'meta';
  renderMetaView();
};

document.addEventListener('click', function(e) {
  var wrap = document.getElementById('storePickerWrap');
  var dd = document.getElementById('storePickerDropdown');
  if (!wrap || !dd || dd.classList.contains('hidden')) return;
  if (!wrap.contains(e.target)) closeStorePicker();
});

window.beginAudit = function() {
  if (!_auditQB) { alert('Question bank still loading...'); return; }
  if (!auditState) { alert('Something went wrong — please go back and try again.'); return; }

  if (auditState.isTraining) {
    var customName = (document.getElementById('trainingStoreInput') || {}).value || '';
    if (!customName.trim()) { alert('Enter a store name for this training audit.'); return; }
    auditState.branchId = '__training';
    auditState.storeName = customName.trim();
    auditState.email = (document.getElementById('metaEmail') || {}).value || '';
    auditState.areaManager = 'Training';
  } else {
    if (!auditState.branchId) { alert('Select a store first.'); return; }
    auditState.email = (document.getElementById('metaEmail') || {}).value || '';
  }

  auditState.manager = (document.getElementById('metaManager') || {}).value || '';
  auditState.auditor = (document.getElementById('metaAuditor') || {}).value || (auditState.isTraining ? '' : 'Blake Lowis');
  auditState.date = (document.getElementById('metaDate') || {}).value || new Date().toISOString().slice(0, 10);
  auditState.summary = (document.getElementById('metaSummary') || {}).value || '';
  auditInitSectors();
  _expandedCategories = {};
  auditState.view = 'sectors';
  renderAuditPerform();
};

// === SECTOR VIEW ===
function renderSectorView() {
  var main = document.getElementById('mainView');
  var overall = auditOverallMetrics();
  var counts = auditTotalAnswered();
  var actions = auditGetActions();
  var sectorCards = auditSectorKeys().map(function(sid) {
    var sec = auditState.sectors[sid];
    var m = auditSectorMetrics(sid);
    var meta = SECTOR_META[sid] || { color: 'slate' };
    var pctText = m.answered ? m.penalisedPct + '%' : '—';
    var pctRag = m.answered ? auditScoreRag(m.penalisedPct) : 'text-slate-400';
    return '<button onclick="goSector(\'' + sid + '\')" class="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm active:shadow-md transition-all text-left">' +
      '<div class="flex items-center justify-between mb-2">' +
        '<div class="w-10 h-10 rounded-xl bg-' + meta.color + '-50 flex items-center justify-center">' +
          '<svg class="w-5 h-5 text-' + meta.color + '-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="' + meta.icon + '"/></svg>' +
        '</div>' +
        '<span class="text-lg font-black ' + pctRag + '">' + pctText + '</span>' +
      '</div>' +
      '<div class="font-black text-slate-800 text-sm mb-1">' + escapeHtml(sec.title) + '</div>' +
      '<div class="text-[11px] text-slate-400">' + m.answered + ' answered &bull; ' + m.fails + ' fails' + (m.criticalCount ? ' &bull; ' + m.criticalCount + ' critical' : '') + '</div>' +
      '<div class="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">' +
        '<div class="h-full bg-' + meta.color + '-400 rounded-full transition-all" style="width:' + (m.answered ? Math.round(m.passes / (m.passes + m.fails || 1) * 100) : 0) + '%"></div>' +
      '</div></button>';
  }).join('');

  // Action Review section
  var actionReviewHTML = '';
  if (actions.length > 0) {
    var actionRows = actions.map(function(a) {
      var statusCls = (a.action.status || 'Open') === 'Open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
      var critBadge = a.action.critical ? '<span class="bg-red-100 text-red-700 text-[9px] font-black px-1.5 py-0.5 rounded-full">CRITICAL</span> ' : '';
      var photoIndicator = a.photos.filter(Boolean).length > 0 ? '<span class="text-slate-400">' + a.photos.filter(Boolean).length + '</span>' : '';
      return '<tr onclick="jumpToQuestion(\'' + a.questionId + '\')" class="border-b border-slate-100 active:bg-slate-50 cursor-pointer">' +
        '<td class="py-2.5 px-2 text-[11px] font-bold text-slate-600 max-w-[80px] truncate">' + escapeHtml(a.sector) + '</td>' +
        '<td class="py-2.5 px-2 text-[11px] text-slate-800 max-w-[120px] truncate">' + escapeHtml(a.question.substring(0, 40)) + '</td>' +
        '<td class="py-2.5 px-2 text-[10px] font-bold">' + critBadge + '<span class="' + statusCls + ' px-2 py-0.5 rounded-full">' + (a.action.status || 'Open') + '</span></td>' +
        '<td class="py-2.5 px-2 text-center">' + photoIndicator + '</td>' +
      '</tr>';
    }).join('');

    actionReviewHTML = `
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm mb-4 overflow-hidden">
        <button onclick="toggleActionReview()" class="w-full flex items-center justify-between px-5 py-4 active:bg-slate-50 transition-colors">
          <div class="flex items-center gap-2">
            <h3 class="font-black text-slate-800 text-sm">Action Review</h3>
            <span class="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full">${actions.length} items</span>
          </div>
          <svg id="actionReviewChevron" class="w-5 h-5 text-slate-400 transition-transform ${_actionReviewOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
        </button>
        <div id="actionReviewBody" class="${_actionReviewOpen ? '' : 'hidden'}">
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="border-b border-slate-200 bg-slate-50">
                  <th class="py-2 px-2 text-[10px] font-black text-slate-500 uppercase">Sector</th>
                  <th class="py-2 px-2 text-[10px] font-black text-slate-500 uppercase">Question</th>
                  <th class="py-2 px-2 text-[10px] font-black text-slate-500 uppercase">Status</th>
                  <th class="py-2 px-2 text-[10px] font-black text-slate-500 uppercase text-center">📷</th>
                </tr>
              </thead>
              <tbody>${actionRows}</tbody>
            </table>
          </div>
          <div class="px-5 py-3 border-t border-slate-100">
            <p class="text-[10px] text-slate-400 font-bold">Tap a row to jump to that question</p>
          </div>
        </div>
      </div>`;
  }

  main.innerHTML = `
    <div class="max-w-lg mx-auto">
      <div class="flex items-center gap-3 mb-4">
        <button onclick="goMeta()" class="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 active:bg-slate-200 transition-colors">
          <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-xl font-black outfit birds-green uppercase">${escapeHtml(auditState.storeName)}</h2>
            ${auditState.isTraining ? '<span class="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Training</span>' : ''}
          </div>
          <div class="text-xs text-slate-400 font-bold">${escapeHtml(auditState.areaManager)}</div>
        </div>
      </div>

      ${renderCrumbs()}

      <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-4">
        <div class="flex items-center gap-4">
          <svg viewBox="0 0 44 44" width="80" height="80" class="flex-shrink-0">
            <circle cx="22" cy="22" r="18" fill="none" stroke="#e2e8f0" stroke-width="4"/>
            <circle cx="22" cy="22" r="18" fill="none" stroke="${overall.pct >= 95 ? '#10b981' : overall.pct >= 90 ? '#22c55e' : overall.pct >= 80 ? '#f59e0b' : '#ef4444'}" stroke-width="4" stroke-linecap="round" transform="rotate(-90 22 22)" stroke-dasharray="${(overall.pct / 100 * 2 * Math.PI * 18).toFixed(1)} ${(2 * Math.PI * 18).toFixed(1)}"/>
            <text x="22" y="22" text-anchor="middle" dominant-baseline="central" class="font-black ${auditScoreRag(overall.pct)}" style="font-size:9px;font-weight:900">${overall.pct}%</text>
          </svg>
          <div>
            <div class="text-sm font-bold text-slate-500">${counts.answered} / ${counts.total} questions</div>
            ${overall.totalCritical > 0 ? '<div class="bg-red-50 border border-red-200 rounded-lg px-3 py-1 text-xs font-bold text-red-700 mt-1">' + overall.totalCritical + ' critical &mdash; -' + overall.totalPenalty + '%</div>' : ''}
          </div>
        </div>
      </div>

      ${actionReviewHTML}

      <h3 class="font-black text-slate-800 text-sm uppercase tracking-widest text-slate-400 mb-3">Sectors</h3>
      <div class="space-y-3 mb-6">${sectorCards}</div>

      <button onclick="completeAudit()" class="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-black py-5 rounded-2xl text-lg shadow-lg transition-colors">
        Complete Audit
      </button>
    </div>`;
}

var _actionReviewOpen = false;
window.toggleActionReview = function() {
  _actionReviewOpen = !_actionReviewOpen;
  var body = document.getElementById('actionReviewBody');
  var chevron = document.getElementById('actionReviewChevron');
  if (body) body.classList.toggle('hidden', !_actionReviewOpen);
  if (chevron) chevron.classList.toggle('rotate-180', _actionReviewOpen);
};

window.jumpToQuestion = function(qid) {
  var found = null;
  auditSectorKeys().forEach(function(sid) {
    auditState.sectors[sid].categories.forEach(function(cat) {
      cat.questions.forEach(function(q) {
        if (q.id === qid) found = { sid: sid, cid: cat.id };
      });
    });
  });
  if (!found) return;
  auditState.view = 'questions';
  auditState.sectorId = found.sid;
  auditState.categoryId = found.cid;
  renderAuditPerform();
  setTimeout(function() {
    var el = document.querySelector('[data-qid="' + qid + '"]');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ap-highlight');
      setTimeout(function() { el.classList.remove('ap-highlight'); }, 2000);
    }
  }, 100);
};

// === CATEGORY VIEW (Vertical with Expand/Collapse) ===
function renderCategoryView() {
  var main = document.getElementById('mainView');
  var sec = auditState.sectors[auditState.sectorId];
  var meta = SECTOR_META[auditState.sectorId] || { color: 'slate' };

  var expandAllBtn = '<div class="flex gap-2 mb-3">' +
    '<button onclick="expandAllCategories()" class="text-xs font-bold text-emerald-600 active:text-emerald-800 px-3 py-1.5 bg-emerald-50 rounded-lg">Expand All</button>' +
    '<button onclick="collapseAllCategories()" class="text-xs font-bold text-slate-500 active:text-slate-700 px-3 py-1.5 bg-slate-100 rounded-lg">Collapse All</button>' +
  '</div>';

  var catCards = sec.categories.map(function(cat) {
    var answered = cat.questions.filter(function(q) { return q.answer; }).length;
    var total = cat.questions.length;
    var pct = total ? Math.round(answered / total * 100) : 0;
    var isOpen = _expandedCategories[cat.id];

    var questionsHTML = '';
    if (isOpen) {
      questionsHTML = cat.questions.map(function(q) {
        var passCls = q.answer === 'Pass' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 active:bg-emerald-50';
        var failCls = q.answer === 'Fail' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600 active:bg-red-50';
        var naCls = q.answer === 'NA' ? 'bg-slate-400 text-white' : 'bg-slate-100 text-slate-600 active:bg-slate-200';
        var actionEnabled = q.action && q.action.enabled;
        var actionCls = actionEnabled ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500 active:bg-amber-50';
        var photos = [q.photoThumb, q.extraPhotoThumb, q.extraPhoto2Thumb].filter(Boolean);

        return '<div class="bg-slate-50 rounded-xl p-3 mb-2 border border-slate-100" data-qid="' + q.id + '">' +
          '<div class="flex items-start gap-2 mb-2">' +
            '<span class="bg-' + meta.color + '-100 text-' + meta.color + '-700 text-[10px] font-black px-2 py-0.5 rounded shrink-0">\u00d7' + q.weight + '</span>' +
            '<p class="text-xs font-bold text-slate-800 leading-snug">' + escapeHtml(q.text) + '</p>' +
          '</div>' +
          '<div class="flex items-center gap-1.5 mb-2 flex-wrap">' +
            '<button onclick="auditAnswer(\'' + auditState.sectorId + '\',\'' + cat.id + '\',\'' + q.id + '\',\'Pass\')" class="px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors ' + passCls + '">\u2713 Pass</button>' +
            '<button onclick="auditAnswer(\'' + auditState.sectorId + '\',\'' + cat.id + '\',\'' + q.id + '\',\'Fail\')" class="px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors ' + failCls + '">\u2717 Fail</button>' +
            '<button onclick="auditAnswer(\'' + auditState.sectorId + '\',\'' + cat.id + '\',\'' + q.id + '\',\'NA\')" class="px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors ' + naCls + '">N/A</button>' +
            '<button onclick="auditToggleAction(\'' + auditState.sectorId + '\',\'' + cat.id + '\',\'' + q.id + '\')" class="px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors ' + actionCls + '">\u26a1 Action</button>' +
          '</div>' +
          '<div class="flex items-center gap-1.5 mb-2 flex-wrap">' +
            '<label class="text-[9px] font-bold text-slate-400 uppercase">Photo</label>' +
            (q.photoThumb ? '<img src="' + q.photoThumb + '" class="w-12 h-12 rounded-lg object-cover border border-slate-200">' : '') +
            (q.extraPhotoThumb ? '<img src="' + q.extraPhotoThumb + '" class="w-12 h-12 rounded-lg object-cover border border-slate-200">' : '') +
            (q.extraPhoto2Thumb ? '<img src="' + q.extraPhoto2Thumb + '" class="w-12 h-12 rounded-lg object-cover border border-slate-200">' : '') +
            (photos.length < 3 ? '<label class="w-12 h-12 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 active:border-emerald-400 active:text-emerald-500 cursor-pointer transition-colors text-lg">' +
              '<input type="file" accept="image/*" capture="environment" class="hidden" onchange="auditPhoto(\'' + auditState.sectorId + '\',\'' + cat.id + '\',\'' + q.id + '\',' + photos.length + ', event)">+</label>' : '') +
          '</div>' +
          (actionEnabled ? auditActionHTML(q, auditState.sectorId, cat.id) : '') +
        '</div>';
      }).join('');
    }

    return '<div class="bg-white rounded-xl border border-slate-200 shadow-sm mb-3 overflow-hidden">' +
      '<button onclick="toggleCategory(\'' + cat.id + '\')" class="w-full flex items-center justify-between px-4 py-3.5 active:bg-slate-50 transition-colors text-left">' +
        '<div class="flex-1 min-w-0">' +
          '<div class="font-black text-slate-800 text-sm">' + escapeHtml(cat.name) + '</div>' +
          '<div class="text-[11px] text-slate-400">' + answered + '/' + total + ' answered</div>' +
        '</div>' +
        '<div class="flex items-center gap-2">' +
          '<div class="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">' +
            '<div class="h-full bg-' + meta.color + '-400 rounded-full" style="width:' + pct + '%"></div>' +
          '</div>' +
          '<svg class="w-4 h-4 text-slate-400 transition-transform ' + (isOpen ? 'rotate-180' : '') + '" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>' +
        '</div>' +
      '</button>' +
      (isOpen ? '<div class="px-3 pb-3">' + questionsHTML + '</div>' : '') +
    '</div>';
  }).join('');

  main.innerHTML = `
    <div class="max-w-lg mx-auto">
      <div class="flex items-center gap-3 mb-2">
        <button onclick="goSectors()" class="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 active:bg-slate-200 transition-colors">
          <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-black outfit text-slate-800 uppercase">${escapeHtml(sec.title)}</h2>
            ${auditState.isTraining ? '<span class="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Training</span>' : ''}
          </div>
        </div>
      </div>
      ${renderCrumbs()}
      ${expandAllBtn}
      <div class="mb-6">${catCards}</div>
      <button onclick="goSectors()" class="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-black py-4 rounded-2xl text-sm shadow-lg transition-colors mb-4">
        Back to Sectors
      </button>
    </div>`;
}

window.toggleCategory = function(catId) {
  _expandedCategories[catId] = !_expandedCategories[catId];
  renderAuditPerform();
};

window.expandAllCategories = function() {
  var sec = auditState.sectors[auditState.sectorId];
  sec.categories.forEach(function(cat) { _expandedCategories[cat.id] = true; });
  renderAuditPerform();
};

window.collapseAllCategories = function() {
  _expandedCategories = {};
  renderAuditPerform();
};

// === QUESTION VIEW (Single category) ===
function renderQuestionView() {
  var main = document.getElementById('mainView');
  var sec = auditState.sectors[auditState.sectorId];
  var cat = sec.categories.find(function(c) { return c.id === auditState.categoryId; });
  var meta = SECTOR_META[auditState.sectorId] || { color: 'slate' };

  var questionsHTML = cat.questions.map(function(q) {
    var passCls = q.answer === 'Pass' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 active:bg-emerald-50';
    var failCls = q.answer === 'Fail' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600 active:bg-red-50';
    var naCls = q.answer === 'NA' ? 'bg-slate-400 text-white' : 'bg-slate-100 text-slate-600 active:bg-slate-200';
    var actionEnabled = q.action && q.action.enabled;
    var actionCls = actionEnabled ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500 active:bg-amber-50';
    var photos = [q.photoThumb, q.extraPhotoThumb, q.extraPhoto2Thumb].filter(Boolean);

    return '<div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-3" data-qid="' + q.id + '">' +
      '<div class="flex items-start gap-3 mb-3">' +
        '<span class="bg-' + meta.color + '-50 text-' + meta.color + '-700 text-[10px] font-black px-2 py-0.5 rounded shrink-0">\u00d7' + q.weight + '</span>' +
        '<p class="text-sm font-bold text-slate-800 leading-snug">' + escapeHtml(q.text) + '</p>' +
      '</div>' +
      '<div class="flex items-center gap-2 mb-3 flex-wrap">' +
        '<button onclick="auditAnswer(\'' + auditState.sectorId + '\',\'' + cat.id + '\',\'' + q.id + '\',\'Pass\')" class="px-5 py-2.5 rounded-full text-xs font-bold transition-colors ' + passCls + '">\u2713 Pass</button>' +
        '<button onclick="auditAnswer(\'' + auditState.sectorId + '\',\'' + cat.id + '\',\'' + q.id + '\',\'Fail\')" class="px-5 py-2.5 rounded-full text-xs font-bold transition-colors ' + failCls + '">\u2717 Fail</button>' +
        '<button onclick="auditAnswer(\'' + auditState.sectorId + '\',\'' + cat.id + '\',\'' + q.id + '\',\'NA\')" class="px-5 py-2.5 rounded-full text-xs font-bold transition-colors ' + naCls + '">N/A</button>' +
        '<button onclick="auditToggleAction(\'' + auditState.sectorId + '\',\'' + cat.id + '\',\'' + q.id + '\')" class="px-5 py-2.5 rounded-full text-xs font-bold transition-colors ' + actionCls + '">\u26a1 Action</button>' +
      '</div>' +
      '<div class="flex items-center gap-2 mb-3 flex-wrap">' +
        '<label class="text-[10px] font-bold text-slate-400 uppercase">Photo</label>' +
        (q.photoThumb ? '<img src="' + q.photoThumb + '" class="w-16 h-16 rounded-lg object-cover border border-slate-200">' : '') +
        (q.extraPhotoThumb ? '<img src="' + q.extraPhotoThumb + '" class="w-16 h-16 rounded-lg object-cover border border-slate-200">' : '') +
        (q.extraPhoto2Thumb ? '<img src="' + q.extraPhoto2Thumb + '" class="w-16 h-16 rounded-lg object-cover border border-slate-200">' : '') +
        (photos.length < 3 ? '<label class="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 active:border-emerald-400 active:text-emerald-500 cursor-pointer transition-colors text-xl">' +
          '<input type="file" accept="image/*" capture="environment" class="hidden" onchange="auditPhoto(\'' + auditState.sectorId + '\',\'' + cat.id + '\',\'' + q.id + '\',' + photos.length + ', event)">+</label>' : '') +
      '</div>' +
      (actionEnabled ? auditActionHTML(q, auditState.sectorId, cat.id) : '') +
    '</div>';
  }).join('');

  main.innerHTML = `
    <div class="max-w-lg mx-auto">
      <div class="flex items-center gap-3 mb-2">
        <button onclick="goCategory_back()" class="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 active:bg-slate-200 transition-colors">
          <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <h2 class="text-sm font-black outfit text-slate-800 uppercase truncate">${escapeHtml(cat.name)}</h2>
      </div>
      ${renderCrumbs()}
      ${questionsHTML}
    </div>`;
}

function auditActionHTML(q, sid, cid) {
  var a = q.action || {};
  var isOpen = (a.status || 'Open') === 'Open';
  return '<div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-2">' +
    '<div class="space-y-3 mb-3">' +
      '<div><label class="text-[10px] font-black text-amber-700 uppercase">Description</label>' +
        '<textarea placeholder="Describe the issue" onchange="auditSetAction(\'' + sid + '\',\'' + cid + '\',\'' + q.id + '\',\'description\',this.value)" class="w-full text-xs border border-amber-200 rounded-lg px-3 py-2.5 mt-1" rows="2">' + escapeHtml(a.description || '') + '</textarea></div>' +
      '<div><label class="text-[10px] font-black text-amber-700 uppercase">Person Responsible</label>' +
        '<select onchange="auditSetAction(\'' + sid + '\',\'' + cid + '\',\'' + q.id + '\',\'person\',this.value)" class="w-full text-xs border border-amber-200 rounded-lg px-3 py-2.5 mt-1">' +
          '<option value="" ' + (!a.person ? 'selected' : '') + '>Select...</option>' +
          '<option value="All team members" ' + (a.person === 'All team members' ? 'selected' : '') + '>All team members</option>' +
          '<option value="Store Manager" ' + (a.person === 'Store Manager' ? 'selected' : '') + '>Store Manager</option>' +
          '<option value="Area Manager" ' + (a.person === 'Area Manager' ? 'selected' : '') + '>Area Manager</option>' +
          '<option value="Maintenance" ' + (a.person === 'Maintenance' ? 'selected' : '') + '>Maintenance</option>' +
          '<option value="Health and Safety" ' + (a.person === 'Health and Safety' ? 'selected' : '') + '>Health and Safety</option>' +
          '<option value="Auditor" ' + (a.person === 'Auditor' ? 'selected' : '') + '>Auditor</option>' +
        '</select></div>' +
      '<div><label class="text-[10px] font-black text-amber-700 uppercase">Action Needed</label>' +
        '<textarea placeholder="Describe the action" onchange="auditSetAction(\'' + sid + '\',\'' + cid + '\',\'' + q.id + '\',\'actionNeeded\',this.value)" class="w-full text-xs border border-amber-200 rounded-lg px-3 py-2.5 mt-1" rows="2">' + escapeHtml(a.actionNeeded || '') + '</textarea></div>' +
      '<div><label class="text-[10px] font-black text-amber-700 uppercase">Status</label>' +
        '<select onchange="auditSetAction(\'' + sid + '\',\'' + cid + '\',\'' + q.id + '\',\'status\',this.value)" class="w-full text-xs border border-amber-200 rounded-lg px-3 py-2.5 mt-1">' +
          '<option value="Open" ' + (isOpen ? 'selected' : '') + '>Open</option>' +
          '<option value="Closed" ' + (!isOpen ? 'selected' : '') + '>Closed</option>' +
        '</select></div>' +
    '</div>' +
    '<label class="flex items-center gap-3 cursor-pointer bg-red-50 border border-red-200 rounded-xl px-4 py-3 active:bg-red-100 transition-colors">' +
      '<input type="checkbox" ' + (a.critical ? 'checked' : '') + ' onchange="auditSetAction(\'' + sid + '\',\'' + cid + '\',\'' + q.id + '\',\'critical\',this.checked)" class="w-5 h-5 rounded border-red-300 text-red-500">' +
      '<span class="text-sm font-black text-red-600 uppercase tracking-wide">' + (a.critical ? '\u2713 ' : '') + 'Mark as Critical</span>' +
    '</label></div>';
}

// === COMPLETE VIEW ===
function renderCompleteView() {
  var main = document.getElementById('mainView');
  var overall = auditOverallMetrics();
  var trainingBadge = auditState.isTraining ? '<div class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm font-bold text-amber-700 inline-block mb-4">Training Mode &mdash; exported as TRAINING</div>' : '';
  main.innerHTML = `
    <div class="max-w-lg mx-auto text-center py-8">
      <div class="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
      </div>
      <h2 class="text-3xl font-black outfit text-slate-800 mb-2">Audit Complete</h2>
      <p class="text-slate-500 mb-2 text-sm">${escapeHtml(auditState.storeName)} &mdash; ${escapeHtml(auditState.date)}</p>
      ${trainingBadge}
      <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
        <div class="text-6xl font-black ${auditScoreRag(overall.pct)} mb-2">${overall.pct}%</div>
        <div class="text-sm text-slate-500 mb-4">${overall.totalAnswered} questions answered</div>
        ${overall.totalCritical > 0 ? '<div class="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm font-bold text-red-700 inline-block mb-4">' + overall.totalCritical + ' critical &mdash; -' + overall.totalPenalty + '%</div>' : ''}
      </div>
      <div class="space-y-3">
        <button onclick="exportAndDownload()" class="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-black py-5 rounded-2xl text-lg shadow-lg transition-colors">
          Download ZIP Package
        </button>
        <button onclick="exportAndDownloadPDF()" class="w-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold py-4 rounded-2xl transition-colors">
          Download PDF Only
        </button>
        <button onclick="goHome()" class="w-full text-slate-400 font-bold py-3 text-sm">
          Back to Home
        </button>
      </div>
    </div>`;
}

// === NAVIGATION ===
window.goHome = function() { auditState = null; _expandedCategories = {}; renderHome(); };
window.goMeta = function() { auditState.view = 'meta'; renderAuditPerform(); };
window.goSectors = function() { auditState.view = 'sectors'; _expandedCategories = {}; renderAuditPerform(); };
window.goSector = function(sid) { auditState.view = 'categories'; auditState.sectorId = sid; _expandedCategories = {}; renderAuditPerform(); };
window.goCategory = function(cid) { auditState.view = 'questions'; auditState.categoryId = cid; renderAuditPerform(); };
window.goCategory_back = function() { auditState.view = 'categories'; renderAuditPerform(); };

window.renderAuditPerform = function() {
  if (!auditState) return renderMetaView();
  if (auditState.view === 'meta') return renderMetaView();
  if (auditState.view === 'sectors') return renderSectorView();
  if (auditState.view === 'categories') return renderCategoryView();
  if (auditState.view === 'questions') return renderQuestionView();
  if (auditState.view === 'complete') return renderCompleteView();
};

window.auditAnswer = function(sid, cid, qid, answer) {
  var q = findAuditQ(sid, cid, qid);
  if (q) q.answer = q.answer === answer ? null : answer;
  renderAuditPerform();
};

window.auditPhoto = async function(sid, cid, qid, slot, e) {
  var file = e.target.files[0];
  if (!file) return;
  var data = await new Promise(function(resolve) {
    var reader = new FileReader();
    reader.onload = function() { resolve(reader.result); };
    reader.readAsDataURL(file);
  });
  var thumb = await auditMakeThumb(data, 1200, 'image/jpeg', 0.7);
  var q = findAuditQ(sid, cid, qid);
  if (!q) return;
  if (slot === 0) { q.photo = data; q.photoThumb = thumb; }
  else if (slot === 1) { q.extraPhoto = data; q.extraPhotoThumb = thumb; }
  else if (slot === 2) { q.extraPhoto2 = data; q.extraPhoto2Thumb = thumb; }
  renderAuditPerform();
  e.target.value = '';
};

window.auditToggleAction = function(sid, cid, qid) {
  var q = findAuditQ(sid, cid, qid);
  if (!q) return;
  if (q.action && q.action.enabled) { q.action = null; }
  else { q.action = { enabled: true, description: '', person: '', actionNeeded: '', critical: false, status: 'Open', closedOn: '', createdAt: new Date().toISOString() }; }
  renderAuditPerform();
};

window.auditSetAction = function(sid, cid, qid, field, val) {
  var q = findAuditQ(sid, cid, qid);
  if (!q || !q.action) return;
  q.action[field] = val;
  if (field === 'status' && val === 'Closed' && !q.action.closedOn) {
    q.action.closedOn = new Date().toISOString().slice(0, 10);
    renderAuditPerform();
  }
};

window.completeAudit = function() {
  auditState.view = 'complete';
  renderAuditPerform();
};

window.startNewAudit = function() {
  auditState = { view: 'meta', branchId: null, storeName: '', areaManager: '', email: '', manager: '', auditor: 'Blake Lowis', date: new Date().toISOString().slice(0, 10), summary: '', sectorId: null, categoryId: null, sectors: {}, isTraining: false };
  _expandedCategories = {};
  renderAuditPerform();
};
