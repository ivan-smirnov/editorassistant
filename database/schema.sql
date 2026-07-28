BEGIN;

CREATE TYPE task_card_status AS ENUM (
  'has_critical_gaps',
  'ready_for_approval'
);

CREATE TYPE task_screen_state AS ENUM (
  'input',
  'analysis',
  'client_answers'
);

CREATE TYPE analysis_mode AS ENUM (
  'heuristic',
  'ai'
);

CREATE TYPE analysis_block_type AS ENUM (
  'context',
  'problem',
  'task',
  'solution',
  'deliverable',
  'deadlines'
);

CREATE TYPE analysis_block_status AS ENUM (
  'green',
  'yellow',
  'red'
);

CREATE TYPE question_criticality AS ENUM (
  'must',
  'should'
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_not_blank CHECK (btrim(email) <> '')
);

CREATE UNIQUE INDEX users_email_unique_ci ON users (lower(email));

CREATE TABLE task_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text,
  client_request text NOT NULL,
  status task_card_status NOT NULL DEFAULT 'has_critical_gaps',
  screen_state task_screen_state NOT NULL DEFAULT 'input',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT task_cards_client_request_not_blank
    CHECK (btrim(client_request) <> '')
);

CREATE TABLE analysis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_card_id uuid NOT NULL UNIQUE
    REFERENCES task_cards(id) ON DELETE CASCADE,
  mode analysis_mode NOT NULL,
  used_fallback boolean NOT NULL DEFAULT false,
  fallback_reason text,
  summary text,
  contradictions_jsonb jsonb NOT NULL DEFAULT '[]'::jsonb,
  critical_gap_count integer NOT NULL DEFAULT 0,
  recommended_status task_card_status NOT NULL,
  analyzed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analysis_results_contradictions_are_array
    CHECK (jsonb_typeof(contradictions_jsonb) = 'array'),
  CONSTRAINT analysis_results_gap_count_nonnegative
    CHECK (critical_gap_count >= 0),
  CONSTRAINT analysis_results_fallback_consistent
    CHECK (
      (used_fallback AND mode = 'heuristic')
      OR (NOT used_fallback AND fallback_reason IS NULL)
    )
);

CREATE TABLE analysis_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_result_id uuid NOT NULL
    REFERENCES analysis_results(id) ON DELETE CASCADE,
  block_type analysis_block_type NOT NULL,
  status analysis_block_status NOT NULL,
  extracted_text text,
  gap_explanation text,
  details_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL,
  CONSTRAINT analysis_blocks_details_are_object
    CHECK (jsonb_typeof(details_jsonb) = 'object'),
  CONSTRAINT analysis_blocks_sort_order_nonnegative
    CHECK (sort_order >= 0),
  CONSTRAINT analysis_blocks_type_unique
    UNIQUE (analysis_result_id, block_type),
  CONSTRAINT analysis_blocks_order_unique
    UNIQUE (analysis_result_id, sort_order)
);

CREATE TABLE clarification_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_result_id uuid NOT NULL
    REFERENCES analysis_results(id) ON DELETE CASCADE,
  analysis_block_id uuid
    REFERENCES analysis_blocks(id) ON DELETE SET NULL,
  criticality question_criticality NOT NULL,
  question_text text NOT NULL,
  reason text,
  related_contradiction_type text,
  sort_order integer NOT NULL,
  CONSTRAINT clarification_questions_text_not_blank
    CHECK (btrim(question_text) <> ''),
  CONSTRAINT clarification_questions_sort_order_nonnegative
    CHECK (sort_order >= 0),
  CONSTRAINT clarification_questions_order_unique
    UNIQUE (analysis_result_id, sort_order)
);

CREATE TABLE client_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_card_id uuid NOT NULL
    REFERENCES task_cards(id) ON DELETE CASCADE,
  question_id uuid
    REFERENCES clarification_questions(id) ON DELETE SET NULL,
  answer_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_answers_text_not_blank
    CHECK (btrim(answer_text) <> '')
);

CREATE TABLE understanding_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_card_id uuid NOT NULL UNIQUE
    REFERENCES task_cards(id) ON DELETE CASCADE,
  draft_text text NOT NULL,
  generated_from_analysis_id uuid
    REFERENCES analysis_results(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT understanding_drafts_text_not_blank
    CHECK (btrim(draft_text) <> '')
);

CREATE INDEX task_cards_user_updated_idx
  ON task_cards (user_id, updated_at DESC);

CREATE INDEX task_cards_active_idx
  ON task_cards (user_id, updated_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX analysis_blocks_result_idx
  ON analysis_blocks (analysis_result_id, sort_order);

CREATE INDEX clarification_questions_result_idx
  ON clarification_questions (analysis_result_id, sort_order);

CREATE INDEX client_answers_card_created_idx
  ON client_answers (task_card_id, created_at);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER task_cards_set_updated_at
BEFORE UPDATE ON task_cards
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER analysis_results_set_updated_at
BEFORE UPDATE ON analysis_results
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER client_answers_set_updated_at
BEFORE UPDATE ON client_answers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER understanding_drafts_set_updated_at
BEFORE UPDATE ON understanding_drafts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
