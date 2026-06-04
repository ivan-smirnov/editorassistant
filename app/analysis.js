(function (window) {
  'use strict';

  const { CATEGORIES, CONTRADICTION_RULES } = window.EditorAssistantRules;
  const MUST_QUESTION_CATEGORY_IDS = new Set(['task', 'deliverable', 'deadlines']);

  function analyzeText(text) {
    const lower = text.toLowerCase();
    return CATEGORIES.map(cat => {
      const foundGroups = new Set();
      const foundDetails = [];
      for (const marker of cat.markers) {
        for (const kw of marker.keywords) {
          if (lower.includes(kw)) {
            foundGroups.add(marker.group);
            const idx = lower.indexOf(kw);
            const s = Math.max(0, idx - 30), e = Math.min(text.length, idx + kw.length + 50);
            let snip = text.substring(s, e).replace(/\n/g,' ').trim();
            if (s > 0) snip = '...' + snip;
            if (e < text.length) snip += '...';
            foundDetails.push({ group: marker.group, snippet: snip });
            break;
          }
        }
      }
      const count = foundGroups.size;
      const status = count >= 2 ? 'green' : count === 1 ? 'yellow' : 'red';
      const allGroups = new Set(cat.markers.map(m => m.group));
      const missingGroups = [...allGroups].filter(g => !foundGroups.has(g));
      const activeGaps = cat.gaps.filter(g => missingGroups.includes(g.forMissing));
      const foundSummary = foundDetails.map(d => `«${d.snippet}»`).join(' ');
      return { ...cat, status, foundGroups: [...foundGroups], missingGroups, activeGaps, foundSummary, foundDetails };
    });
  }

  function detectContradictions(text) {
    return CONTRADICTION_RULES.map(r => {
      const msg = r.detect(text);
      return msg ? { id: r.id, name: r.name, message: msg } : null;
    }).filter(Boolean);
  }

  function runHeuristicPipeline(text) {
    return {
      analysisResults: analyzeText(text),
      contradictions: detectContradictions(text),
      aiQuestions: [],
      aiUnderstanding: [],
      source: 'heuristic',
      notice: 'Использован эвристический анализ.'
    };
  }

  function applyCategorySignals(baseResults, categorySignals) {
    if (!Array.isArray(categorySignals) || !categorySignals.length) return baseResults;
    const byId = new Map(categorySignals.map(s => [s.id, s]));
    return baseResults.map(item => {
      const signal = byId.get(item.id);
      if (!signal) return item;
      return { ...item, status: signal.status };
    });
  }

  function normalizeQuestionKey(text) {
    return String(text || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[?!.,;:]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function buildHeuristicQuestions(results) {
    return results
      .filter(r => r.status !== 'green')
      .flatMap(r => {
        const priority = r.status === 'red' && MUST_QUESTION_CATEGORY_IDS.has(r.id) ? 'must' : 'should';
        const rationale = priority === 'must' ? r.riskIfMissing : '';
        return r.questions.map(q => ({ priority, text: q, rationale }));
      });
  }

  function mergeQuestions(...groups) {
    const byText = new Map();

    groups.flat().forEach(item => {
      if (!item || typeof item.text !== 'string') return;
      const text = item.text.trim();
      const key = normalizeQuestionKey(text);
      if (!key) return;

      const next = {
        priority: item.priority === 'must' ? 'must' : 'should',
        text,
        rationale: typeof item.rationale === 'string' ? item.rationale.trim() : '',
        relatedContradictionType: typeof item.relatedContradictionType === 'string' ? item.relatedContradictionType : ''
      };
      const existing = byText.get(key);

      if (!existing) {
        byText.set(key, next);
        return;
      }

      if (next.priority === 'must') existing.priority = 'must';
      if (!existing.rationale && next.rationale) existing.rationale = next.rationale;
      if (!existing.relatedContradictionType && next.relatedContradictionType) {
        existing.relatedContradictionType = next.relatedContradictionType;
      }
    });

    return [...byText.values()].sort((a, b) => (
      a.priority === b.priority ? 0 : a.priority === 'must' ? -1 : 1
    ));
  }

  window.EditorAssistantAnalysis = {
    analyzeText,
    detectContradictions,
    runHeuristicPipeline,
    applyCategorySignals,
    buildHeuristicQuestions,
    mergeQuestions
  };
})(window);
