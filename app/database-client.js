(function (window) {
  'use strict';

  const ENDPOINT = '/.netlify/functions/task-cards';

  async function request(options = {}) {
    const response = await fetch(ENDPOINT, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `Ошибка локальной базы: ${response.status}`);
    }
    return payload;
  }

  async function loadCards() {
    const payload = await request();
    return Array.isArray(payload.cards) ? payload.cards : [];
  }

  async function saveAnswer(clientRequest, answerText) {
    return request({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientRequest, answerText })
    });
  }

  window.EditorAssistantDatabaseClient = {
    loadCards,
    saveAnswer
  };
})(window);
