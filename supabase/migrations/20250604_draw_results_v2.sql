-- Historical draw warehouse (v2)
-- Run in Supabase SQL Editor. Legacy `draws` / `number_stats` tables are unchanged.

CREATE TABLE IF NOT EXISTS draw_results_v2 (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  draw_date date NOT NULL,
  draw_no varchar(20),
  operator varchar(50) NOT NULL,
  first_prize varchar(10),
  second_prize varchar(10),
  third_prize varchar(10),
  special_numbers text[],
  consolation_numbers text[],
  extra_data jsonb,
  source varchar(50),
  created_at timestamptz DEFAULT now(),
  UNIQUE (draw_date, operator)
);

CREATE INDEX IF NOT EXISTS idx_draw_results_v2_date ON draw_results_v2 (draw_date DESC);
CREATE INDEX IF NOT EXISTS idx_draw_results_v2_operator ON draw_results_v2 (operator);

-- Per-operator number stats (new schema; legacy number_stats uses number-only PK)
CREATE TABLE IF NOT EXISTS number_stats_v2 (
  number varchar(4) NOT NULL,
  operator varchar(50) NOT NULL,
  total_appearances int DEFAULT 0,
  first_prize_count int DEFAULT 0,
  second_prize_count int DEFAULT 0,
  third_prize_count int DEFAULT 0,
  special_count int DEFAULT 0,
  consolation_count int DEFAULT 0,
  last_seen_date date,
  last_prize_type varchar(20),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (number, operator)
);

CREATE INDEX IF NOT EXISTS idx_number_stats_v2_operator ON number_stats_v2 (operator);
CREATE INDEX IF NOT EXISTS idx_number_stats_v2_last_seen ON number_stats_v2 (last_seen_date DESC);

ALTER TABLE draw_results_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE number_stats_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read draw_results_v2"
  ON draw_results_v2 FOR SELECT USING (true);

CREATE POLICY "Public read number_stats_v2"
  ON number_stats_v2 FOR SELECT USING (true);
