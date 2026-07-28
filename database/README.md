# Локальная база данных

Проект использует локальный PostgreSQL 18 из Postgres.app. База нужна только
для локальной разработки. Веб-приложение читает тестовые карточки и сохраняет
новую порцию ответов через Netlify Function; `localStorage` остаётся fallback
для состояния интерфейса.

## Состав

```text
database/
├── schema.sql  # типы, таблицы, связи, индексы и триггеры
├── seed.sql    # полностью вымышленные данные для трёх сценариев
└── README.md   # воспроизводимый локальный запуск
```

```text
[Assistant.html]
      |
      | GET/POST /.netlify/functions/task-cards
      v
[Netlify Function]
      |
      | DATABASE_URL из .env.database.local
      v
[PostgreSQL: editor_assistant_local]
```

## Структура данных

```text
[users]
   1
   |
   N
[task_cards]
   |-- 0..1 [analysis_results]
   |             |-- N [analysis_blocks]
   |             `-- N [clarification_questions]
   |                         |
   |                         `-- 0..N [client_answers]
   |
   |-- N [client_answers]
   `-- 0..1 [understanding_drafts]
                    |
                    `-- 0..1 [analysis_results]
```

`client_answers.task_card_id` хранит ответы из общего поля текущего
интерфейса. Необязательный `question_id` позволяет позже связать ответ с
конкретным вопросом.

## Локальный запуск без Docker

Требуется Postgres.app в `/Applications`. Команды ниже используют встроенные
бинарные файлы напрямую, поэтому менять `PATH` не нужно.

```bash
PG_BIN="/Applications/Postgres.app/Contents/Versions/latest/bin"
PG_DATA="/Users/ivansmirnov/Library/Application Support/Postgres/var-18"

"$PG_BIN/initdb" -D "$PG_DATA"
"$PG_BIN/pg_ctl" -D "$PG_DATA" -l "$PG_DATA/server.log" start
"$PG_BIN/createdb" editor_assistant_local
"$PG_BIN/psql" -v ON_ERROR_STOP=1 -d editor_assistant_local -f database/schema.sql
"$PG_BIN/psql" -v ON_ERROR_STOP=1 -d editor_assistant_local -f database/seed.sql
```

После подготовки базы зависимости проекта устанавливаются один раз:

```bash
npm install
```

Локальный проект запускается с настройкой из игнорируемого файла:

```bash
set -a
source .env.database.local
set +a
npm run dev
```

Проверка:

```bash
"$PG_BIN/psql" -d editor_assistant_local -c '\dt'
"$PG_BIN/psql" -d editor_assistant_local -c \
  'SELECT (SELECT count(*) FROM task_cards) AS cards,
          (SELECT count(*) FROM analysis_blocks) AS blocks,
          (SELECT count(*) FROM client_answers) AS answers;'
```

Остановка:

```bash
"$PG_BIN/pg_ctl" -D "$PG_DATA" stop
```

Для полного пересоздания тестовой базы сначала удаляют только базу
`editor_assistant_local`, затем повторяют команды `createdb`, `schema.sql` и
`seed.sql`. Это удаляет все данные внутри этой локальной тестовой базы.
