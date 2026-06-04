(function (window) {
  'use strict';

  const LS_KEY = 'editorassistant.v1';

  function saveState(snapshot) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(snapshot));
    } catch (e) { /* quota / private mode */ }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  window.EditorAssistantPersistence = {
    saveState,
    loadState
  };
})(window);
