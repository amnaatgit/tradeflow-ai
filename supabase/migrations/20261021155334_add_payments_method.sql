-- add payments.method column
ALTER TABLE payments ADD COLUMN IF NOT EXISTS method text;

-- no RLS changes needed; policies on payments already restrict access to the row owner
