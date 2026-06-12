-- VYRA Daily Brief storage (run manually in Supabase SQL editor if not via CLI)
CREATE TABLE IF NOT EXISTS vyra_briefs (
  region text NOT NULL CHECK (region IN ('west', 'east', 'singapore')),
  brief_date date NOT NULL,
  lang text NOT NULL CHECK (lang IN ('zh', 'en')),
  signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  quiet boolean NOT NULL DEFAULT false,
  narrative jsonb NOT NULL DEFAULT '[]'::jsonb,
  intro text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (region, brief_date, lang)
);

CREATE INDEX IF NOT EXISTS idx_vyra_briefs_date ON vyra_briefs (brief_date DESC);

ALTER TABLE vyra_briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vyra_briefs_public_read ON vyra_briefs;
CREATE POLICY vyra_briefs_public_read ON vyra_briefs
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Writes via service role only (no insert/update policy for anon)
