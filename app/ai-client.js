(function (window) {
  'use strict';

  const { CATEGORIES } = window.EditorAssistantRules;
  const Analysis = window.EditorAssistantAnalysis;

  const AI_CONFIG = {
    endpoint: '/.netlify/functions/analyze-brief',
    timeoutMs: 25000
  };

  function normalizeAiPayload(parsed) {
    if (!Array.isArray(parsed.contradictions) || !Array.isArray(parsed.questions) || !Array.isArray(parsed.categorySignals)) {
      throw new Error('AI JSON не соответствует контракту.');
    }

    const contradictionItems = parsed.contradictions
      .filter(item => item && typeof item.explanation === 'string' && typeof item.type === 'string')
      .map(item => ({
        id: item.type,
        name: item.type,
        message: item.explanation,
        evidence: typeof item.evidence === 'string' ? item.evidence : ''
      }));

    const questionItems = parsed.questions
      .filter(item => item && typeof item.text === 'string')
      .map(item => ({
        priority: item.priority === 'must' ? 'must' : 'should',
        text: item.text.trim(),
        rationale: typeof item.rationale === 'string' ? item.rationale.trim() : '',
        relatedContradictionType: typeof item.relatedContradictionType === 'string' ? item.relatedContradictionType : ''
      }))
      .filter(item => item.text.length > 0)
      .sort((a, b) => (a.priority === b.priority ? 0 : a.priority === 'must' ? -1 : 1));

    const validStatuses = new Set(['green', 'yellow', 'red']);
    const validCategoryIds = new Set(CATEGORIES.map(c => c.id));
    const categorySignals = parsed.categorySignals
      .filter(item => item && validCategoryIds.has(item.id) && validStatuses.has(item.status))
      .map(item => ({ id: item.id, status: item.status, note: typeof item.note === 'string' ? item.note : '' }));

    const understanding = Array.isArray(parsed.shortTaskUnderstanding)
      ? parsed.shortTaskUnderstanding.filter(v => typeof v === 'string').map(v => v.trim()).filter(Boolean)
      : [];

    return { contradictionItems, questionItems, categorySignals, understanding };
  }

  async function requestAiAnalysis(rawText) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_CONFIG.timeoutMs);

    try {
      const res = await fetch(AI_CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rawText
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        let details = '';
        try {
          const errorPayload = await res.json();
          if (errorPayload && typeof errorPayload.error === 'string') details = errorPayload.error;
        } catch (e) { /* no-op */ }
        throw new Error(details ? `API ошибка ${res.status}: ${details}` : `API ошибка ${res.status}`);
      }
      const payload = await res.json();
      return normalizeAiPayload(payload);
    } finally {
      clearTimeout(timer);
    }
  }

  async function analyzeWithAiOrFallback(text) {
    const heuristic = Analysis.runHeuristicPipeline(text);
    try {
      const aiData = await requestAiAnalysis(text);
      return {
        analysisResults: Analysis.applyCategorySignals(heuristic.analysisResults, aiData.categorySignals),
        contradictions: aiData.contradictionItems.length ? aiData.contradictionItems : heuristic.contradictions,
        aiQuestions: aiData.questionItems,
        aiUnderstanding: aiData.understanding,
        source: 'ai',
        notice: 'AI-анализ выполнен через защищенный серверный запрос.'
      };
    } catch (error) {
      return {
        ...heuristic,
        source: 'fallback',
        notice: `AI недоступен (${error.message}). Использован эвристический fallback.`
      };
    }
  }

  window.EditorAssistantAiClient = {
    requestAiAnalysis,
    analyzeWithAiOrFallback
  };
})(window);
