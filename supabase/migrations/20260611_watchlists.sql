CREATE TABLE IF NOT EXISTS watchlists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  number varchar(4) NOT NULL CHECK (number ~ '^[0-9]{4}$'),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, number)
);

CREATE INDEX IF NOT EXISTS idx_watchlists_user
  ON watchlists (user_id, created_at DESC);

ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "watchlists_select_own" ON watchlists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "watchlists_insert_own" ON watchlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "watchlists_delete_own" ON watchlists
  FOR DELETE USING (auth.uid() = user_id);
