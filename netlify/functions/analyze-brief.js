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
    '2) questions: каждый вопрос должен быть конкретным и выводиться из contradictions.',
    '3) приоритет must только для блокеров старта работы, остальное should.',
    '4) categorySignals: оцени 6 категорий по статусам green/yellow/red.',
    '5) shortTaskUnderstanding: 4-6 коротких пунктов для редактора.',
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

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed. Use POST.' });
  }

  if (!process.env.OPENAI_API_KEY) {
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
      return json(response.status, { error: details || `OpenAI request failed with status ${response.status}.` });
    }

    const payload = await response.json();
    const rawResponseText = readResponseText(payload);
    if (!rawResponseText) {
      return json(502, { error: 'Empty response from model.' });
    }

    const jsonString = extractJsonStringFromText(rawResponseText);
    if (!jsonString) {
      return json(502, { error: 'Model response does not contain valid JSON.' });
    }

    const parsed = JSON.parse(jsonString);
    return json(200, normalizeAiPayload(parsed));
  } catch (error) {
    const msg = error && error.name === 'AbortError'
      ? 'OpenAI request timed out.'
      : (error && error.message ? error.message : 'Unknown server error.');
    return json(502, { error: msg });
  } finally {
    clearTimeout(timer);
  }
};
