(function (window) {
  'use strict';

  const { escapeHtml } = window.EditorAssistantDom;
  const Analysis = window.EditorAssistantAnalysis;
  const State = window.EditorAssistantState;

  function renderAnalysis(dom, state) {
    dom.originalText.textContent = state.originalText;
    dom.originalTextMobile.textContent = state.originalText;
    dom.understandingContainer.innerHTML = '';

    const counts = { green: 0, yellow: 0, red: 0 };
    state.analysisResults.forEach(r => counts[r.status]++);

    dom.summaryBar.innerHTML = `
      <span class="s-green">Готово: ${counts.green}</span><span class="sep">·</span>
      <span class="s-yellow">Частично: ${counts.yellow}</span><span class="sep">·</span>
      <span class="s-red">Не\u00a0хватает: ${counts.red}</span>
      ${state.contradictions.length ? `<span class="sep">·</span><span style="color:var(--orange)">Противоречия: ${state.contradictions.length}</span>` : ''}
      ${state.analysisSource === 'ai' ? '<span class="sep">·</span><span class="pill pill-ai">AI</span>' : ''}
      ${state.analysisSource === 'fallback' ? '<span class="sep">·</span><span class="pill pill-warning">fallback</span>' : ''}
    `;
    if (state.analysisNotice) {
      dom.summaryBar.innerHTML += `<span class="sep">·</span><span style="font-size:12px;color:var(--text-dim)">${escapeHtml(state.analysisNotice)}</span>`;
    }

    renderContradictions(dom, state);
    renderCategories(dom, state);
    renderQuestions(dom, state);
  }

  function renderContradictions(dom, state) {
    if (state.contradictions.length) {
      dom.contradictionsContainer.innerHTML = '<div class="contradictions-section">' +
        state.contradictions.map(c => `
          <div class="contradiction-card">
            <div class="contradiction-header">
              <span style="color:var(--orange);font-size:16px">⚠</span>
              <span class="contradiction-title">${escapeHtml(c.name)}</span>
            </div>
            <div class="contradiction-body">${escapeHtml(c.message)}${c.evidence ? `<br><span style="color:var(--text-dim)">Фрагмент: ${escapeHtml(c.evidence)}</span>` : ''}</div>
          </div>`).join('') + '</div>';
    } else {
      dom.contradictionsContainer.innerHTML = '';
    }
  }

  function renderCategories(dom, state) {
    dom.categoriesContainer.innerHTML = state.analysisResults.map((r, i) => {
      const bc = r.status === 'green' ? 'badge-green' : r.status === 'yellow' ? 'badge-yellow' : 'badge-red';
      const bt = r.status === 'green' ? 'Есть' : r.status === 'yellow' ? 'Частично' : 'Не\u00a0хватает';
      let body = '';
      if (r.status === 'green') {
        body = `<div class="cat-found">${r.foundSummary}</div>`;
      } else {
        if (r.foundSummary && r.status === 'yellow') {
          body += `<div class="cat-found" style="margin-bottom:10px">Найдено: ${r.foundSummary}</div>`;
        }
        body += r.activeGaps.map(g => `
          <div class="gap-item">
            <span style="color:${r.status==='yellow'?'var(--yellow)':'var(--red)'};font-size:15px;margin-top:1px">●</span>
            <div><div class="gap-text">${g.text}</div><div class="gap-reason">${g.reason}</div></div>
          </div>`).join('');
      }
      return `<div class="category-card" style="transition-delay:${i*60}ms">
        <div class="cat-header"><span class="cat-title">${r.title}</span><span class="badge ${bc}">${bt}</span></div>
        <div style="font-size:13px;color:var(--text-dim);margin-bottom:10px">${r.subtitle}</div>
        ${body}
      </div>`;
    }).join('');

    setTimeout(() => {
      document.querySelectorAll('.category-card').forEach((c, i) => setTimeout(() => c.classList.add('show'), i * 60));
    }, 50);
  }

  function renderQuestions(dom, state) {
    const heuristicQuestions = Analysis.buildHeuristicQuestions(state.analysisResults);
    const allQ = Analysis.mergeQuestions(state.aiQuestions, heuristicQuestions);
    State.setAllQuestions(allQ);

    if (allQ.length) {
      dom.questionsSection.innerHTML = '<h3>Вопросы, которые стоит задать</h3>' +
        allQ.map((q, i) => `
          <div class="question-card">
            <div class="q-content">
              <span class="q-num">${i+1}.</span>
              <div>
                <span class="q-text">${escapeHtml(q.text)}</span>
                <div class="q-meta">
                  <span class="pill ${q.priority === 'must' ? 'pill-danger' : 'pill-warning'}">${q.priority === 'must' ? 'Must' : 'Should'}</span>
                </div>
                ${q.rationale ? `<div class="q-rationale">${escapeHtml(q.rationale)}</div>` : ''}
              </div>
            </div>
            <button class="btn-copy" data-action="copy-question" data-index="${i}">📋</button>
          </div>`).join('') +
        `<div class="copy-all-wrap"><button class="btn-ghost" id="btnCopyAll" data-action="copy-all">Скопировать все вопросы</button></div>`;
    } else {
      dom.questionsSection.innerHTML = '<p style="color:var(--green);font-size:14px;margin-top:20px">Все категории заполнены. Запрос готов к\u00a0работе ✓</p>';
    }
    dom.questionsSection.style.display = 'block';
  }

  function renderSupplement(dom, state) {
    dom.originalTextS3.textContent = state.originalText;
    dom.accordionS3.innerHTML = state.analysisResults.map(r => {
      const bc = r.status === 'green' ? 'badge-green' : r.status === 'yellow' ? 'badge-yellow' : 'badge-red';
      const bt = r.status === 'green' ? 'Есть' : r.status === 'yellow' ? 'Частично' : 'Не\u00a0хватает';
      return `<div class="accordion-card"><div class="accordion-header"><span class="cat-title">${r.title}</span><span class="badge ${bc}">${bt}</span></div></div>`;
    }).join('');
  }

  function renderUnderstanding(dom, state) {
    if (state.analysisSource === 'ai' && state.aiUnderstanding.length) {
      renderAiUnderstanding(dom, state);
      return;
    }

    renderHeuristicUnderstanding(dom, state);
  }

  function renderAiUnderstanding(dom, state) {
    const rows = state.aiUnderstanding.map(point => `• ${point}`).join('\n');
    const plainText = `ПОНИМАНИЕ ЗАДАЧИ\n\n${rows}\n\n` +
      (state.contradictions.length ? 'Противоречия:\n' + state.contradictions.map(c => `⚠️ ${c.name}: ${c.message}`).join('\n') : '');

    State.setUnderstandingPlainText(plainText);

    dom.understandingContainer.innerHTML = '<div class="understanding-section"><h3>Понимание задачи</h3>' +
      state.aiUnderstanding.map(point => `
        <div class="understanding-block">
          <div class="understanding-value">${escapeHtml(point)}</div>
        </div>`).join('') +
      (state.contradictions.length ? `<div class="understanding-block"><div class="understanding-label">Противоречия</div>` +
        state.contradictions.map(c => `<div class="understanding-risk" style="margin-bottom:6px"><span>⚠</span><span><strong>${escapeHtml(c.name)}:</strong> ${escapeHtml(c.message)}</span></div>`).join('') + '</div>' : '') +
      `<div class="copy-understanding-wrap"><button class="btn-ghost" id="btnCopyU" data-action="copy-understanding">Скопировать понимание задачи</button></div></div>`;
    dom.understandingContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderHeuristicUnderstanding(dom, state) {
    const blocks = state.analysisResults.map(r => {
      const value = r.foundDetails.length ? r.foundDetails.map(d => d.snippet).join('. ') : '';
      let risk = null;
      if (r.status === 'red') risk = r.riskIfMissing;
      else if (r.status === 'yellow' && r.activeGaps.length) {
        risk = 'Не\u00a0хватает: ' + r.activeGaps.map(g => g.text.toLowerCase()).join('; ') + '.';
      }
      return { label: r.title, value: r.status === 'red' ? '' : value, risk, status: r.status };
    });

    const plainText = 'ПОНИМАНИЕ ЗАДАЧИ\n\n' +
      blocks.map(b => `${b.label}\n${b.value || '(нет данных)'}${b.risk ? '\n⚠️ ' + b.risk.replace(/\u00a0/g,' ') : ''}`).join('\n\n') +
      (state.contradictions.length ? '\n\nПротиворечия:\n' + state.contradictions.map(c => '⚠️ ' + c.name.replace(/\u00a0/g,' ') + ': ' + c.message.replace(/\u00a0/g,' ')).join('\n') : '');

    State.setUnderstandingPlainText(plainText);

    dom.understandingContainer.innerHTML = '<div class="understanding-section"><h3>Понимание задачи</h3>' +
      blocks.map(b => `
        <div class="understanding-block">
          <div class="understanding-label">${b.label}</div>
          <div class="understanding-value">${b.value || '<span style="color:var(--text-dim);font-style:italic">Информация отсутствует</span>'}</div>
          ${b.risk ? `<div class="understanding-risk"><span>⚠</span><span>${b.risk}</span></div>` : ''}
        </div>`).join('') +
      (state.contradictions.length ? `<div class="understanding-block"><div class="understanding-label">Противоречия</div>` +
        state.contradictions.map(c => `<div class="understanding-risk" style="margin-bottom:6px"><span>⚠</span><span><strong>${c.name}:</strong> ${c.message}</span></div>`).join('') + '</div>' : '') +
      `<div class="copy-understanding-wrap"><button class="btn-ghost" id="btnCopyU" data-action="copy-understanding">Скопировать понимание задачи</button></div></div>`;

    dom.understandingContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  window.EditorAssistantRender = {
    renderAnalysis,
    renderSupplement,
    renderUnderstanding
  };
})(window);
