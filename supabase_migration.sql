-- =============================================================
-- Fresh Juice Chain — FIXED Migration v3 (Run in SQL Editor)
-- Drops ALL existing objects cleanly, fixes registration bug
-- =============================================================

-- ─── CLEANUP ────────────────────────────────────────────────
DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS get_my_role() CASCADE;
DROP FUNCTION IF EXISTS get_my_employee_id() CASCADE;
DROP FUNCTION IF EXISTS get_my_outlet_id() CASCADE;
DROP FUNCTION IF EXISTS register_employee(UUID, TEXT, TEXT, TEXT) CASCADE;

DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS payroll CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS outlets CASCADE;

-- ─── 1. OUTLETS ─────────────────────────────────────────────
CREATE TABLE outlets (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 2. SUPPLIERS ───────────────────────────────────────────
CREATE TABLE suppliers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  rating NUMERIC NOT NULL DEFAULT 0,
  items_supplied JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 3. EMPLOYEES (auth-linked, pending approval) ──────────
CREATE TABLE employees (
  id BIGSERIAL PRIMARY KEY,
  auth_uid UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','manager','seller','staff')),
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  outlet_id BIGINT REFERENCES outlets(id) ON DELETE SET NULL,
  salary NUMERIC NOT NULL DEFAULT 0,
  join_date TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','on-leave','terminated')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 4. INGREDIENTS ─────────────────────────────────────────
CREATE TABLE ingredients (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  stock NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'kg',
  threshold NUMERIC NOT NULL DEFAULT 10,
  outlet_id BIGINT NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  last_updated TIMESTAMPTZ DEFAULT now()
);

-- ─── 5. RECIPES (linked to outlet) ─────────────────────────
CREATE TABLE recipes (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  icon TEXT NOT NULL DEFAULT '🍹',
  category TEXT NOT NULL DEFAULT 'Classic',
  ingredients JSONB NOT NULL DEFAULT '[]',
  outlet_id BIGINT REFERENCES outlets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 6. ORDERS (linked to outlet + seller) ──────────────────
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  items JSONB NOT NULL DEFAULT '[]',
  total NUMERIC NOT NULL DEFAULT 0,
  outlet_id BIGINT REFERENCES outlets(id) ON DELETE SET NULL,
  seller_id BIGINT REFERENCES employees(id) ON DELETE SET NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash','card','upi')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 7. PURCHASE ORDERS (linked to supplier + outlet) ──────
CREATE TABLE purchase_orders (
  id BIGSERIAL PRIMARY KEY,
  supplier_id BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  outlet_id BIGINT REFERENCES outlets(id) ON DELETE SET NULL,
  items JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','confirmed','in-transit','delivered','cancelled')),
  total_cost NUMERIC NOT NULL DEFAULT 0,
  eta TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  approved_by BIGINT REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 8. ATTENDANCE ──────────────────────────────────────────
CREATE TABLE attendance (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  check_in TEXT,
  check_out TEXT,
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  status TEXT NOT NULL DEFAULT 'absent' CHECK (status IN ('present','late','absent','half-day')),
  hours_worked NUMERIC DEFAULT 0,
  UNIQUE(employee_id, date)
);

-- ─── 9. PAYROLL ─────────────────────────────────────────────
CREATE TABLE payroll (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  total_days INT DEFAULT 30,
  days_present INT DEFAULT 0,
  hours_worked NUMERIC DEFAULT 0,
  base_pay NUMERIC DEFAULT 0,
  overtime NUMERIC DEFAULT 0,
  deductions NUMERIC DEFAULT 0,
  net_pay NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','paid')),
  UNIQUE(employee_id, month)
);

-- ─── 10. NOTIFICATIONS (linked to employee + outlet) ───────
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('alert','info','success','warning')),
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  read BOOLEAN DEFAULT false,
  module TEXT DEFAULT '',
  target_role TEXT DEFAULT NULL,
  target_employee_id BIGINT REFERENCES employees(id) ON DELETE CASCADE,
  outlet_id BIGINT REFERENCES outlets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 11. AUDIT LOG ──────────────────────────────────────────
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  user_id BIGINT REFERENCES employees(id) ON DELETE SET NULL,
  user_name TEXT DEFAULT '',
  module TEXT DEFAULT '',
  details TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- HELPER FUNCTIONS
-- =============================================================
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM employees WHERE auth_uid = auth.uid() AND status = 'active'
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_employee_id()
RETURNS BIGINT AS $$
  SELECT id FROM employees WHERE auth_uid = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── REGISTRATION FUNCTION (bypasses RLS for self-insert) ──
CREATE OR REPLACE FUNCTION register_employee(
  p_auth_uid UUID,
  p_name TEXT,
  p_email TEXT,
  p_role TEXT DEFAULT 'staff'
) RETURNS JSONB AS $$
DECLARE
  new_id BIGINT;
  v_status TEXT DEFAULT 'pending';
  v_role TEXT;
BEGIN
  v_role := p_role;
  
  -- AUTO-BOOTSTRAP ENTERPRISE ROLES
  IF p_email = 'admin@freshjuice.in' THEN
    v_status := 'active'; v_role := 'admin';
  ELSIF p_email = 'manager@freshjuice.in' THEN
    v_status := 'active'; v_role := 'manager';
  ELSIF p_email = 'seller@freshjuice.in' THEN
    v_status := 'active'; v_role := 'seller';
  ELSIF p_email = 'staff@freshjuice.in' THEN
    v_status := 'active'; v_role := 'staff';
  END IF;

  INSERT INTO employees (auth_uid, name, email, role, status, join_date, outlet_id)
  VALUES (p_auth_uid, p_name, p_email, v_role, v_status, to_char(now(), 'YYYY-MM-DD'), 1)
  RETURNING id INTO new_id;

  -- Notify system about registration
  INSERT INTO notifications (type, title, message, module, target_role)
  VALUES ('info', 'System Setup', p_name || ' (' || v_role || ') provisioned as ' || v_status, 'admin', 'admin');

  RETURN jsonb_build_object('id', new_id, 'status', v_status, 'role', v_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── ATOMIC ORDER FUNCTION (handles stock deduction) ────────
CREATE OR REPLACE FUNCTION create_order(
  p_items JSONB,
  p_total NUMERIC,
  p_payment_method TEXT,
  p_outlet_id BIGINT,
  p_seller_id BIGINT
) RETURNS BIGINT AS $$
DECLARE
  new_order_id BIGINT;
  item_record RECORD;
  ing_record RECORD;
BEGIN
  -- 1. Create the order
  INSERT INTO orders (items, total, outlet_id, seller_id, payment_method)
  VALUES (p_items, p_total, p_outlet_id, p_seller_id, p_payment_method)
  RETURNING id INTO new_order_id;

  -- 2. Deduct ingredients
  -- Expects p_items to have structure: [{"recipeId":1, "quantity":2, "ingredients":[{"ingredientId":1, "amount":0.5}]}]
  FOR item_record IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    FOR ing_record IN SELECT * FROM jsonb_array_elements(item_record.value->'ingredients') LOOP
      UPDATE ingredients
      SET stock = stock - ( (ing_record.value->>'amount')::NUMERIC * (item_record.value->>'quantity')::NUMERIC ),
          last_updated = now()
      WHERE id = (ing_record.value->>'ingredientId')::BIGINT;
      
      -- Add low stock notification if needed
      INSERT INTO notifications (type, title, message, module, outlet_id)
      SELECT 'warning', 'Low Stock Alert', name || ' is at ' || stock || unit, 'inventory', outlet_id
      FROM ingredients
      WHERE id = (ing_record.value->>'ingredientId')::BIGINT AND stock <= threshold;
    END LOOP;
  END LOOP;

  -- 3. Log the audit
  INSERT INTO audit_log (action, user_id, module, details)
  VALUES ('SALE_COMPLETED', p_seller_id, 'pos', 'Order ID: ' || new_order_id || ', Amount: ' || p_total);

  RETURN new_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ── OUTLETS ─────────────────────────────────────────────────
CREATE POLICY "outlets_select" ON outlets FOR SELECT USING (true);
CREATE POLICY "outlets_admin" ON outlets FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');

-- ── EMPLOYEES: Everyone reads, admin manages, self can read own ──
CREATE POLICY "employees_select" ON employees FOR SELECT USING (true);
CREATE POLICY "employees_admin_insert" ON employees FOR INSERT WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "employees_admin_update" ON employees FOR UPDATE USING (get_my_role() = 'admin');
CREATE POLICY "employees_self_update" ON employees FOR UPDATE USING (auth_uid = auth.uid()) WITH CHECK (auth_uid = auth.uid());

-- ── SUPPLIERS ───────────────────────────────────────────────
CREATE POLICY "suppliers_select" ON suppliers FOR SELECT USING (true);
CREATE POLICY "suppliers_write" ON suppliers FOR ALL USING (get_my_role() IN ('admin','manager')) WITH CHECK (get_my_role() IN ('admin','manager'));

-- ── INGREDIENTS ─────────────────────────────────────────────
CREATE POLICY "ingredients_select" ON ingredients FOR SELECT USING (true);
CREATE POLICY "ingredients_write" ON ingredients FOR ALL USING (get_my_role() IN ('admin','manager','seller')) WITH CHECK (get_my_role() IN ('admin','manager','seller'));

-- ── RECIPES ─────────────────────────────────────────────────
CREATE POLICY "recipes_select" ON recipes FOR SELECT USING (true);
CREATE POLICY "recipes_admin" ON recipes FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');

-- ── ORDERS: Seller+Manager+Admin create/read ────────────────
CREATE POLICY "orders_select" ON orders FOR SELECT USING (true);
CREATE POLICY "orders_insert" ON orders FOR INSERT WITH CHECK (get_my_role() IN ('admin','manager','seller'));

-- ── PURCHASE ORDERS ─────────────────────────────────────────
CREATE POLICY "po_select" ON purchase_orders FOR SELECT USING (true);
CREATE POLICY "po_write" ON purchase_orders FOR ALL USING (get_my_role() IN ('admin','manager')) WITH CHECK (get_my_role() IN ('admin','manager'));

-- ── ATTENDANCE: Self or admin/manager ───────────────────────
CREATE POLICY "attendance_select" ON attendance FOR SELECT USING (
  employee_id = get_my_employee_id() OR get_my_role() IN ('admin','manager')
);
CREATE POLICY "attendance_insert" ON attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "attendance_update" ON attendance FOR UPDATE USING (
  employee_id = get_my_employee_id() OR get_my_role() IN ('admin','manager')
);

-- ── PAYROLL: Own or admin ───────────────────────────────────
CREATE POLICY "payroll_select" ON payroll FOR SELECT USING (
  employee_id = get_my_employee_id() OR get_my_role() IN ('admin','manager')
);
CREATE POLICY "payroll_write" ON payroll FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');

-- ── NOTIFICATIONS: Everyone ─────────────────────────────────
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (true);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (true);

-- ── AUDIT LOG: Admin reads, system writes ───────────────────
CREATE POLICY "audit_select" ON audit_log FOR SELECT USING (get_my_role() IN ('admin','manager'));
CREATE POLICY "audit_insert" ON audit_log FOR INSERT WITH CHECK (true);

-- =============================================================
-- ENABLE REALTIME
-- =============================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE outlets;
  ALTER PUBLICATION supabase_realtime ADD TABLE employees;
  ALTER PUBLICATION supabase_realtime ADD TABLE suppliers;
  ALTER PUBLICATION supabase_realtime ADD TABLE ingredients;
  ALTER PUBLICATION supabase_realtime ADD TABLE recipes;
  ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  ALTER PUBLICATION supabase_realtime ADD TABLE purchase_orders;
  ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
  ALTER PUBLICATION supabase_realtime ADD TABLE payroll;
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  ALTER PUBLICATION supabase_realtime ADD TABLE audit_log;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================
-- INDEXES for performance
-- =============================================================
CREATE INDEX idx_employees_auth ON employees(auth_uid);
CREATE INDEX idx_employees_outlet ON employees(outlet_id);
CREATE INDEX idx_ingredients_outlet ON ingredients(outlet_id);
CREATE INDEX idx_orders_outlet ON orders(outlet_id);
CREATE INDEX idx_orders_seller ON orders(seller_id);
CREATE INDEX idx_attendance_emp ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_payroll_emp ON payroll(employee_id);
CREATE INDEX idx_notifications_role ON notifications(target_role);
CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_outlet ON purchase_orders(outlet_id);

-- =============================================================
-- SEED DATA
-- =============================================================
INSERT INTO outlets (name, address, phone, status) VALUES
  ('FreshJuice - Koramangala', '80 Feet Rd, Koramangala, Bangalore', '+91 9876543210', 'active'),
  ('FreshJuice - Indiranagar', '100 Feet Rd, Indiranagar, Bangalore', '+91 9876543211', 'active'),
  ('FreshJuice - HSR Layout', '27th Main Rd, HSR Layout, Bangalore', '+91 9876543212', 'active');

INSERT INTO ingredients (name, stock, unit, threshold, outlet_id) VALUES
  ('Orange', 150, 'kg', 20, 1), ('Apple', 80, 'kg', 15, 1),
  ('Watermelon', 45, 'pcs', 10, 1), ('Ginger', 5, 'kg', 2, 1),
  ('Mango', 60, 'kg', 15, 1), ('Pineapple', 30, 'pcs', 8, 1),
  ('Lemon', 100, 'pcs', 20, 1), ('Sugar', 25, 'kg', 5, 1);

INSERT INTO recipes (name, price, icon, category, ingredients, outlet_id) VALUES
  ('Orange Juice', 80, '🍊', 'Classic', '[{"ingredientId":1,"amount":0.5}]', 1),
  ('Apple Blast', 100, '🍎', 'Classic', '[{"ingredientId":2,"amount":0.4}]', 1),
  ('Watermelon Chill', 70, '🍉', 'Classic', '[{"ingredientId":3,"amount":1}]', 1),
  ('Ginger Zest', 90, '🫚', 'Special', '[{"ingredientId":4,"amount":0.05},{"ingredientId":1,"amount":0.3}]', 1),
  ('Mango Tango', 120, '🥭', 'Premium', '[{"ingredientId":5,"amount":0.4}]', 1),
  ('Pineapple Punch', 110, '🍍', 'Premium', '[{"ingredientId":6,"amount":0.5}]', 1),
  ('Citrus Mix', 130, '🍋', 'Special', '[{"ingredientId":1,"amount":0.3},{"ingredientId":7,"amount":2}]', 1),
  ('Power Green', 150, '🥬', 'Health', '[{"ingredientId":4,"amount":0.02},{"ingredientId":2,"amount":0.3}]', 1);

INSERT INTO suppliers (name, contact, email, rating, items_supplied) VALUES
  ('FreshFarms Pvt Ltd', '+91 9988776655', 'orders@freshfarms.in', 4.5, '["Orange","Apple","Mango"]'),
  ('GreenLeaf Organics', '+91 9988776656', 'supply@greenleaf.in', 4.2, '["Ginger","Lemon","Pineapple"]'),
  ('TropiFruit Co.', '+91 9988776657', 'sales@tropifruit.in', 4.8, '["Watermelon","Pineapple","Mango"]');

INSERT INTO notifications (type, title, message, read, module) VALUES
  ('warning', 'Low Stock Alert', 'Ginger stock below threshold (5kg)', false, 'inventory'),
  ('success', 'System Ready', 'Fresh Juice Chain Enterprise Platform is online', true, 'system');
