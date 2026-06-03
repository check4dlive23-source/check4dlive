-- Run in Supabase SQL Editor if draws already exists without unique (operator, date)
CREATE UNIQUE INDEX IF NOT EXISTS draws_operator_date_unique ON draws(operator, date);
