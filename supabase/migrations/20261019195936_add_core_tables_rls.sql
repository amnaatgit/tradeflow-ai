-- Create customers table and RLS policies
CREATE TABLE IF NOT EXISTS customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  created_at timestamptz default now(),
  name text not null,
  phone text,
  area text
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Users can select own customers') THEN
  CREATE POLICY "Users can select own customers" ON customers
    FOR SELECT USING (auth.uid() = user_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Users can insert own customers') THEN
  CREATE POLICY "Users can insert own customers" ON customers
    FOR INSERT WITH CHECK (auth.uid() = user_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Users can update own customers') THEN
  CREATE POLICY "Users can update own customers" ON customers
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Users can delete own customers') THEN
  CREATE POLICY "Users can delete own customers" ON customers
    FOR DELETE USING (auth.uid() = user_id);
END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_user_phone ON customers(user_id, phone) WHERE phone IS NOT NULL;

-- Create orders table and RLS policies
CREATE TABLE IF NOT EXISTS orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  created_at timestamptz default now(),
  customer_id uuid references customers(id) ON DELETE SET NULL,
  raw_text text,
  address text,
  area text,
  advance numeric default 0,
  status text default 'pending' CHECK (status IN ('pending', 'delivered', 'cancelled')),
  ai_extraction jsonb
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can select own orders') THEN
  CREATE POLICY "Users can select own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can insert own orders') THEN
  CREATE POLICY "Users can insert own orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can update own orders') THEN
  CREATE POLICY "Users can update own orders" ON orders
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can delete own orders') THEN
  CREATE POLICY "Users can delete own orders" ON orders
    FOR DELETE USING (auth.uid() = user_id);
END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Create order_items table and RLS policies
CREATE TABLE IF NOT EXISTS order_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  created_at timestamptz default now(),
  order_id uuid references orders(id) ON DELETE CASCADE,
  name text not null,
  qty int not null CHECK (qty > 0),
  unit_price numeric not null CHECK (unit_price >= 0)
);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Users can select own order_items') THEN
  CREATE POLICY "Users can select own order_items" ON order_items
    FOR SELECT USING (auth.uid() = user_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Users can insert own order_items') THEN
  CREATE POLICY "Users can insert own order_items" ON order_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Users can update own order_items') THEN
  CREATE POLICY "Users can update own order_items" ON order_items
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Users can delete own order_items') THEN
  CREATE POLICY "Users can delete own order_items" ON order_items
    FOR DELETE USING (auth.uid() = user_id);
END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_order_items_user_id ON order_items(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Create payments table and RLS policies
CREATE TABLE IF NOT EXISTS payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  created_at timestamptz default now(),
  customer_id uuid references customers(id) ON DELETE SET NULL,
  order_id uuid null references orders(id) ON DELETE SET NULL,
  amount numeric not null CHECK (amount > 0)
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Users can select own payments') THEN
  CREATE POLICY "Users can select own payments" ON payments
    FOR SELECT USING (auth.uid() = user_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Users can insert own payments') THEN
  CREATE POLICY "Users can insert own payments" ON payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Users can update own payments') THEN
  CREATE POLICY "Users can update own payments" ON payments
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Users can delete own payments') THEN
  CREATE POLICY "Users can delete own payments" ON payments
    FOR DELETE USING (auth.uid() = user_id);
END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
