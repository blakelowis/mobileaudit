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

  var isTraining = auditState.isTraining || false;

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
      isTraining: isTraining
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
        if (q.answer !== 'Pass' && q.answer !== 'Fail') return;
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

  zip.file('meta.json', JSON.stringify({
    version: '1.0',
    isTraining: isTraining,
    storeName: auditState.storeName,
    storeEmail: auditState.email || '',
    auditor: auditState.auditor,
    manager: auditState.manager,
    areaManager: auditState.areaManager,
    date: auditState.date,
    year: year,
    week: week,
    summary: auditState.summary || '',
    score: metrics.pct
  }, null, 2));

  zip.file('audit_session.json', JSON.stringify(sessionData, null, 2));
  zip.file('actions.json', JSON.stringify(sessionData.actions, null, 2));

  var photoFolder = zip.folder('photos');
  var photoCount = 0;
  auditSectorKeys().forEach(function(sid) {
    var sec = auditState.sectors[sid];
    sec.categories.forEach(function(cat) {
      cat.questions.forEach(function(q) {
        if (q.answer !== 'Pass' && q.answer !== 'Fail') return;
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
  var isTraining = auditState.isTraining || false;

  function checkPage(needed) { if (y + needed > H - M) { doc.addPage(); y = M; } }

  // === PAGE 1: Cover & Scorecard ===
  // Green header band
  doc.setFillColor(0, 168, 142);
  doc.rect(0, 0, W, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('Retail Audit Report', M, 14);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  var storeLabel = auditState.storeName + (isTraining ? ' [TRAINING]' : '');
  doc.text(storeLabel + ' \u2014 ' + auditState.date, M, 22);
  y = 40;

  // Metadata grid
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  var metaLabels = ['Store', 'Area Manager', 'Manager', 'Auditor'];
  var metaValues = [storeLabel, auditState.areaManager, auditState.manager, auditState.auditor];
  for (var i = 0; i < 4; i++) {
    var col = i % 2, row = Math.floor(i / 2);
    var ix = M + col * (CW / 2), iy = y + row * 12;
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(ix - 1, iy - 6, CW / 2 - 4, 10, 1, 1, 'S');
    doc.setFont(undefined, 'bold'); doc.setFontSize(7);
    doc.setTextColor(130, 130, 130);
    doc.text(metaLabels[i], ix + 2, iy - 2);
    doc.setFontSize(9); doc.setTextColor(40, 40, 40);
    doc.text(metaValues[i] || '\u2014', ix + 2, iy + 3);
  }
  y += 30;

  // Audit summary
  if (auditState.summary) {
    checkPage(15);
    doc.setFillColor(240, 253, 250);
    doc.roundedRect(M, y, CW, 14, 2, 2, 'F');
    doc.setFontSize(8); doc.setFont(undefined, 'bold'); doc.setTextColor(0, 140, 120);
    doc.text('Audit Summary', M + 4, y + 5);
    doc.setFontSize(8); doc.setFont(undefined, 'normal'); doc.setTextColor(60, 60, 60);
    var lines = doc.splitTextToSize(auditState.summary, CW - 10);
    doc.text(lines, M + 4, y + 11);
    y += 14 + lines.length * 4;
  }

  // Scorecard
  var overall = auditOverallMetrics();
  checkPage(35);
  doc.setFillColor(240, 253, 250);
  doc.roundedRect(M, y, CW, 28, 3, 3, 'F');
  doc.setFontSize(32); doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 168, 142);
  doc.text(overall.pct + '%', M + 8, y + 20);
  doc.setFontSize(10); doc.setTextColor(100, 100, 100);
  doc.text('Overall Score', M + 55, y + 12);
  doc.setFontSize(8);
  doc.text(overall.totalMax + ' max points', M + 55, y + 17);
  if (overall.totalCritical > 0) {
    doc.setTextColor(200, 50, 50);
    doc.setFont(undefined, 'bold');
    doc.text(overall.totalCritical + ' critical items \u2014 penalty: -' + overall.totalPenalty + '%', M + 55, y + 23);
  }
  y += 35;

  // Score band label
  var bandLabel = overall.pct >= 95 ? 'Excellent' : overall.pct >= 90 ? 'Good Work' : overall.pct >= 80 ? 'Pass' : 'Action Needed';
  doc.setFontSize(10); doc.setFont(undefined, 'bold');
  var bandColor = overall.pct >= 95 ? [16, 185, 129] : overall.pct >= 90 ? [34, 197, 94] : overall.pct >= 80 ? [245, 158, 11] : [239, 68, 68];
  doc.setTextColor(bandColor[0], bandColor[1], bandColor[2]);
  doc.text('Score Band: ' + bandLabel, M, y);
  y += 10;

  // Sector score cards — only sectors with answered questions
  checkPage(30);
  doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.setTextColor(40, 40, 40);
  doc.text('Sector Scores', M, y); y += 6;
  var answeredSectors = overall.sectorData.filter(function(s) { return s.metrics.answered > 0; });
  if (answeredSectors.length > 0) {
    var secW = Math.min((CW - 4 * 2) / answeredSectors.length, 35);
    answeredSectors.forEach(function(s, idx) {
      var sx = M + idx * (secW + 2);
      var rag = s.metrics.failed ? [255, 200, 200] : s.metrics.penalisedPct >= 95 ? [209, 250, 229] : s.metrics.penalisedPct >= 90 ? [220, 252, 231] : s.metrics.penalisedPct >= 80 ? [254, 243, 199] : [254, 226, 226];
      doc.setFillColor(rag[0], rag[1], rag[2]);
      doc.roundedRect(sx, y, secW, 18, 2, 2, 'F');
      doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.setTextColor(60, 60, 60);
      doc.text(s.metrics.penalisedPct + '%', sx + secW / 2, y + 8, { align: 'center' });
      doc.setFontSize(6); doc.setFont(undefined, 'normal');
      doc.text(s.title, sx + secW / 2, y + 14, { align: 'center' });
      if (s.metrics.failed) {
        doc.setFontSize(5); doc.setFont(undefined, 'bold'); doc.setTextColor(200, 50, 50);
        doc.text('FAILED', sx + secW / 2, y + 17, { align: 'center' });
      }
    });
  }
  y += 25;

  // === PAGE 2: Action Plan ===
  doc.addPage(); y = M;
  doc.setFillColor(0, 168, 142);
  doc.rect(0, 0, W, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14); doc.setFont(undefined, 'bold');
  doc.text('Action Plan', M, 12);
  y = 26;

  var actions = auditGetActions();
  if (actions.length > 0) {
    for (var ai = 0; ai < actions.length; ai++) {
      var item = actions[ai];
      var actionPhotos = (item.photos || []).filter(Boolean);
      var photoRows = actionPhotos.length;

      // Height: header + text + photo space
      var cardH = 30 + (photoRows > 0 ? 60 : 0);
      checkPage(cardH);
      doc.setFillColor(255, 251, 235);
      doc.roundedRect(M, y, CW, cardH, 2, 2, 'F');
      if (item.action.critical) {
        doc.setFillColor(254, 226, 226);
        doc.roundedRect(M, y, 4, cardH, 1, 1, 'F');
      }
      doc.setFontSize(7); doc.setFont(undefined, 'bold'); doc.setTextColor(40, 40, 40);
      doc.text(item.sector + ' \u2014 ' + item.category, M + 7, y + 5);
      if (item.action.critical) {
        doc.setTextColor(200, 50, 50);
        doc.text(' [CRITICAL]', M + 7 + doc.getTextWidth(item.sector + ' \u2014 ' + item.category), y + 5);
      }
      doc.setFontSize(7); doc.setFont(undefined, 'normal'); doc.setTextColor(60, 60, 60);
      var descLines = doc.splitTextToSize(item.action.description || item.question, CW - 14);
      doc.text(descLines, M + 7, y + 11);
      doc.setFontSize(7); doc.setTextColor(100, 100, 100);
      doc.text('Responsible: ' + (item.action.person || '\u2014') + '  |  Status: ' + (item.action.status || 'Open'), M + 7, y + 22);

      if (photoRows > 0) {
        var px = M + 7;
        var py = y + 26;
        actionPhotos.forEach(function(ph) {
          var ext = ph.indexOf('png') > -1 ? 'PNG' : 'JPEG';
          var pw = 55, phH = 55;
          doc.addImage(ph, ext, px, py, pw, phH);
          px += pw + 4;
        });
      }
      y += cardH + 4;
    }
  } else {
    doc.setFontSize(9); doc.setFont(undefined, 'normal'); doc.setTextColor(130, 130, 130);
    doc.text('No action items recorded.', M, y);
    y += 10;
  }

  // === PAGE 3: Comments & Notes (only Pass/Fail questions) ===
  var comments = [];
  auditSectorKeys().forEach(function(sid) {
    var sec = auditState.sectors[sid];
    sec.categories.forEach(function(cat) {
      cat.questions.forEach(function(q) {
        if ((q.answer === 'Pass' || q.answer === 'Fail') && (q.comment || q.photo || q.extraPhoto || q.extraPhoto2)) {
          comments.push({ sector: sec.title, category: cat.name, question: q.text, comment: q.comment, photos: [q.photo, q.extraPhoto, q.extraPhoto2].filter(Boolean) });
        }
      });
    });
  });
  if (comments.length > 0) {
    doc.addPage(); y = M;
    doc.setFillColor(0, 168, 142);
    doc.rect(0, 0, W, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14); doc.setFont(undefined, 'bold');
    doc.text('Comments & Notes', M, 12);
    y = 26;

    comments.forEach(function(c) {
      var commentPhotos = (c.photos || []).filter(Boolean);
      var commentPhotoRows = commentPhotos.length;
      var comH = 26 + (c.comment ? 10 : 0) + (commentPhotoRows > 0 ? 60 : 0);

      checkPage(comH);

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(M, y, CW, comH, 2, 2, 'F');
      doc.setFontSize(7); doc.setFont(undefined, 'bold'); doc.setTextColor(0, 140, 120);
      doc.text(c.sector + ' > ' + c.category, M + 4, y + 5);
      doc.setFontSize(7); doc.setFont(undefined, 'normal'); doc.setTextColor(60, 60, 60);
      doc.text(c.question.substring(0, 80), M + 4, y + 10);
      var commentTextY = y + 15;
      if (c.comment) {
        doc.setFontSize(7); doc.setTextColor(80, 80, 80);
        var commentLines = doc.splitTextToSize(c.comment, CW - 10);
        doc.text(commentLines, M + 4, commentTextY);
        commentTextY += commentLines.length * 4;
      }
      if (commentPhotoRows > 0) {
        var comPx = M + 4;
        var comPy = Math.max(commentTextY, y + comH - 30);
        if (comPy < y + 18) comPy = y + 18;
        commentPhotos.forEach(function(ph) {
          var ext = ph.indexOf('png') > -1 ? 'PNG' : 'JPEG';
          var pw = 55, phH = 55;
          doc.addImage(ph, ext, comPx, comPy, pw, phH);
          comPx += pw + 4;
        });
      }
      y += comH + 3;
    });
  }

  // === PAGE 4+: Only Pass/Fail questions (omit N/A/unanswered) ===
  doc.addPage(); y = M;
  doc.setFillColor(0, 168, 142);
  doc.rect(0, 0, W, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14); doc.setFont(undefined, 'bold');
  doc.text('Answered Questions', M, 12);
  y = 26;

  var compliantRows = [];
  var nonCompliantRows = [];
  auditSectorKeys().forEach(function(sid) {
    var sec = auditState.sectors[sid];
    sec.categories.forEach(function(cat) {
      cat.questions.forEach(function(q) {
        if (q.answer === 'Pass') {
          compliantRows.push([sec.title, cat.name, q.text.substring(0, 65), 'Pass', q.weight + '']);
        } else if (q.answer === 'Fail') {
          nonCompliantRows.push([sec.title, cat.name, q.text.substring(0, 65), 'Fail', q.weight + '']);
        }
      });
    });
  });

  if (compliantRows.length > 0) {
    checkPage(15);
    doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(16, 185, 129);
    doc.text('Compliant (' + compliantRows.length + ')', M, y); y += 4;
    doc.autoTable({
      startY: y,
      head: [['Sector', 'Category', 'Question', 'Answer', 'Wt']],
      body: compliantRows,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [16, 185, 129], fontSize: 7, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 253, 250] },
      margin: { left: M, right: M },
      columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 28 }, 2: { cellWidth: 75 }, 3: { cellWidth: 12, halign: 'center' }, 4: { cellWidth: 10, halign: 'center' } }
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  if (nonCompliantRows.length > 0) {
    checkPage(15);
    doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(200, 50, 50);
    doc.text('Non-Compliant (' + nonCompliantRows.length + ')', M, y); y += 4;
    doc.autoTable({
      startY: y,
      head: [['Sector', 'Category', 'Question', 'Answer', 'Wt']],
      body: nonCompliantRows,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [200, 50, 50], fontSize: 7, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [254, 242, 242] },
      margin: { left: M, right: M },
      columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 28 }, 2: { cellWidth: 75 }, 3: { cellWidth: 12, halign: 'center' }, 4: { cellWidth: 10, halign: 'center' } }
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // Footer on all pages
  var pageCount = doc.internal.getNumberOfPages();
  for (var p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7); doc.setTextColor(150, 150, 150);
    doc.text('Birds Bakery \u2014 Retail Audit Report' + (isTraining ? ' [TRAINING]' : '') + ' \u2014 Generated ' + new Date().toLocaleString('en-GB'), M, H - 8);
    doc.text('Page ' + p + ' of ' + pageCount, W - M, H - 8, { align: 'right' });
  }

  return doc.output('blob');
}

async function saveToHistory(sessionData) {
  if (!auditState) return;
  var m = sessionData.metadata || auditState;
  var s = sessionData.scores || auditOverallMetrics();
  var isTraining = auditState.isTraining || false;

  var historyEntry = {
    store: m.storeName || auditState.storeName,
    auditor: m.auditor || auditState.auditor,
    date: m.date || auditState.date,
    score: typeof s.overall === 'number' ? s.overall : (s.pct || null),
    areaManager: m.areaManager || auditState.areaManager,
    exportedAt: new Date().toISOString(),
    isTraining: isTraining
  };

  if (!isTraining) {
    await idbAdd('history', historyEntry);
  } else {
    await idbAdd('training_audits', historyEntry);
  }
}
