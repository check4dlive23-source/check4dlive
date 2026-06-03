-- Check4D Live — Supabase schema
-- Run this in Supabase SQL Editor after creating your project

-- ─── Tables ───────────────────────────────────────────────────────────────

-- 1. draws: every draw result
CREATE TABLE IF NOT EXISTS draws (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  draw_no varchar(20),
  operator varchar(20) NOT NULL,
  region varchar(10) NOT NULL,
  first_prize varchar(10),
  second_prize varchar(10),
  third_prize varchar(10),
  special_numbers jsonb,
  consolation_numbers jsonb,
  jackpot1_amount numeric,
  jackpot2_amount numeric,
  zodiac varchar(20),
  extra_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- 2. number_stats: aggregated per 4D number (0000-9999)
CREATE TABLE IF NOT EXISTS number_stats (
  number varchar(4) PRIMARY KEY,
  total_hits integer DEFAULT 0,
  first_prize_hits integer DEFAULT 0,
  second_prize_hits integer DEFAULT 0,
  third_prize_hits integer DEFAULT 0,
  special_hits integer DEFAULT 0,
  consolation_hits integer DEFAULT 0,
  last_seen_date date,
  last_seen_operator varchar(20),
  last_seen_position varchar(20),
  avg_gap_days numeric,
  max_gap_days integer,
  current_gap_days integer,
  heat_score numeric,
  updated_at timestamptz DEFAULT now()
);

-- 3. draw_history: every number appearance record
CREATE TABLE IF NOT EXISTS draw_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  number varchar(4) NOT NULL,
  date date NOT NULL,
  draw_id uuid REFERENCES draws(id) ON DELETE CASCADE,
  operator varchar(20) NOT NULL,
  position varchar(20) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 4. analytics_cache: pre-computed heavy queries
CREATE TABLE IF NOT EXISTS analytics_cache (
  type varchar(50) PRIMARY KEY,
  payload jsonb,
  updated_at timestamptz DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS draws_operator_date_unique ON draws(operator, date);

CREATE INDEX IF NOT EXISTS idx_draws_date ON draws(date DESC);
CREATE INDEX IF NOT EXISTS idx_draws_operator ON draws(operator);
CREATE INDEX IF NOT EXISTS idx_draws_region_date ON draws(region, date DESC);
CREATE INDEX IF NOT EXISTS idx_draw_history_number ON draw_history(number);
CREATE INDEX IF NOT EXISTS idx_draw_history_date ON draw_history(date DESC);
CREATE INDEX IF NOT EXISTS idx_draw_history_draw_id ON draw_history(draw_id);
CREATE INDEX IF NOT EXISTS idx_number_stats_heat ON number_stats(heat_score DESC);
CREATE INDEX IF NOT EXISTS idx_number_stats_last_seen ON number_stats(last_seen_date DESC);

-- ─── Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE number_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;

-- Public read (anon + authenticated)
DROP POLICY IF EXISTS "draws_public_read" ON draws;
CREATE POLICY "draws_public_read" ON draws
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "number_stats_public_read" ON number_stats;
CREATE POLICY "number_stats_public_read" ON number_stats
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "draw_history_public_read" ON draw_history;
CREATE POLICY "draw_history_public_read" ON draw_history
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "analytics_cache_public_read" ON analytics_cache;
CREATE POLICY "analytics_cache_public_read" ON analytics_cache
  FOR SELECT USING (true);

-- Service role write (bypasses RLS when using service_role key)
DROP POLICY IF EXISTS "draws_service_write" ON draws;
CREATE POLICY "draws_service_write" ON draws
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "number_stats_service_write" ON number_stats;
CREATE POLICY "number_stats_service_write" ON number_stats
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "draw_history_service_write" ON draw_history;
CREATE POLICY "draw_history_service_write" ON draw_history
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "analytics_cache_service_write" ON analytics_cache;
CREATE POLICY "analytics_cache_service_write" ON analytics_cache
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
