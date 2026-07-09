const { notifyTelegramFailure } = require('./lib/telegram-notifier');

const MONITOR_TIMEOUT_MS = 8000;
const MONITOR_USER_AGENT = 'editorassistant-homepage-monitor/1.0';

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body)
  };
}

function readMonitorUrl(env = process.env) {
  return String(env.MONITOR_SITE_URL || env.URL || '').trim();
}

async function sendFailureAlert({ url, stage, status, latencyMs, error }) {
  await notifyTelegramFailure({
    title: 'Production-сайт не отвечает как ожидается',
    reason: error || `Homepage returned HTTP ${status}`,
    details: {
      function: 'monitor-homepage',
      stage,
      url,
      status,
      latencyMs
    }
  });
}

async function checkHomepage(env = process.env, fetchImpl = fetch) {
  const url = readMonitorUrl(env);
  if (!url) {
    await sendFailureAlert({
      url: '',
      stage: 'config',
      error: 'MONITOR_SITE_URL is not configured.'
    });
    return { ok: false, stage: 'config', error: 'MONITOR_SITE_URL is not configured.' };
  }

  const controller = new AbortController();
  const startedAt = Date.now();
  const timer = setTimeout(() => controller.abort(), MONITOR_TIMEOUT_MS);

  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': MONITOR_USER_AGENT },
      signal: controller.signal
    });
    const latencyMs = Date.now() - startedAt;

    if (response.status !== 200) {
      await sendFailureAlert({
        url,
        stage: 'http_status',
        status: response.status,
        latencyMs
      });
      return { ok: false, stage: 'http_status', url, status: response.status, latencyMs };
    }

    return { ok: true, stage: 'ok', url, status: response.status, latencyMs };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const message = error && error.name === 'AbortError'
      ? `Homepage request timed out after ${MONITOR_TIMEOUT_MS} ms.`
      : (error && error.message ? error.message : 'Homepage request failed.');

    await sendFailureAlert({
      url,
      stage: error && error.name === 'AbortError' ? 'timeout' : 'fetch_error',
      latencyMs,
      error: message
    });

    return {
      ok: false,
      stage: error && error.name === 'AbortError' ? 'timeout' : 'fetch_error',
      url,
      latencyMs,
      error: message
    };
  } finally {
    clearTimeout(timer);
  }
}

exports.handler = async function handler() {
  const result = await checkHomepage();
  return json(result.ok ? 200 : 502, result);
};

exports.checkHomepage = checkHomepage;
