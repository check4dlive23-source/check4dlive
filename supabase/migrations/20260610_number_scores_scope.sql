DROP TABLE IF EXISTS number_scores;

CREATE TABLE number_scores (
  number varchar(4) NOT NULL,
  scope varchar(120) NOT NULL DEFAULT 'all',
  total_hits int NOT NULL DEFAULT 0,
  hits_30d int NOT NULL DEFAULT 0,
  hits_90d int NOT NULL DEFAULT 0,
  hits_365d int NOT NULL DEFAULT 0,
  first_seen_date date,
  last_seen_date date,
  avg_gap_days numeric,
  max_gap_days int,
  current_gap_days int,
  freq_score int NOT NULL DEFAULT 0,
  cycle_score int NOT NULL DEFAULT 0,
  momentum_score int NOT NULL DEFAULT 0,
  mirror_score int NOT NULL DEFAULT 0,
  overall_score int NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (number, scope)
);

CREATE INDEX IF NOT EXISTS idx_number_scores_scope_overall
  ON number_scores (scope, overall_score DESC);
