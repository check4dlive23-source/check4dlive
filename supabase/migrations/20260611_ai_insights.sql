CREATE TABLE IF NOT EXISTS ai_insights (
  number varchar(4) NOT NULL,
  insight_date date NOT NULL,
  lang varchar(5) NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (number, insight_date, lang)
);
