#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { sendTelegramMessage } = require('../netlify/functions/lib/telegram-notifier');

const TELEGRAM_API_TIMEOUT_MS = 8000;

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;

  const text = fs.readFileSync(filePath, 'utf8');
  text.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

function usage() {
  console.log([
    'Usage:',
    '  node scripts/telegram-bot.js chat-id',
    '  node scripts/telegram-bot.js test',
    '',
    'Required env:',
    '  TELEGRAM_BOT_TOKEN',
    '  TELEGRAM_CHAT_ID for the test command'
  ].join('\n'));
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

async function telegramApi(token, method, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TELEGRAM_API_TIMEOUT_MS);

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.description || `Telegram API returned ${response.status}`);
    }
    return payload.result;
  } finally {
    clearTimeout(timer);
  }
}

function readChatFromUpdate(update) {
  const message = update.message || update.edited_message || update.channel_post || update.edited_channel_post;
  if (!message || !message.chat) return null;

  return {
    id: message.chat.id,
    type: message.chat.type,
    title: message.chat.title || [message.chat.first_name, message.chat.last_name].filter(Boolean).join(' '),
    username: message.chat.username || '',
    preview: typeof message.text === 'string' ? message.text : ''
  };
}

async function printChatIds() {
  const token = requireEnv('TELEGRAM_BOT_TOKEN');
  const updates = await telegramApi(token, 'getUpdates');
  const chats = new Map();

  updates.forEach(update => {
    const chat = readChatFromUpdate(update);
    if (chat) chats.set(String(chat.id), chat);
  });

  if (!chats.size) {
    console.log('chat_id не найден. Напишите любое сообщение боту в Telegram и запустите команду ещё раз.');
    process.exitCode = 1;
    return;
  }

  console.log('Найденные chat_id:');
  chats.forEach(chat => {
    const label = [chat.title, chat.username ? `@${chat.username}` : '', chat.type].filter(Boolean).join(' / ');
    console.log(`- ${chat.id}${label ? ` (${label})` : ''}`);
  });
}

async function sendTestMessage() {
  requireEnv('TELEGRAM_BOT_TOKEN');
  requireEnv('TELEGRAM_CHAT_ID');

  await sendTelegramMessage('Бот на связи. Тестовое уведомление от Ассистента для редактора.');
  console.log('Тестовое сообщение отправлено.');
}

async function main() {
  loadDotEnv(path.join(process.cwd(), '.env'));

  const command = process.argv[2];
  if (command === 'chat-id') {
    await printChatIds();
    return;
  }
  if (command === 'test') {
    await sendTestMessage();
    return;
  }

  usage();
  process.exitCode = 1;
}

main().catch(error => {
  console.error(error && error.message ? error.message : error);
  process.exitCode = 1;
});
