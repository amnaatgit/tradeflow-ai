-- add payments.method column
ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS method text;

-- keep RLS and policies unchanged
