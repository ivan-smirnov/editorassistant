const { sendTelegramMessage } = require('./lib/telegram-notifier');

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

exports.handler = async function handler() {
  const url = readMonitorUrl();
  const result = await sendTelegramMessage([
    'Мониторинг Ассистента работает.',
    `Время: ${new Date().toISOString()}`,
    url ? `URL: ${url}` : 'URL: не задан'
  ].join('\n'));

  return json(result.sent ? 200 : 500, {
    ok: result.sent,
    skipped: result.skipped,
    reason: result.reason || ''
  });
};
