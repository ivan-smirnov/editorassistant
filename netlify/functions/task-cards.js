const { Pool } = require('pg');

let pool;

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body)
  };
}

function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL не настроен.');
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 2,
      connectionTimeoutMillis: 2000,
      idleTimeoutMillis: 5000
    });
  }

  return pool;
}

async function listCards(database) {
  const result = await database.query(`
    SELECT
      tc.id,
      tc.title,
      tc.client_request AS "clientRequest",
      tc.status,
      ar.summary,
      ar.critical_gap_count AS "criticalGapCount",
      latest_answer.answer_text AS "latestAnswer",
      tc.updated_at AS "updatedAt"
    FROM task_cards tc
    LEFT JOIN analysis_results ar ON ar.task_card_id = tc.id
    LEFT JOIN LATERAL (
      SELECT ca.answer_text
      FROM client_answers ca
      WHERE ca.task_card_id = tc.id
      ORDER BY ca.created_at DESC
      LIMIT 1
    ) latest_answer ON true
    WHERE tc.archived_at IS NULL
    ORDER BY tc.updated_at DESC
    LIMIT 10
  `);

  return result.rows;
}

async function saveAnswer(database, payload) {
  const clientRequest = typeof payload.clientRequest === 'string'
    ? payload.clientRequest.trim()
    : '';
  const answerText = typeof payload.answerText === 'string'
    ? payload.answerText.trim()
    : '';

  if (clientRequest.length < 20 || !answerText) {
    return json(400, { error: 'Нужны исходный запрос и непустой ответ клиента.' });
  }

  const client = await database.connect();
  try {
    await client.query('BEGIN');
    const cardResult = await client.query(
      `SELECT id
       FROM task_cards
       WHERE client_request = $1 AND archived_at IS NULL
       ORDER BY updated_at DESC
       LIMIT 1`,
      [clientRequest]
    );

    if (!cardResult.rowCount) {
      await client.query('ROLLBACK');
      return json(404, { error: 'Карточка с таким исходным запросом не найдена.' });
    }

    const taskCardId = cardResult.rows[0].id;
    const existingAnswer = await client.query(
      `SELECT id, created_at AS "createdAt"
       FROM client_answers
       WHERE task_card_id = $1 AND answer_text = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [taskCardId, answerText]
    );

    if (existingAnswer.rowCount) {
      await client.query('COMMIT');
      return json(200, {
        taskCardId,
        answer: existingAnswer.rows[0],
        alreadySaved: true
      });
    }

    const answerResult = await client.query(
      `INSERT INTO client_answers (task_card_id, answer_text)
       VALUES ($1, $2)
       RETURNING id, created_at AS "createdAt"`,
      [taskCardId, answerText]
    );
    await client.query(
      `UPDATE task_cards
       SET screen_state = 'analysis', updated_at = now()
       WHERE id = $1`,
      [taskCardId]
    );
    await client.query('COMMIT');

    return json(201, {
      taskCardId,
      answer: answerResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

exports.handler = async function handler(event) {
  try {
    const database = getPool();

    if (event.httpMethod === 'GET') {
      return json(200, { cards: await listCards(database) });
    }

    if (event.httpMethod === 'POST') {
      let payload;
      try {
        payload = JSON.parse(event.body || '{}');
      } catch (error) {
        return json(400, { error: 'Тело запроса должно быть валидным JSON.' });
      }
      return saveAnswer(database, payload);
    }

    return json(405, { error: 'Метод не поддерживается.' });
  } catch (error) {
    console.error('Local database request failed:', error.message);
    return json(503, { error: 'Локальная база недоступна.' });
  }
};
