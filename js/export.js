// === EXPORT — ZIP Package + PDF ===

async function exportAndDownload() {
  if (!auditState) return;
  var overall = auditOverallMetrics();
  var metrics = overall;
  var d = new Date(auditState.date);
  var year = d.getFullYear();
  var week = getISOWeek(d);

  var sectorScores = {};
  metrics.sectorData.forEach(function(s) { sectorScores[s.id] = s.metrics.penalisedPct; });

  var actionItems = auditGetActions();

  var sessionData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    appVersion: 'Birds Audit Mobile v1',
    metadata: {
      storeName: auditState.storeName,
      storeEmail: auditState.email || '',
      auditor: auditState.auditor,
      manager: auditState.manager,
      areaManager: auditState.areaManager,
      date: auditState.date,
      year: year,
      week: week,
      summary: auditState.summary || '',
      isTraining: auditState.isTraining || false
    },
    scores: {
      overall: metrics.pct,
      totalAccrued: metrics.totalAccrued,
      totalMax: metrics.totalMax,
      totalCritical: metrics.totalCritical,
      totalPenalty: metrics.totalPenalty,
      sectors: sectorScores
    },
    questions: [],
    actions: actionItems.map(function(a) {
      return {
        questionId: a.questionId || '',
        sector: a.sector || '',
        category: a.category || '',
        question: a.question || '',
        answer: a.answer || '',
        description: (a.action && a.action.description) || '',
        personResponsible: (a.action && a.action.person) || '',
        actionNeeded: (a.action && a.action.actionNeeded) || '',
        status: (a.action && a.action.status) || 'Open',
        critical: (a.action && a.action.critical) ? 'Yes' : 'No'
      };
    })
  };

  auditSectorKeys().forEach(function(sid) {
    var sec = auditState.sectors[sid];
    sec.categories.forEach(function(cat) {
      cat.questions.forEach(function(q) {
        sessionData.questions.push({
          sectorId: sid,
          sector: sec.title,
          categoryId: cat.id,
          category: cat.name,
          questionId: q.id,
          question: q.text,
          weight: q.weight,
          answer: q.answer || '',
          comment: q.comment || ''
        });
      });
    });
  });

  var zip = new JSZip();
  var safeStore = auditState.storeName.replace(/[^a-zA-Z0-9]/g, '_');
  var folderName = safeStore + '_' + auditState.date;

  zip.file('audit_session.json', JSON.stringify(sessionData, null, 2));
  zip.file('actions.json', JSON.stringify(sessionData.actions, null, 2));

  var photoFolder = zip.folder('photos');
  var photoCount = 0;
  auditSectorKeys().forEach(function(sid) {
    var sec = auditState.sectors[sid];
    sec.categories.forEach(function(cat) {
      cat.questions.forEach(function(q) {
        var allPhotos = [
          { data: q.photo, thumb: q.photoThumb, suffix: '' },
          { data: q.extraPhoto, thumb: q.extraPhotoThumb, suffix: '_extra' },
          { data: q.extraPhoto2, thumb: q.extraPhoto2Thumb, suffix: '_extra2' }
        ];
        allPhotos.forEach(function(ph) {
          if (ph.data) {
            var base64 = ph.data.split(',')[1] || '';
            var ext = ph.data.indexOf('image/png') > -1 ? 'png' : 'jpg';
            var fileName = sid + '_' + cat.id + '_' + q.id + ph.suffix + '.' + ext;
            photoFolder.file(fileName, base64, { base64: true });
            photoCount++;
          }
        });
      });
    });
  });

  try {
    var pdfBlob = await generateAuditPDFBlob();
    if (pdfBlob) {
      var pdfBase64 = await new Promise(function(resolve) {
        var reader = new FileReader();
        reader.onload = function() { resolve(reader.result.split(',')[1]); };
        reader.readAsDataURL(pdfBlob);
      });
      zip.file('audit_report.pdf', pdfBase64, { base64: true });
    }
  } catch (e) {
    console.warn('[Export] PDF generation failed:', e.message);
  }

  var blob = await zip.generateAsync({ type: 'blob' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = (auditState.isTraining ? 'BirdsAudit_TRAINING_' : 'BirdsAudit_') + folderName + '.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  await saveToHistory(sessionData);
  alert('ZIP downloaded: ' + a.download + '\n' + sessionData.questions.length + ' questions, ' + photoCount + ' photos, ' + sessionData.actions.length + ' actions');
}

async function exportAndDownloadPDF() {
  if (!auditState) return;
  var blob = await generateAuditPDFBlob();
  if (!blob) { alert('PDF generation failed'); return; }
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'audit_' + auditState.storeName.replace(/[^a-zA-Z0-9]/g, '_') + '_' + auditState.date + '.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  var overall = auditOverallMetrics();
  var d = new Date(auditState.date);
  await saveToHistory({
    metadata: { storeName: auditState.storeName, auditor: auditState.auditor, date: auditState.date },
    scores: { overall: overall.pct }
  });
  alert('PDF downloaded');
}

async function generateAuditPDFBlob() {
  if (typeof window.jspdf === 'undefined') return null;
  var { jsPDF } = window.jspdf;
  var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  var W = 210, H = 297, M = 15, CW = W - 2 * M;
  var y = M;

  function checkPage(needed) { if (y + needed > H - M) { doc.addPage(); y = M; } }

  doc.setFillColor(0, 168, 142);
  doc.rect(0, 0, W, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('Retail Audit Report', M, 14);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  var storeLabel = auditState.storeName + (auditState.isTraining ? ' [TRAINING]' : '');
  doc.text(storeLabel + ' \u2014 ' + auditState.date, M, 22);
  y = 40;

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  var labels = ['Store', 'Area Manager', 'Manager', 'Auditor'];
  var values = [storeLabel, auditState.areaManager, auditState.manager, auditState.auditor];
  for (var i = 0; i < 4; i++) {
    var col = i % 2, row = Math.floor(i / 2);
    var ix = M + col * (CW / 2), iy = y + row * 12;
    doc.setFont(undefined, 'bold'); doc.text(labels[i] + ':', ix, iy);
    doc.setFont(undefined, 'normal'); doc.text(values[i] || '\u2014', ix + 25, iy);
  }
  y += 30;

  if (auditState.summary) {
    checkPage(15);
    doc.setFont(undefined, 'italic'); doc.setFontSize(9);
    doc.text('Summary: ' + auditState.summary, M, y); y += 10;
  }

  var overall = auditOverallMetrics();
  checkPage(35);
  doc.setFillColor(240, 253, 250);
  doc.roundedRect(M, y, CW, 25, 3, 3, 'F');
  doc.setFontSize(28); doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 168, 142);
  doc.text(overall.pct + '%', M + 5, y + 17);
  doc.setFontSize(9); doc.setTextColor(100, 100, 100);
  doc.text('Overall Score (' + overall.totalMax + ' max points)', M + 50, y + 10);
  if (overall.totalCritical > 0) {
    doc.setTextColor(200, 50, 50);
    doc.text(overall.totalCritical + ' critical items \u2014 penalty: -' + overall.totalPenalty + '%', M + 50, y + 18);
  }
  y += 32;

  checkPage(20);
  var secW = CW / 6 - 2;
  overall.sectorData.forEach(function(s, idx) {
    var sx = M + idx * (secW + 2);
    var rag = s.metrics.failed ? [255, 200, 200] : s.metrics.penalisedPct >= 95 ? [209, 250, 229] : s.metrics.penalisedPct >= 90 ? [220, 252, 231] : s.metrics.penalisedPct >= 80 ? [254, 243, 199] : [254, 226, 226];
    doc.setFillColor(rag[0], rag[1], rag[2]);
    doc.roundedRect(sx, y, secW, 18, 2, 2, 'F');
    doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.setTextColor(60, 60, 60);
    doc.text(s.metrics.penalisedPct + '%', sx + secW / 2, y + 8, { align: 'center' });
    doc.setFontSize(6); doc.setFont(undefined, 'normal');
    doc.text(s.title, sx + secW / 2, y + 14, { align: 'center' });
  });
  y += 25;

  var actions = auditGetActions();
  if (actions.length > 0) {
    checkPage(15);
    doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.setTextColor(40, 40, 40);
    doc.text('Action Items (' + actions.length + ')', M, y); y += 6;
    for (var ai = 0; ai < actions.length; ai++) {
      var item = actions[ai];
      checkPage(20);
      doc.setFillColor(255, 251, 235);
      doc.roundedRect(M, y, CW, 18, 2, 2, 'F');
      doc.setFontSize(8); doc.setFont(undefined, 'bold'); doc.setTextColor(60, 60, 60);
      var critTag = item.action.critical ? ' [CRITICAL]' : '';
      doc.text(item.sector + ' > ' + item.category + critTag, M + 3, y + 5);
      doc.setFont(undefined, 'normal'); doc.setFontSize(7);
      doc.text(item.action.description || item.question, M + 3, y + 11);
      doc.text('Responsible: ' + (item.action.person || '\u2014') + '  |  Status: ' + (item.action.status || 'Open'), M + 3, y + 15);
      y += 20;
    }
  }

  checkPage(15);
  doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.setTextColor(40, 40, 40);
  doc.text('All Questions', M, y); y += 4;

  var tableRows = [];
  auditSectorKeys().forEach(function(sid) {
    var sec = auditState.sectors[sid];
    sec.categories.forEach(function(cat) {
      cat.questions.forEach(function(q) {
        if (q.answer) {
          var icon = q.answer === 'Pass' ? '\u2713' : q.answer === 'Fail' ? '\u2717' : '\u2014';
          tableRows.push([sec.title, cat.name, q.text.substring(0, 60), icon, q.weight + '']);
        }
      });
    });
  });

  if (tableRows.length > 0) {
    doc.autoTable({
      startY: y,
      head: [['Sector', 'Category', 'Question', 'Answer', 'Wt']],
      body: tableRows,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [0, 168, 142], fontSize: 7, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: M, right: M },
      columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 30 }, 2: { cellWidth: 75 }, 3: { cellWidth: 12, halign: 'center' }, 4: { cellWidth: 10, halign: 'center' } }
    });
  }

  var pageCount = doc.internal.getNumberOfPages();
  for (var p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7); doc.setTextColor(150, 150, 150);
    doc.text('Birds Bakery \u2014 Retail Audit Report \u2014 Generated ' + new Date().toLocaleString('en-GB'), M, H - 8);
    doc.text('Page ' + p + ' of ' + pageCount, W - M, H - 8, { align: 'right' });
  }

  return doc.output('blob');
}

async function saveToHistory(sessionData) {
  if (auditState && auditState.isTraining) return;
  var m = sessionData.metadata || auditState;
  var s = sessionData.scores || auditOverallMetrics();
  await idbAdd('history', {
    store: m.storeName || auditState.storeName,
    auditor: m.auditor || auditState.auditor,
    date: m.date || auditState.date,
    score: typeof s.overall === 'number' ? s.overall : (s.pct || null),
    areaManager: m.areaManager || auditState.areaManager,
    exportedAt: new Date().toISOString()
  });
}
