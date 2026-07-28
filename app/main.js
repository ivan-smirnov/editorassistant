(function (window, document) {
  'use strict';

  const { DEMO_TEXT } = window.EditorAssistantRules;
  const Dom = window.EditorAssistantDom;
  const State = window.EditorAssistantState;
  const Persistence = window.EditorAssistantPersistence;
  const Analysis = window.EditorAssistantAnalysis;
  const AiClient = window.EditorAssistantAiClient;
  const DatabaseClient = window.EditorAssistantDatabaseClient;
  const Render = window.EditorAssistantRender;

  const dom = Dom.getDomRefs();
  const state = State.state;
  const showcasePreview = new URLSearchParams(window.location.search).get('showcase-preview');
  const persistStateDebounced = Dom.debounce(persistState, 400);

  const SHOWCASE_ANSWERS = `После статьи читатель должен понять, чем наш подход отличается от обычных wellness-программ, и запросить демо.

Обязательно включите три отличия продукта и короткий кейс клиента. Финальный текст согласует Марина, директор по маркетингу. Передача — в Google Docs до 18:00 в пятницу.`;

  function isDesignSystemRoute() {
    return window.location.pathname.replace(/\/+$/, '') === '/design-system';
  }

  function isShowcaseRoute() {
    return window.location.pathname.replace(/\/+$/, '') === '/showcase';
  }

  function persistState() {
    if (showcasePreview) return;

    Persistence.saveState({
      v: 1,
      screen: state.currentScreen,
      mainInput: dom.mainInput.value,
      originalText: state.originalText,
      answersInput: dom.answersInput.value
    });
  }

  function activateScreen(screen) {
    [dom.screen1, dom.screen2, dom.screen3].forEach((el, i) => {
      const on = i === screen - 1;
      el.classList.toggle('active', on);
      el.classList.toggle('visible', on);
    });
    [dom.screenShowcase, dom.screenDesignSystem].forEach(el => {
      el.classList.remove('active', 'visible');
    });
  }

  function activateDesignSystem() {
    document.title = 'Дизайн-система — Ассистент для редактора';
    [dom.screen1, dom.screen2, dom.screen3, dom.screenShowcase, dom.screenDesignSystem].forEach(el => {
      el.classList.toggle('active', el === dom.screenDesignSystem);
      el.classList.toggle('visible', false);
    });
    requestAnimationFrame(() => requestAnimationFrame(() => dom.screenDesignSystem.classList.add('visible')));
  }

  function activateShowcase() {
    document.title = 'Витрина экранов — Ассистент для редактора';
    [dom.screen1, dom.screen2, dom.screen3, dom.screenShowcase, dom.screenDesignSystem].forEach(el => {
      el.classList.toggle('active', el === dom.screenShowcase);
      el.classList.toggle('visible', false);
    });
    requestAnimationFrame(() => requestAnimationFrame(() => dom.screenShowcase.classList.add('visible')));
  }

  function seedShowcaseAnalysis(text, originalText = text) {
    State.setOriginalText(originalText);
    State.setRestoredAnalysis(
      Analysis.analyzeText(text),
      Analysis.detectContradictions(text)
    );
  }

  function activateShowcasePreview(preview) {
    const allowed = ['input', 'analysis', 'supplement', 'understanding'];
    if (!allowed.includes(preview)) return false;

    document.documentElement.dataset.showcasePreview = preview;
    bindEvents();
    dom.mainInput.value = DEMO_TEXT;
    dom.mainInput.dispatchEvent(new Event('input'));

    if (preview === 'input') {
      State.setScreen(1);
      activateScreen(1);
      return true;
    }

    const analysisText = preview === 'understanding'
      ? `${DEMO_TEXT}\n\n${SHOWCASE_ANSWERS}`
      : DEMO_TEXT;
    seedShowcaseAnalysis(analysisText, DEMO_TEXT);

    if (preview === 'supplement') {
      dom.answersInput.value = SHOWCASE_ANSWERS;
      State.setScreen(3);
      activateScreen(3);
      Render.renderSupplement(dom, state);
      return true;
    }

    State.setScreen(2);
    activateScreen(2);
    Render.renderAnalysis(dom, state);
    if (preview === 'understanding') Render.renderUnderstanding(dom, state);
    return true;
  }

  function restoreState() {
    const saved = Persistence.loadState();
    if (!saved) return false;

    if (typeof saved.mainInput === 'string') dom.mainInput.value = saved.mainInput;
    if (typeof saved.originalText === 'string') State.setOriginalText(saved.originalText);
    if (typeof saved.answersInput === 'string') dom.answersInput.value = saved.answersInput;

    const screen = Math.min(3, Math.max(1, parseInt(saved.screen, 10) || 1));
    const hasAnalyzed = state.originalText.length >= 20;
    const combined = dom.answersInput.value.trim()
      ? state.originalText + '\n\n' + dom.answersInput.value
      : state.originalText;

    if (hasAnalyzed) {
      State.setRestoredAnalysis(
        Analysis.analyzeText(combined),
        Analysis.detectContradictions(combined)
      );
    }

    State.setScreen(screen);
    activateScreen(screen);

    if (screen === 2) Render.renderAnalysis(dom, state);
    if (screen === 3) Render.renderSupplement(dom, state);

    dom.mainInput.dispatchEvent(new Event('input'));
    return true;
  }

  function switchScreen(to) {
    const screens = [dom.screen1, dom.screen2, dom.screen3];
    const cur = screens[state.currentScreen - 1];
    cur.classList.remove('visible');
    setTimeout(() => {
      cur.classList.remove('active');
      const next = screens[to - 1];
      next.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      requestAnimationFrame(() => requestAnimationFrame(() => next.classList.add('visible')));
      State.setScreen(to);
      if (to === 2) Render.renderAnalysis(dom, state);
      if (to === 3) Render.renderSupplement(dom, state);
      persistState();
    }, 200);
  }

  async function executeAnalysisPipeline(text) {
    const result = await AiClient.analyzeWithAiOrFallback(text);
    State.setAnalysisResult(result);
  }

  async function loadDatabaseCards() {
    try {
      const cards = await DatabaseClient.loadCards();
      Render.renderDatabaseCards(dom, cards);
    } catch (error) {
      if (dom.databaseCards) dom.databaseCards.hidden = true;
    }
  }

  function copyQuestion(button, index) {
    const item = state.allQuestions[index];
    if (!item) return;
    navigator.clipboard.writeText(item.text).then(() => {
      button.textContent = '✓';
      setTimeout(() => { button.textContent = '📋'; }, 1500);
    });
  }

  function copyAllQuestions(button) {
    navigator.clipboard.writeText(state.allQuestions.map((q,i) => `${i+1}. ${q.text}`).join('\n')).then(() => {
      button.textContent = 'Скопировано ✓';
      setTimeout(() => { button.textContent = 'Скопировать все вопросы'; }, 2000);
    });
  }

  function copyUnderstanding(button) {
    navigator.clipboard.writeText(state.understandingPlainText).then(() => {
      button.textContent = 'Скопировано ✓';
      setTimeout(() => { button.textContent = 'Скопировать понимание задачи'; }, 2000);
    });
  }

  function bindEvents() {
    dom.mainInput.addEventListener('input', () => {
      const len = dom.mainInput.value.length;
      dom.charCount.textContent = `${len} ${Dom.pluralize(len,'символ','символа','символов')}`;
      dom.btnAnalyze.disabled = len < 20;
      persistStateDebounced();
    });

    dom.answersInput.addEventListener('input', persistStateDebounced);

    document.getElementById('btnDemo').addEventListener('click', () => {
      dom.mainInput.value = DEMO_TEXT;
      dom.mainInput.dispatchEvent(new Event('input'));
    });

    dom.btnAnalyze.addEventListener('click', async () => {
      if (dom.mainInput.value.length < 20) return;
      State.setOriginalText(dom.mainInput.value);
      Dom.setButtonLoading(dom.btnAnalyze, 'Анализирую', true);
      try {
        await executeAnalysisPipeline(state.originalText);
      } finally {
        dom.btnAnalyze.innerHTML = 'Разобрать запрос →';
        Dom.setButtonLoading(dom.btnAnalyze, '', false);
        switchScreen(2);
      }
    });

    document.getElementById('btnEditDesktop').addEventListener('click', () => {
      dom.mainInput.value = state.originalText;
      dom.mainInput.dispatchEvent(new Event('input'));
      switchScreen(1);
    });
    document.getElementById('btnEditMobile').addEventListener('click', () => {
      dom.mainInput.value = state.originalText;
      dom.mainInput.dispatchEvent(new Event('input'));
      switchScreen(1);
    });

    document.getElementById('mobileAccToggle').addEventListener('click', () => {
      document.getElementById('mobileAccBody').classList.toggle('open');
      const ch = document.getElementById('mobileChevron');
      ch.classList.toggle('rotated');
    });

    document.getElementById('btnAddAnswers').addEventListener('click', () => switchScreen(3));
    document.getElementById('btnGenUnderstanding').addEventListener('click', () => Render.renderUnderstanding(dom, state));

    document.getElementById('btnUpdateAnalysis').addEventListener('click', async () => {
      const answers = dom.answersInput.value.trim();
      if (!answers) return;
      const btn = document.getElementById('btnUpdateAnalysis');
      Dom.setButtonLoading(btn, 'Анализирую', true);
      try {
        await executeAnalysisPipeline(state.originalText + '\n\n' + answers);
        try {
          await DatabaseClient.saveAnswer(state.originalText, answers);
          Render.renderDatabaseSaveStatus(dom, 'Ответ сохранён в локальной базе.');
        } catch (error) {
          Render.renderDatabaseSaveStatus(dom, error.message, true);
        }
      } finally {
        btn.innerHTML = 'Обновить разбор →';
        Dom.setButtonLoading(btn, '', false);
        switchScreen(2);
      }
    });

    document.addEventListener('click', event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;

      if (button.dataset.action === 'copy-question') {
        copyQuestion(button, parseInt(button.dataset.index, 10));
      }
      if (button.dataset.action === 'copy-all') {
        copyAllQuestions(button);
      }
      if (button.dataset.action === 'copy-understanding') {
        copyUnderstanding(button);
      }
    });
  }

  function init() {
    if (isShowcaseRoute()) {
      activateShowcase();
      return;
    }

    if (isDesignSystemRoute()) {
      activateDesignSystem();
      return;
    }

    if (showcasePreview && activateShowcasePreview(showcasePreview)) return;

    bindEvents();
    loadDatabaseCards();
    window.addEventListener('beforeunload', persistState);
    if (!restoreState()) {
      dom.screen1.classList.add('active');
      requestAnimationFrame(() => requestAnimationFrame(() => dom.screen1.classList.add('visible')));
    }
  }

  init();
})(window, document);
