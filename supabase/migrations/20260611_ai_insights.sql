-- ⚠️ 含 DROP TABLE,仅用于初始建表,严禁在有数据的生产库重跑
DROP TABLE IF EXISTS ai_insights;
CREATE TABLE ai_insights (
  number varchar(4) NOT NULL,
  insight_date date NOT NULL,
  lang varchar(5) NOT NULL,
  scope varchar(120) NOT NULL DEFAULT 'all',
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (number, insight_date, lang, scope)
);
