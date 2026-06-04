(function (window, document) {
  'use strict';

  function getDomRefs() {
    return {
      mainInput: document.getElementById('mainInput'),
      charCount: document.getElementById('charCount'),
      btnAnalyze: document.getElementById('btnAnalyze'),
      screen1: document.getElementById('screen1'),
      screen2: document.getElementById('screen2'),
      screen3: document.getElementById('screen3'),
      originalText: document.getElementById('originalText'),
      originalTextMobile: document.getElementById('originalTextMobile'),
      originalTextS3: document.getElementById('originalTextS3'),
      summaryBar: document.getElementById('summaryBar'),
      contradictionsContainer: document.getElementById('contradictionsContainer'),
      categoriesContainer: document.getElementById('categoriesContainer'),
      questionsSection: document.getElementById('questionsSection'),
      understandingContainer: document.getElementById('understandingContainer'),
      answersInput: document.getElementById('answersInput'),
      accordionS3: document.getElementById('accordionS3')
    };
  }

  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function pluralize(n, one, few, many) {
    const a = Math.abs(n) % 100, l = a % 10;
    if (a > 10 && a < 20) return many;
    if (l > 1 && l < 5) return few;
    if (l === 1) return one;
    return many;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setButtonLoading(button, loadingText, isLoading) {
    if (isLoading) {
      button.innerHTML = `${loadingText}<span class="pulse-dot"></span>`;
      button.disabled = true;
      return;
    }
    button.disabled = false;
  }

  window.EditorAssistantDom = {
    getDomRefs,
    debounce,
    pluralize,
    escapeHtml,
    setButtonLoading
  };
})(window, document);
