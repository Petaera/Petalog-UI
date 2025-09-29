-- Create missing payroll tables
-- This script creates the tables that the dashboard is trying to query

-- 1. Create payroll.expenses table
CREATE TABLE IF NOT EXISTS payroll.expenses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id uuid NOT NULL REFERENCES payroll.locations(id),
    date date NOT NULL,
    description text NOT NULL,
    amount numeric(10,2) NOT NULL,
    category text,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

-- 2. Create payroll.income table (if needed)
CREATE TABLE IF NOT EXISTS payroll.income (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id uuid NOT NULL REFERENCES payroll.locations(id),
    date date NOT NULL,
    description text NOT NULL,
    amount numeric(10,2) NOT NULL,
    category text,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

-- 3. Enable RLS on the tables
ALTER TABLE payroll.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll.income ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for expenses
CREATE POLICY "Branch users can view expenses" ON payroll.expenses
    FOR SELECT USING (
        branch_id IN (
            SELECT id FROM payroll.locations 
            WHERE location_owner_id = auth.uid() 
            OR id IN (
                SELECT assigned_location FROM public.users 
                WHERE id = auth.uid() AND role = 'manager'
            )
        )
    );

CREATE POLICY "Branch users can insert expenses" ON payroll.expenses
    FOR INSERT WITH CHECK (
        branch_id IN (
            SELECT id FROM payroll.locations 
            WHERE location_owner_id = auth.uid() 
            OR id IN (
                SELECT assigned_location FROM public.users 
                WHERE id = auth.uid() AND role = 'manager'
            )
        )
    );

CREATE POLICY "Branch users can update expenses" ON payroll.expenses
    FOR UPDATE USING (
        branch_id IN (
            SELECT id FROM payroll.locations 
            WHERE location_owner_id = auth.uid() 
            OR id IN (
                SELECT assigned_location FROM public.users 
                WHERE id = auth.uid() AND role = 'manager'
            )
        )
    );

CREATE POLICY "Branch users can delete expenses" ON payroll.expenses
    FOR DELETE USING (
        branch_id IN (
            SELECT id FROM payroll.locations 
            WHERE location_owner_id = auth.uid() 
            OR id IN (
                SELECT assigned_location FROM public.users 
                WHERE id = auth.uid() AND role = 'manager'
            )
        )
    );

-- 5. Create RLS policies for income
CREATE POLICY "Branch users can view income" ON payroll.income
    FOR SELECT USING (
        branch_id IN (
            SELECT id FROM payroll.locations 
            WHERE location_owner_id = auth.uid() 
            OR id IN (
                SELECT assigned_location FROM public.users 
                WHERE id = auth.uid() AND role = 'manager'
            )
        )
    );

CREATE POLICY "Branch users can insert income" ON payroll.income
    FOR INSERT WITH CHECK (
        branch_id IN (
            SELECT id FROM payroll.locations 
            WHERE location_owner_id = auth.uid() 
            OR id IN (
                SELECT assigned_location FROM public.users 
                WHERE id = auth.uid() AND role = 'manager'
            )
        )
    );

CREATE POLICY "Branch users can update income" ON payroll.income
    FOR UPDATE USING (
        branch_id IN (
            SELECT id FROM payroll.locations 
            WHERE location_owner_id = auth.uid() 
            OR id IN (
                SELECT assigned_location FROM public.users 
                WHERE id = auth.uid() AND role = 'manager'
            )
        )
    );

CREATE POLICY "Branch users can delete income" ON payroll.income
    FOR DELETE USING (
        branch_id IN (
            SELECT id FROM payroll.locations 
            WHERE location_owner_id = auth.uid() 
            OR id IN (
                SELECT assigned_location FROM public.users 
                WHERE id = auth.uid() AND role = 'manager'
            )
        )
    );

-- 6. Grant permissions to authenticated users
GRANT ALL ON payroll.expenses TO authenticated;
GRANT ALL ON payroll.income TO authenticated;

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_branch_date ON payroll.expenses(branch_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON payroll.expenses(date);
CREATE INDEX IF NOT EXISTS idx_income_branch_date ON payroll.income(branch_id, date);
CREATE INDEX IF NOT EXISTS idx_income_date ON payroll.income(date);
