(function (window) {
  'use strict';

  const state = {
    currentScreen: 1,
    analysisResults: [],
    contradictions: [],
    originalText: '',
    aiQuestions: [],
    aiUnderstanding: [],
    analysisSource: 'heuristic',
    analysisNotice: '',
    allQuestions: [],
    understandingPlainText: ''
  };

  function setScreen(screen) {
    state.currentScreen = screen;
  }

  function setOriginalText(text) {
    state.originalText = text;
  }

  function setAnalysisResult(result) {
    state.analysisResults = result.analysisResults;
    state.contradictions = result.contradictions;
    state.aiQuestions = result.aiQuestions || [];
    state.aiUnderstanding = result.aiUnderstanding || [];
    state.analysisSource = result.source;
    state.analysisNotice = result.notice;
  }

  function setRestoredAnalysis(analysisResults, contradictions) {
    state.analysisResults = analysisResults;
    state.contradictions = contradictions;
    state.aiQuestions = [];
    state.aiUnderstanding = [];
    state.analysisSource = 'heuristic';
    state.analysisNotice = '';
  }

  function setAllQuestions(questions) {
    state.allQuestions = questions;
  }

  function setUnderstandingPlainText(text) {
    state.understandingPlainText = text;
  }

  window.EditorAssistantState = {
    state,
    setScreen,
    setOriginalText,
    setAnalysisResult,
    setRestoredAnalysis,
    setAllQuestions,
    setUnderstandingPlainText
  };
})(window);
