const TELEGRAM_API_TIMEOUT_MS = 4000;
const TELEGRAM_MESSAGE_LIMIT = 3900;

function hasTelegramConfig(env = process.env) {
  return Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);
}

function clip(value, limit = 500) {
  const text = String(value || '').trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1)}…`;
}

function formatDetails(details = {}) {
  return Object.entries(details)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}: ${clip(value, 700)}`)
    .join('\n');
}

function formatTelegramAlert({ title, reason, details }) {
  const lines = [
    'Ассистент для редактора: сбой',
    '',
    `Событие: ${clip(title, 140)}`,
    `Причина: ${clip(reason, 700)}`,
    `Время: ${new Date().toISOString()}`
  ];

  const detailsText = formatDetails(details);
  if (detailsText) {
    lines.push('', detailsText);
  }

  return clip(lines.join('\n'), TELEGRAM_MESSAGE_LIMIT);
}

async function sendTelegramMessage(text, env = process.env) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return { sent: false, skipped: true, reason: 'telegram env is not configured' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TELEGRAM_API_TIMEOUT_MS);

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: clip(text, TELEGRAM_MESSAGE_LIMIT),
        disable_web_page_preview: true
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(details || `Telegram API returned ${response.status}`);
    }

    return { sent: true, skipped: false };
  } finally {
    clearTimeout(timer);
  }
}

async function notifyTelegramFailure(payload, env = process.env) {
  if (!hasTelegramConfig(env)) {
    return { sent: false, skipped: true, reason: 'telegram env is not configured' };
  }

  try {
    return await sendTelegramMessage(formatTelegramAlert(payload), env);
  } catch (error) {
    console.warn('Telegram notification failed:', error && error.message ? error.message : error);
    return {
      sent: false,
      skipped: false,
      reason: error && error.message ? error.message : 'telegram notification failed'
    };
  }
}

module.exports = {
  formatTelegramAlert,
  hasTelegramConfig,
  notifyTelegramFailure,
  sendTelegramMessage
};
