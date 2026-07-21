var auditState = null;
var _auditQB = null;

var SECTOR_META = {
  food:         { color: 'emerald', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  fire:         { color: 'red',    icon: 'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z' },
  hs:           { color: 'amber',  icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  health:       { color: 'amber',  icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  journey:      { color: 'blue',   icon: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  customer:     { color: 'blue',   icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  coffee:       { color: 'orange', icon: 'M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z' },
  focus:        { color: 'purple', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976-2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  birds_focus:  { color: 'purple', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976-2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  test:         { color: 'slate',  icon: 'M13 10V3L4 14h7v7l9-11h-7z' }
};

function escapeHtml(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function(m) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[m]; }); }

function getISOWeek(date) {
  var d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  var week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function auditMakeThumb(dataURL, size, mime, quality) {
  size = size || 1200; mime = mime || 'image/jpeg'; quality = quality != null ? quality : 0.7;
  return new Promise(function(resolve) {
    var img = new Image();
    img.onload = function() {
      var w = img.width, h = img.height;
      var sw = size, sh = Math.round(size * (h / w));
      if (h > w) { sh = size; sw = Math.round(size * (w / h)); }
      var c = document.createElement('canvas');
      c.width = size; c.height = size;
      var ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, (size - sw) / 2, (size - sh) / 2, sw, sh);
      resolve(c.toDataURL(mime, quality));
    };
    img.onerror = function() { resolve(null); };
    img.src = dataURL;
  });
}

function auditInit(branchId, storeName, am) {
  auditState = {
    branchId: branchId,
    storeName: storeName,
    areaManager: am,
    email: auditEmailForStore(storeName),
    manager: '',
    auditor: 'Blake Lowis',
    date: new Date().toISOString().slice(0, 10),
    summary: '',
    view: 'meta',
    sectorId: null,
    categoryId: null,
    sectors: {},
    isTraining: false
  };
}

function auditInitSectors() {
  if (!_auditQB) return;
  var sectors = {};
  Object.keys(_auditQB).forEach(function(key) {
    var sec = _auditQB[key];
    var cats = [];
    (sec.categories || []).forEach(function(cat) {
      var qs = [];
      (cat.questions || []).forEach(function(q) {
        qs.push({
          id: q.id, text: q.text, weight: q.weight || 1,
          answer: null, photo: null, photoThumb: null,
          extraPhoto: null, extraPhotoThumb: null,
          extraPhoto2: null, extraPhoto2Thumb: null,
          comment: '', action: null
        });
      });
      cats.push({ id: cat.id, name: cat.name, questions: qs });
    });
    sectors[key] = { title: sec.title, categories: cats };
  });
  auditState.sectors = sectors;
}

function auditSectorKeys() { return auditState ? Object.keys(auditState.sectors) : []; }

function auditSectorMetrics(sid) {
  var sec = auditState.sectors[sid];
  if (!sec) return null;
  var accrued = 0, max = 0, answered = 0, passes = 0, fails = 0, open = 0, criticalCount = 0;
  sec.categories.forEach(function(cat) {
    cat.questions.forEach(function(q) {
      if (q.answer === 'Pass' || q.answer === 'Fail') {
        max += q.weight; answered++;
        if (q.answer === 'Pass') { accrued += q.weight; passes++; } else { fails++; }
      } else if (q.answer === 'NA') { answered++; }
      if (q.action && q.action.enabled) { open++; if (q.action.critical) criticalCount++; }
    });
  });
  var basePct = max ? Math.round((accrued / max) * 100) : 0;
  var penalty = 0, failed = false;
  if (criticalCount >= 3) { failed = true; penalty = basePct; }
  else if (criticalCount === 2) penalty = 20;
  else if (criticalCount === 1) penalty = 10;
  var penalisedPct = failed ? 0 : Math.max(0, basePct - penalty);
  return { accrued: accrued, max: max, answered: answered, passes: passes, fails: fails, open: open, criticalCount: criticalCount, penalty: penalty, basePct: basePct, penalisedPct: penalisedPct, failed: failed };
}

function auditOverallMetrics() {
  var totalAccrued = 0, totalMax = 0, totalAnswered = 0, totalOpen = 0, totalCritical = 0, totalPenalty = 0;
  var sectorData = [];
  auditSectorKeys().forEach(function(sid) {
    var m = auditSectorMetrics(sid);
    sectorData.push({ id: sid, title: auditState.sectors[sid].title, metrics: m });
    totalOpen += m.open; totalCritical += m.criticalCount; totalPenalty += m.penalty;
    if (!m.answered) return;
    totalAnswered += m.answered;
    if (m.failed) return;
    totalAccrued += (m.penalisedPct / 100) * m.max;
    totalMax += m.max;
  });
  var pct = totalMax ? Math.round((totalAccrued / totalMax) * 100) : 0;
  return { totalAccrued: totalAccrued, totalMax: totalMax, totalAnswered: totalAnswered, totalOpen: totalOpen, totalCritical: totalCritical, totalPenalty: totalPenalty, pct: pct, sectorData: sectorData };
}

function auditGetActions() {
  var items = [];
  auditSectorKeys().forEach(function(sid) {
    var sec = auditState.sectors[sid];
    sec.categories.forEach(function(cat) {
      cat.questions.forEach(function(q) {
        if (q.action && q.action.enabled) {
          items.push({ sector: sec.title, category: cat.name, questionId: q.id, question: q.text, answer: q.answer, weight: q.weight, action: q.action, photos: [q.photo, q.extraPhoto, q.extraPhoto2] });
        }
      });
    });
  });
  items.sort(function(a, b) { return (b.action.critical ? 1 : 0) - (a.action.critical ? 1 : 0); });
  return items;
}

function auditTotalAnswered() {
  var total = 0, answered = 0;
  auditSectorKeys().forEach(function(sid) {
    auditState.sectors[sid].categories.forEach(function(cat) {
      cat.questions.forEach(function(q) { total++; if (q.answer) answered++; });
    });
  });
  return { total: total, answered: answered };
}

function auditScoreRag(pct) {
  if (pct >= 95) return 'birds-green';
  if (pct >= 90) return 'text-green-600';
  if (pct >= 80) return 'text-amber-600';
  return 'text-red-600';
}

function auditCategoryMetrics(sid, catId) {
  var sec = auditState.sectors[sid];
  if (!sec) return { accrued: 0, max: 0, pct: 0 };
  var cat = sec.categories.find(function(c) { return c.id === catId; });
  if (!cat) return { accrued: 0, max: 0, pct: 0 };
  var accrued = 0, max = 0;
  cat.questions.forEach(function(q) {
    if (q.answer === 'Pass' || q.answer === 'Fail') { max += q.weight; if (q.answer === 'Pass') accrued += q.weight; }
  });
  return { accrued: accrued, max: max, pct: max ? Math.round((accrued / max) * 100) : 0 };
}

function auditSetComment(sid, cid, qid, val) {
  var q = findAuditQ(sid, cid, qid);
  if (q) q.comment = val;
}

function auditCollectComments() {
  var items = [];
  auditSectorKeys().forEach(function(sid) {
    var sec = auditState.sectors[sid];
    sec.categories.forEach(function(cat) {
      cat.questions.forEach(function(q) {
        if (!q.comment || !q.comment.trim()) return;
        if (q.action && q.action.enabled) return;
        items.push({ sector: sec.title, category: cat.name, question: q.text, answer: q.answer, comment: q.comment, photoThumb: q.photo, extraPhotoThumb: q.extraPhoto, extraPhoto2Thumb: q.extraPhoto2 });
      });
    });
  });
  return items;
}

function auditCollectAllComments() {
  var withPhotos = [];
  var withoutPhotos = [];
  auditSectorKeys().forEach(function(sid) {
    var sec = auditState.sectors[sid];
    sec.categories.forEach(function(cat) {
      cat.questions.forEach(function(q) {
        if (!q.comment && !q.photo && !q.extraPhoto && !q.extraPhoto2) return;
        if (q.answer !== 'Pass' && q.answer !== 'Fail') return;
        if (q.action && q.action.enabled) return;
        var item = {
          sector: sec.title, category: cat.name,
          question: q.text, answer: q.answer,
          comment: q.comment || '',
          photoThumb: q.photo, extraPhotoThumb: q.extraPhoto, extraPhoto2Thumb: q.extraPhoto2
        };
        var hasPhotos = item.photoThumb || item.extraPhotoThumb || item.extraPhoto2Thumb;
        if (hasPhotos) withPhotos.push(item);
        else withoutPhotos.push(item);
      });
    });
  });
  return { withPhotos: withPhotos, withoutPhotos: withoutPhotos };
}

function findAuditQ(sid, cid, qid) {
  if (!auditState || !auditState.sectors[sid]) return null;
  var cat = auditState.sectors[sid].categories.find(function(c) { return c.id === cid; });
  if (!cat) return null;
  return cat.questions.find(function(q) { return q.id === qid; });
}
