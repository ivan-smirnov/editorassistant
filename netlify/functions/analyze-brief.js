const { notifyTelegramFailure } = require('./lib/telegram-notifier');

const AI_OUTPUT_SCHEMA = {
  contradictions: [{ type: 'string', evidence: 'string', explanation: 'string', confidence: '0-1' }],
  questions: [{ priority: 'must|should', text: 'string', rationale: 'string', relatedContradictionType: 'string' }],
  categorySignals: [{ id: 'context|problem|task|solution|deliverable|deadlines', status: 'green|yellow|red', note: 'string' }],
  shortTaskUnderstanding: ['string']
};

const AI_CONFIG = {
  endpoint: 'https://api.openai.com/v1/responses',
  model: 'gpt-5-mini',
  temperature: 0.2,
  timeoutMs: 25000
};

function extractJsonStringFromText(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const direct = raw.trim();
  if (direct.startsWith('{') && direct.endsWith('}')) return direct;
  const match = direct.match(/\{[\s\S]*\}/);
  return match ? match[0] : '';
}

function readResponseText(payload) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim();
  if (Array.isArray(payload.output)) {
    const chunks = [];
    payload.output.forEach(item => {
      if (!Array.isArray(item.content)) return;
      item.content.forEach(part => {
        if (part.type === 'output_text' && typeof part.text === 'string') chunks.push(part.text);
      });
    });
    if (chunks.length) return chunks.join('\n').trim();
  }
  return '';
}

function buildAiPrompt(rawText) {
  return [
    'Ты аналитик брифов для редактора. Верни ТОЛЬКО валидный JSON без markdown и пояснений.',
    'Контракт JSON:',
    JSON.stringify(AI_OUTPUT_SCHEMA, null, 2),
    'Правила:',
    '1) contradictions: фиксируй только реальные нестыковки/противоречия по тексту.',
    '2) questions: формируй из categorySignals со статусом red/yellow и из contradictions; если есть пробел без противоречия, вопрос всё равно нужен.',
    '3) для каждого red/yellow блока дай хотя бы один конкретный вопрос, если ответ на него нужен редактору.',
    '4) приоритет must только для блокеров старта работы; red по task, deliverable или deadlines почти всегда must, остальное should.',
    '5) categorySignals: оцени 6 категорий по статусам green/yellow/red.',
    '6) shortTaskUnderstanding: 4-6 коротких пунктов для редактора.',
    '',
    'Текст клиента:',
    rawText
  ].join('\n');
}

function normalizeAiPayload(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI JSON пустой или невалидный.');
  }
  if (!Array.isArray(parsed.contradictions) || !Array.isArray(parsed.questions) || !Array.isArray(parsed.categorySignals)) {
    throw new Error('AI JSON не соответствует контракту.');
  }
  return {
    contradictions: parsed.contradictions,
    questions: parsed.questions,
    categorySignals: parsed.categorySignals,
    shortTaskUnderstanding: Array.isArray(parsed.shortTaskUnderstanding) ? parsed.shortTaskUnderstanding : []
  };
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body)
  };
}

function readRequestId(event) {
  const headers = event.headers || {};
  return headers['x-nf-request-id'] || headers['x-request-id'] || headers['X-Nf-Request-Id'] || '';
}

async function notifyAiFailure(event, rawText, reason, details = {}) {
  await notifyTelegramFailure({
    title: 'AI-разбор брифа не выполнился',
    reason,
    details: {
      function: 'analyze-brief',
      stage: details.stage,
      status: details.status,
      requestId: readRequestId(event),
      rawTextLength: rawText ? rawText.length : 0,
      note: details.note
    }
  });
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed. Use POST.' });
  }

  if (!process.env.OPENAI_API_KEY) {
    await notifyAiFailure(event, '', 'OPENAI_API_KEY is not configured.', { stage: 'config' });
    return json(500, { error: 'OPENAI_API_KEY is not configured.' });
  }

  let rawText = '';
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    rawText = typeof body.rawText === 'string' ? body.rawText.trim() : '';
  } catch (e) {
    return json(400, { error: 'Invalid JSON body.' });
  }

  if (rawText.length < 20) {
    return json(400, { error: 'rawText must contain at least 20 characters.' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_CONFIG.timeoutMs);

  try {
    const response = await fetch(AI_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        temperature: AI_CONFIG.temperature,
        input: [
          { role: 'system', content: 'Ты помощник редактора по анализу брифа.' },
          { role: 'user', content: buildAiPrompt(rawText) }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const details = await response.text();
      await notifyAiFailure(event, rawText, `OpenAI request failed with status ${response.status}.`, {
        stage: 'openai_response',
        status: response.status,
        note: details
      });
      return json(response.status, { error: details || `OpenAI request failed with status ${response.status}.` });
    }

    const payload = await response.json();
    const rawResponseText = readResponseText(payload);
    if (!rawResponseText) {
      await notifyAiFailure(event, rawText, 'Empty response from model.', { stage: 'model_response' });
      return json(502, { error: 'Empty response from model.' });
    }

    const jsonString = extractJsonStringFromText(rawResponseText);
    if (!jsonString) {
      await notifyAiFailure(event, rawText, 'Model response does not contain valid JSON.', { stage: 'model_json' });
      return json(502, { error: 'Model response does not contain valid JSON.' });
    }

    const parsed = JSON.parse(jsonString);
    return json(200, normalizeAiPayload(parsed));
  } catch (error) {
    const msg = error && error.name === 'AbortError'
      ? 'OpenAI request timed out.'
      : (error && error.message ? error.message : 'Unknown server error.');
    await notifyAiFailure(event, rawText, msg, {
      stage: error && error.name === 'AbortError' ? 'timeout' : 'exception'
    });
    return json(502, { error: msg });
  } finally {
    clearTimeout(timer);
  }
};
