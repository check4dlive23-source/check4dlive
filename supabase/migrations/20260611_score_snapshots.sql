CREATE TABLE IF NOT EXISTS score_snapshots (
  snapshot_date date NOT NULL,
  number varchar(4) NOT NULL,
  overall_score int NOT NULL,
  freq_score int NOT NULL DEFAULT 0,
  cycle_score int NOT NULL DEFAULT 0,
  momentum_score int NOT NULL DEFAULT 0,
  mirror_score int NOT NULL DEFAULT 0,
  PRIMARY KEY (snapshot_date, number)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_number_date
  ON score_snapshots (number, snapshot_date DESC);
