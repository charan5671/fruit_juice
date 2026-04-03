-- ==========================================
-- QUICK FIX: Run this in your Supabase SQL Editor
-- This adds the "procurement" role to the database constraints
-- and updates RLS policies so procurement agents can write POs!
-- ==========================================

-- 1. Update the role constraint
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE public.employees ADD CONSTRAINT employees_role_check CHECK (role IN ('admin','manager','seller','staff','procurement'));

-- 2. Update Suppliers RLS
DROP POLICY IF EXISTS "suppliers_write" ON suppliers;
CREATE POLICY "suppliers_write" ON suppliers FOR ALL USING (get_my_role() IN ('admin','manager','procurement')) WITH CHECK (get_my_role() IN ('admin','manager','procurement'));

-- 3. Update Ingredients RLS
DROP POLICY IF EXISTS "ingredients_write" ON ingredients;
CREATE POLICY "ingredients_write" ON ingredients FOR ALL USING (get_my_role() IN ('admin','manager','seller','procurement')) WITH CHECK (get_my_role() IN ('admin','manager','seller','procurement'));

-- 4. Update Purchase Orders RLS
DROP POLICY IF EXISTS "po_write" ON purchase_orders;
CREATE POLICY "po_write" ON purchase_orders FOR ALL USING (get_my_role() IN ('admin','manager','procurement')) WITH CHECK (get_my_role() IN ('admin','manager','procurement'));
